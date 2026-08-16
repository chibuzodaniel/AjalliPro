import type { DailyRecordFull } from "./records";
import { weekKeyOf } from "./week";

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
