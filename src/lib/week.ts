/**
 * Ported byte-for-byte from the prototype: this is NOT ISO-8601 week
 * numbering, it's a custom day-of-year formula. Business incentive
 * thresholds (500 bags/week for customers, 1000 for drivers) depend on
 * this exact bucketing, so don't "fix" it with a standard week library.
 */
export function weekKeyOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${week}`;
}

/**
 * Deviation from the prototype (intentional): the original used
 * `new Date().toISOString().slice(0,10)`, which is UTC and can report
 * the wrong calendar date around midnight in Lagos time (UTC+1). This
 * computes the local calendar date instead.
 */
export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentWeekKey(): string {
  return weekKeyOf(todayISO());
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Display-only relabeling of a weekKeyOf() key, e.g. "2026-W37" -> "2026-09-1w"
 * (year-month-week-of-month). This is purely cosmetic — it does not change
 * which days belong to which week (see weekKeyOf above); it just re-derives a
 * friendlier label from that same bucket's start date. Never use this for
 * grouping/comparison, only for text shown to a human.
 */
export function formatWeekLabel(weekKey: string): string {
  const match = /^(\d{4})-W(\d+)$/.exec(weekKey);
  if (!match) return weekKey;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const onejan = new Date(year, 0, 1);
  const startDiffDays = Math.max(0, (week - 1) * 7 - onejan.getDay());
  const startDate = new Date(year, 0, 1 + startDiffDays);
  const month = String(startDate.getMonth() + 1).padStart(2, "0");
  const weekOfMonth = Math.ceil(startDate.getDate() / 7);
  return `${startDate.getFullYear()}-${month}-${weekOfMonth}w`;
}
