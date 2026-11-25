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

async function uncoveredDates(candidates: string[]): Promise<string[]> {
  if (candidates.length === 0) return [];
  const [workFree, records] = await Promise.all([
    prisma.workFreeDay.findMany({ where: { date: { in: candidates } }, select: { date: true } }),
    prisma.dailyRecord.findMany({ where: { date: { in: candidates }, archivedAt: null }, select: { date: true } }),
  ]);
  const covered = new Set([...workFree.map((w) => w.date), ...records.map((r) => r.date)]);
  return candidates.filter((d) => !covered.has(d));
}

/**
 * Days that would be left with neither a daily record nor a work-free mark
 * if a record were saved on `date`: the gap back to the previous active
 * record, plus — when an existing record is being moved off `oldDate` — the
 * hole that move would leave between its neighbours. Older gaps that this
 * change doesn't touch aren't reported.
 */
export async function findMissingDates(date: string, opts: { excludeId?: string; oldDate?: string } = {}): Promise<string[]> {
  const notThis = opts.excludeId ? { id: { not: opts.excludeId } } : {};
  const prev = await prisma.dailyRecord.findFirst({
    where: { archivedAt: null, date: { lt: date }, ...notThis },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const candidates = new Set(prev ? datesBetween(prev.date, date) : []);

  if (opts.oldDate && opts.oldDate !== date) {
    const [before, after] = await Promise.all([
      prisma.dailyRecord.findFirst({
        where: { archivedAt: null, date: { lt: opts.oldDate }, ...notThis },
        orderBy: { date: "desc" },
        select: { date: true },
      }),
      prisma.dailyRecord.findFirst({
        where: { archivedAt: null, date: { gt: opts.oldDate }, ...notThis },
        orderBy: { date: "asc" },
        select: { date: true },
      }),
    ]);
    // Neighbours of the vacated date once the record sits on `date` instead.
    const old = opts.oldDate;
    const lower = [before?.date, date < old ? date : undefined].filter((d): d is string => !!d).sort().pop();
    const upper = [after?.date, date > old ? date : undefined].filter((d): d is string => !!d).sort()[0];
    if (lower && upper) for (const d of datesBetween(lower, upper)) candidates.add(d);
  }
  candidates.delete(date);
  return uncoveredDates([...candidates].sort());
}

export function missingDatesMessage(missing: string[], isAdmin: boolean): string {
  const shown = missing.slice(0, 7).map(formatDay).join(", ");
  const more = missing.length > 7 ? ` and ${missing.length - 7} more` : "";
  const fix = isAdmin
    ? "Record those days first, correct the date, or mark them as work-free days."
    : "Record those days first or correct the date — if there was no work, ask an admin to mark them as work-free days.";
  return `${missing.length === 1 ? "A day is" : `${missing.length} days are`} missing with no record and not marked work-free: ${shown}${more}. ${fix}`;
}
