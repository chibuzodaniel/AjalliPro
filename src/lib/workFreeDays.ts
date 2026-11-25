import { prisma } from "./prisma";
import { formatDay } from "./week";

/** Don't enumerate more than this many days in one gap — anything beyond is reported as a count. */
const MAX_LISTED_GAP_DAYS = 366;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Every 'YYYY-MM-DD' strictly between `from` and `to`. */
function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = addDays(from, 1); d < to && out.length < MAX_LISTED_GAP_DAYS; d = addDays(d, 1)) out.push(d);
  return out;
}

export { formatDay };

export interface UnfilledDates {
  /** No record at all and not marked work-free. */
  missing: string[];
  /** Has a record, but it's still waiting for approval — not counted as filled yet. */
  pending: string[];
}

/**
 * The date to start checking from when a record lands on `before`: the last
 * approved active record before it, or — if nothing before it is approved
 * yet — the day before the earliest active record, so every unapproved
 * record in the session is checked too. null when there's nothing earlier.
 */
async function checkAnchorBefore(before: string, notThis: object): Promise<string | null> {
  const [approved, earliest] = await Promise.all([
    prisma.dailyRecord.findFirst({
      where: { archivedAt: null, status: "APPROVED", date: { lt: before }, ...notThis },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.dailyRecord.findFirst({
      where: { archivedAt: null, date: { lt: before }, ...notThis },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);
  if (approved) return approved.date;
  return earliest ? addDays(earliest.date, -1) : null;
}

async function classify(candidates: string[], notThis: object): Promise<UnfilledDates> {
  if (candidates.length === 0) return { missing: [], pending: [] };
  const [workFree, records] = await Promise.all([
    prisma.workFreeDay.findMany({ where: { date: { in: candidates } }, select: { date: true } }),
    prisma.dailyRecord.findMany({
      where: { date: { in: candidates }, archivedAt: null, ...notThis },
      select: { date: true, status: true },
    }),
  ]);
  const workFreeSet = new Set(workFree.map((w) => w.date));
  const statusByDate = new Map(records.map((r) => [r.date, r.status]));
  const missing: string[] = [];
  const pending: string[] = [];
  for (const d of candidates) {
    const status = statusByDate.get(d);
    if (status === "APPROVED") continue;
    if (status) pending.push(d);
    else if (!workFreeSet.has(d)) missing.push(d);
  }
  return { missing, pending };
}

/**
 * Days that would be left unfilled if a record were saved on `date`. A day
 * counts as filled only once it has an approved record or is marked
 * work-free. Checks the stretch back to the previous approved record, plus —
 * when an existing record is being moved off `oldDate` — the hole that move
 * would leave between its neighbours. Older gaps this change doesn't touch
 * aren't reported.
 */
export async function findUnfilledDates(
  date: string,
  opts: { excludeId?: string; oldDate?: string } = {}
): Promise<UnfilledDates> {
  const notThis = opts.excludeId ? { id: { not: opts.excludeId } } : {};
  const candidates = new Set<string>();

  const anchor = await checkAnchorBefore(date, notThis);
  if (anchor) for (const d of datesBetween(anchor, date)) candidates.add(d);

  const old = opts.oldDate;
  if (old && old !== date) {
    const [lowerAnchor, after] = await Promise.all([
      checkAnchorBefore(old, notThis),
      prisma.dailyRecord.findFirst({
        where: { archivedAt: null, date: { gt: old }, ...notThis },
        orderBy: { date: "asc" },
        select: { date: true },
      }),
    ]);
    // Neighbours of the vacated date once the record sits on `date` instead.
    const lower = [lowerAnchor ?? undefined, date < old ? date : undefined]
      .filter((d): d is string => !!d)
      .sort()
      .pop();
    const upper = [after?.date, date > old ? date : undefined].filter((d): d is string => !!d).sort()[0];
    if (lower && upper) for (const d of datesBetween(lower, upper)) candidates.add(d);
  }
  candidates.delete(date);
  return classify([...candidates].sort(), notThis);
}

export function hasUnfilled(u: UnfilledDates): boolean {
  return u.missing.length > 0 || u.pending.length > 0;
}

function listDays(days: string[]): string {
  const shown = days.slice(0, 7).map(formatDay).join(", ");
  return days.length > 7 ? `${shown} and ${days.length - 7} more` : shown;
}

export function unfilledDatesMessage(u: UnfilledDates, isAdmin: boolean): string {
  const parts: string[] = [];
  if (u.missing.length > 0) {
    parts.push(
      `${u.missing.length === 1 ? "A day has" : `${u.missing.length} days have`} no record and ${u.missing.length === 1 ? "isn't" : "aren't"} marked work-free: ${listDays(u.missing)}. ` +
        (isAdmin
          ? "Record those days first, correct the date, or mark them as work-free days."
          : "Record those days first or correct the date — if there was no work, ask an admin to mark them as work-free days.")
    );
  }
  if (u.pending.length > 0) {
    parts.push(
      `${u.pending.length === 1 ? "A day is" : `${u.pending.length} days are`} still waiting for approval: ${listDays(u.pending)}. ` +
        (isAdmin ? "Approve those records first." : "Wait for an admin to approve those records first.")
    );
  }
  return parts.join(" ");
}
