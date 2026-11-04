import type { DailyRecordFull } from "./records";
import { weekKeyOf, weekKeyToMonthKey } from "./week";

export type WeeklyBagsMap = Record<string, number>;

export interface IncentiveData {
  driverWeekly: Map<string, WeeklyBagsMap>;
  customerWeekly: Map<string, WeeklyBagsMap>;
  customerYearly: Map<string, Record<number, number>>;
  /** Manually-entered instant incentive bags given per driver sale (not paid for). */
  driverInstantWeekly: Map<string, WeeklyBagsMap>;
  driverInstantYearly: Map<string, Record<number, number>>;
  /** Manually-entered instant incentive bags given per truck delivery (not paid for). */
  customerInstantWeekly: Map<string, WeeklyBagsMap>;
  customerInstantYearly: Map<string, Record<number, number>>;
}

/**
 * Deviation from the prototype (intentional fix): the original never
 * actually wired customer.weeklyBags to anything, since factory sales
 * weren't linked to a customer. Here, weekly/yearly bag totals for both
 * drivers and customers are derived from real approved-record line items
 * (driver sales + the optional customer link on factory sales) instead of
 * a mutable counter bumped on approval, which also removes any
 * approval-order double-counting risk.
 */
export function computeIncentiveData(records: DailyRecordFull[]): IncentiveData {
  const driverWeekly = new Map<string, WeeklyBagsMap>();
  const customerWeekly = new Map<string, WeeklyBagsMap>();
  const customerYearly = new Map<string, Record<number, number>>();
  const driverInstantWeekly = new Map<string, WeeklyBagsMap>();
  const driverInstantYearly = new Map<string, Record<number, number>>();
  const customerInstantWeekly = new Map<string, WeeklyBagsMap>();
  const customerInstantYearly = new Map<string, Record<number, number>>();

  function bumpWeekly(map: Map<string, WeeklyBagsMap>, id: string, weekKey: string, bags: number) {
    const existing = map.get(id) ?? {};
    existing[weekKey] = (existing[weekKey] ?? 0) + bags;
    map.set(id, existing);
  }
  function bumpYearly(map: Map<string, Record<number, number>>, id: string, year: number, bags: number) {
    const existing = map.get(id) ?? {};
    existing[year] = (existing[year] ?? 0) + bags;
    map.set(id, existing);
  }

  for (const r of records) {
    const weekKey = weekKeyOf(r.date);
    const year = Number(r.date.slice(0, 4));

    if (r.factoryCustomerId && r.factoryBags > 0) {
      bumpWeekly(customerWeekly, r.factoryCustomerId, weekKey, r.factoryBags);
      bumpYearly(customerYearly, r.factoryCustomerId, year, r.factoryBags);
    }

    for (const ds of r.driverSales) {
      bumpWeekly(driverWeekly, ds.driverId, weekKey, ds.bags);
      if (ds.bonusBags > 0) {
        bumpWeekly(driverInstantWeekly, ds.driverId, weekKey, ds.bonusBags);
        bumpYearly(driverInstantYearly, ds.driverId, year, ds.bonusBags);
      }
    }

    for (const t of r.truckDeliveries) {
      if (t.customerId) {
        bumpWeekly(customerWeekly, t.customerId, weekKey, t.bags);
        bumpYearly(customerYearly, t.customerId, year, t.bags);
        if (t.bonusBags > 0) {
          bumpWeekly(customerInstantWeekly, t.customerId, weekKey, t.bonusBags);
          bumpYearly(customerInstantYearly, t.customerId, year, t.bonusBags);
        }
      }
    }
  }

  return {
    driverWeekly,
    customerWeekly,
    customerYearly,
    driverInstantWeekly,
    driverInstantYearly,
    customerInstantWeekly,
    customerInstantYearly,
  };
}

export function weeksQualified(weeklyMap: WeeklyBagsMap | undefined, threshold: number): number {
  if (!weeklyMap) return 0;
  return Object.values(weeklyMap).filter((b) => b >= threshold).length;
}

export function weeksQualifiedInYear(weeklyMap: WeeklyBagsMap | undefined, threshold: number, year: number): number {
  if (!weeklyMap) return 0;
  const prefix = `${year}-`;
  return Object.entries(weeklyMap).filter(([wk, b]) => wk.startsWith(prefix) && b >= threshold).length;
}

export function yearTotal(yearlyMap: Record<number, number> | undefined, year: number): number {
  return yearlyMap?.[year] ?? 0;
}

export interface IncentiveHistoryRow {
  label: string;
  bags: number;
  /** Manually-entered instant bonus — deducted the moment that daily record is approved. */
  instantBags: number;
  /** Weekly-threshold bonus — only actually deducted once Admin/Super Admin approves that week's award (see approveIncentiveAward). */
  thresholdBags: number;
}

interface KeyedIncentiveRow {
  key: string;
  bags: number;
  instantBags: number;
  thresholdBags: number;
}

/**
 * Merges a weekly bags map and a weekly instant-bonus map into one row per
 * week — every week either map has an entry for, so this never misses a
 * week where only an instant bonus was given without also hitting the
 * threshold that week. Qualification (and so the threshold bonus) is
 * strictly a weekly mechanic, computed here, never re-derived per month.
 * Instant and threshold bags are kept as two separate figures throughout —
 * never merged into one blended "bonus" number — since they're earned,
 * shown, and deducted differently (see IncentiveHistoryRow).
 */
function computeWeeklyIncentiveRows(
  bagsMap: WeeklyBagsMap | undefined,
  instantMap: WeeklyBagsMap | undefined,
  threshold: number,
  thresholdBonus: number
): KeyedIncentiveRow[] {
  const keys = new Set([...Object.keys(bagsMap ?? {}), ...Object.keys(instantMap ?? {})]);
  return [...keys].map((key) => {
    const bags = bagsMap?.[key] ?? 0;
    const thresholdBags = bags >= threshold ? thresholdBonus : 0;
    const instantBags = instantMap?.[key] ?? 0;
    return { key, bags, instantBags, thresholdBags };
  });
}

export function buildWeeklyIncentiveHistory(
  bagsMap: WeeklyBagsMap | undefined,
  instantMap: WeeklyBagsMap | undefined,
  threshold: number,
  thresholdBonus: number
): IncentiveHistoryRow[] {
  return computeWeeklyIncentiveRows(bagsMap, instantMap, threshold, thresholdBonus)
    .sort((a, b) => b.key.localeCompare(a.key, undefined, { numeric: true }))
    .map(({ key, bags, instantBags, thresholdBags }) => ({ label: key, bags, instantBags, thresholdBags }));
}

/**
 * Rolls the same weekly figures up into months — a month's "incentive bags
 * earned" is the sum of what was actually earned in each of its weeks, not
 * the (weekly) threshold re-applied to a monthly total, which would qualify
 * almost every month trivially.
 */
export function buildMonthlyIncentiveHistory(
  bagsMap: WeeklyBagsMap | undefined,
  instantMap: WeeklyBagsMap | undefined,
  threshold: number,
  thresholdBonus: number,
  labelFn: (monthKey: string) => string
): IncentiveHistoryRow[] {
  const weekly = computeWeeklyIncentiveRows(bagsMap, instantMap, threshold, thresholdBonus);
  const monthly = new Map<string, { bags: number; instantBags: number; thresholdBags: number }>();
  for (const w of weekly) {
    const monthKey = weekKeyToMonthKey(w.key);
    const existing = monthly.get(monthKey) ?? { bags: 0, instantBags: 0, thresholdBags: 0 };
    existing.bags += w.bags;
    existing.instantBags += w.instantBags;
    existing.thresholdBags += w.thresholdBags;
    monthly.set(monthKey, existing);
  }
  return [...monthly.entries()]
    .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))
    .map(([monthKey, v]) => ({ label: labelFn(monthKey), ...v }));
}

/** Same rollup as buildMonthlyIncentiveHistory, one tier up — a year's totals summed from its months. */
export function buildYearlyIncentiveHistory(
  bagsMap: WeeklyBagsMap | undefined,
  instantMap: WeeklyBagsMap | undefined,
  threshold: number,
  thresholdBonus: number
): IncentiveHistoryRow[] {
  const weekly = computeWeeklyIncentiveRows(bagsMap, instantMap, threshold, thresholdBonus);
  const yearly = new Map<string, { bags: number; instantBags: number; thresholdBags: number }>();
  for (const w of weekly) {
    const yearKey = w.key.slice(0, 4);
    const existing = yearly.get(yearKey) ?? { bags: 0, instantBags: 0, thresholdBags: 0 };
    existing.bags += w.bags;
    existing.instantBags += w.instantBags;
    existing.thresholdBags += w.thresholdBags;
    yearly.set(yearKey, existing);
  }
  return [...yearly.entries()]
    .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))
    .map(([yearKey, v]) => ({ label: yearKey, ...v }));
}
