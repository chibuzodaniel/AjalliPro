import { prisma } from "./prisma";
import { getApprovedRecordsSorted } from "./records";
import { computeIncentiveData } from "./incentives";
import { currentWeekKey } from "./week";
import { getWeeklyIncentiveSettings } from "./settings";

export interface PendingIncentiveAward {
  entityType: "CUSTOMER" | "DRIVER";
  entityId: string;
  name: string;
  weeklyBags: number;
  threshold: number;
  bonusBags: number;
  weekKey: string;
}

/**
 * Customers/drivers who've crossed this week's bag threshold but haven't
 * had their bonus approved (and deducted from stock) yet — see
 * approveIncentiveAward. Drives the Dashboard pop-up notification.
 */
export async function getPendingIncentiveAwards(): Promise<PendingIncentiveAward[]> {
  const wk = currentWeekKey();
  const [approvedRecords, weeklySettings, customers, drivers, existingAwards] = await Promise.all([
    getApprovedRecordsSorted(),
    getWeeklyIncentiveSettings(),
    prisma.customer.findMany(),
    prisma.driver.findMany({ where: { status: "APPROVED" } }),
    prisma.incentiveAward.findMany({ where: { weekKey: wk } }),
  ]);
  const { customerWeekly, driverWeekly } = computeIncentiveData(approvedRecords);
  const awardedCustomerIds = new Set(existingAwards.filter((a) => a.customerId).map((a) => a.customerId));
  const awardedDriverIds = new Set(existingAwards.filter((a) => a.driverId).map((a) => a.driverId));

  const pending: PendingIncentiveAward[] = [];
  for (const c of customers) {
    const weeklyBags = customerWeekly.get(c.id)?.[wk] ?? 0;
    if (weeklyBags >= weeklySettings.customerWeeklyThreshold && !awardedCustomerIds.has(c.id)) {
      pending.push({
        entityType: "CUSTOMER",
        entityId: c.id,
        name: c.name,
        weeklyBags,
        threshold: weeklySettings.customerWeeklyThreshold,
        bonusBags: weeklySettings.customerWeeklyBonus,
        weekKey: wk,
      });
    }
  }
  for (const d of drivers) {
    const weeklyBags = driverWeekly.get(d.id)?.[wk] ?? 0;
    if (weeklyBags >= weeklySettings.driverWeeklyThreshold && !awardedDriverIds.has(d.id)) {
      pending.push({
        entityType: "DRIVER",
        entityId: d.id,
        name: d.name,
        weeklyBags,
        threshold: weeklySettings.driverWeeklyThreshold,
        bonusBags: weeklySettings.driverWeeklyBonus,
        weekKey: wk,
      });
    }
  }
  return pending;
}
