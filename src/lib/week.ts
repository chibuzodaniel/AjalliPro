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

/**
 * True once a date is the last calendar day of its month — used to decide
 * when an as-yet-unpaid month's salary should start counting as a real,
 * due expense (see Expenses page) rather than a forward-looking commitment
 * still accruing. Staff can still be marked paid early any time from the
 * Staff page; this only governs when it shows up as "owing" on Expenses.
 */
export function isLastDayOfMonth(dateStr: string): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  return day === daysInMonth;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Which calendar month a weekKeyOf() bucket belongs to, for grouping weekly
 * figures into a monthly view — a week that straddles two months (they don't
 * reset at month boundaries) is attributed to the month its first day falls
 * in. Display-only grouping; never use this to change weekKeyOf's own
 * bucketing.
 */
export function weekKeyToMonthKey(weekKey: string): string {
  const match = /^(\d{4})-W(\d+)$/.exec(weekKey);
  if (!match) return weekKey;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const onejan = new Date(year, 0, 1);
  const startDiffDays = Math.max(0, (week - 1) * 7 - onejan.getDay());
  const startDate = new Date(year, 0, 1 + startDiffDays);
  const month = String(startDate.getMonth() + 1).padStart(2, "0");
  return `${startDate.getFullYear()}-${month}`;
}
