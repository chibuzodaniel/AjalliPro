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
