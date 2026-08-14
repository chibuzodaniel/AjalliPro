import type { DailyRecordFull } from "./records";
import { weekKeyOf } from "./week";

export type WeeklyBagsMap = Record<string, number>;

export interface IncentiveData {
  driverWeekly: Map<string, WeeklyBagsMap>;
  customerWeekly: Map<string, WeeklyBagsMap>;
  customerYearly: Map<string, Record<number, number>>;
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

  function bumpWeekly(map: Map<string, WeeklyBagsMap>, id: string, weekKey: string, bags: number) {
    const existing = map.get(id) ?? {};
    existing[weekKey] = (existing[weekKey] ?? 0) + bags;
    map.set(id, existing);
  }
  function bumpYearly(id: string, year: number, bags: number) {
    const existing = customerYearly.get(id) ?? {};
    existing[year] = (existing[year] ?? 0) + bags;
    customerYearly.set(id, existing);
  }

  for (const r of records) {
    const weekKey = weekKeyOf(r.date);
    const year = Number(r.date.slice(0, 4));

    if (r.factoryCustomerId && r.factoryBags > 0) {
      bumpWeekly(customerWeekly, r.factoryCustomerId, weekKey, r.factoryBags);
      bumpYearly(r.factoryCustomerId, year, r.factoryBags);
    }

    for (const ds of r.driverSales) {
      bumpWeekly(driverWeekly, ds.driverId, weekKey, ds.bags);
      if (ds.customerId) {
        bumpWeekly(customerWeekly, ds.customerId, weekKey, ds.bags);
        bumpYearly(ds.customerId, year, ds.bags);
      }
    }
  }

  return { driverWeekly, customerWeekly, customerYearly };
}

export function weeksQualified(weeklyMap: WeeklyBagsMap | undefined, threshold: number): number {
  if (!weeklyMap) return 0;
  return Object.values(weeklyMap).filter((b) => b >= threshold).length;
}

export interface IncentiveTierLike {
  min: number;
  max: number;
  bonus: number;
}

export function bonusForBags(bags: number, tiers: IncentiveTierLike[]): number {
  const tier = tiers.find((t) => bags >= t.min && bags <= t.max);
  return tier ? tier.bonus : 0;
}
