import { prisma } from "./prisma";
import { getApprovedRecordsSorted, getAllApprovedRecordsEverSorted } from "./records";
import { computeIncentiveData } from "./incentives";
import { currentWeekKey } from "./week";
import { getWeeklyIncentiveSettings } from "./settings";

export interface PendingIncentiveAward {
  entityType: "CUSTOMER" | "DRIVER";
  entityId: string;
  name: string;
  address: string | null;
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
        address: c.address,
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
        address: null,
        weeklyBags,
        threshold: weeklySettings.driverWeeklyThreshold,
        bonusBags: weeklySettings.driverWeeklyBonus,
        weekKey: wk,
      });
    }
  }
  return pending;
}

export type IncentiveAwardStatus = "RECEIVED" | "AWAITING" | "NOT_RECEIVED";

export interface IncentiveAwardHistoryRow {
  key: string;
  entityType: "CUSTOMER" | "DRIVER";
  entityId: string;
  name: string;
  address: string | null;
  weekKey: string;
  weeklyBags: number;
  bonusBags: number;
  status: IncentiveAwardStatus;
  /** Only set when status is RECEIVED. */
  award: {
    id: string;
    deductedOn: string;
    approvedByName: string;
    approvedAt: Date;
  } | null;
}

/**
 * Every week, all-time, in which a customer/driver crossed the weekly bag
 * threshold — merged with the IncentiveAward rows so each one shows whether
 * the bonus was actually given:
 *  - RECEIVED: approved by Admin/Super Admin and deducted from stock.
 *  - AWAITING: current week, qualified, not approved yet (still approvable).
 *  - NOT_RECEIVED: a past week that qualified but was never approved.
 * Past-week qualification is judged against the *current* threshold
 * settings, since thresholds aren't versioned. Any approved award is always
 * listed, even if its week no longer meets today's threshold.
 */
export async function getIncentiveAwardHistory(): Promise<IncentiveAwardHistoryRow[]> {
  const wk = currentWeekKey();
  const [allRecords, weeklySettings, customers, drivers, awards] = await Promise.all([
    getAllApprovedRecordsEverSorted(),
    getWeeklyIncentiveSettings(),
    prisma.customer.findMany(),
    prisma.driver.findMany(),
    prisma.incentiveAward.findMany({ include: { approvedBy: true, dailyRecord: true } }),
  ]);
  const { customerWeekly, driverWeekly } = computeIncentiveData(allRecords);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const driverById = new Map(drivers.map((d) => [d.id, d]));

  const awardByKey = new Map<string, (typeof awards)[number]>();
  for (const a of awards) {
    const entityId = a.entityType === "CUSTOMER" ? a.customerId : a.driverId;
    if (entityId) awardByKey.set(`${a.entityType}:${entityId}:${a.weekKey}`, a);
  }

  const rows = new Map<string, IncentiveAwardHistoryRow>();
  function addRow(entityType: "CUSTOMER" | "DRIVER", entityId: string, weekKey: string, weeklyBags: number, defaultBonus: number) {
    const key = `${entityType}:${entityId}:${weekKey}`;
    const entity = entityType === "CUSTOMER" ? customerById.get(entityId) : driverById.get(entityId);
    const award = awardByKey.get(key);
    rows.set(key, {
      key,
      entityType,
      entityId,
      name: entity?.name ?? "Unknown",
      address: entityType === "CUSTOMER" ? (customerById.get(entityId)?.address ?? null) : null,
      weekKey,
      weeklyBags,
      bonusBags: award?.bonusBags ?? defaultBonus,
      status: award ? "RECEIVED" : weekKey === wk ? "AWAITING" : "NOT_RECEIVED",
      award: award
        ? {
            id: award.id,
            deductedOn: award.dailyRecord.date,
            approvedByName: award.approvedBy.name,
            approvedAt: award.approvedAt,
          }
        : null,
    });
  }

  for (const [customerId, weeks] of customerWeekly) {
    for (const [weekKey, bags] of Object.entries(weeks)) {
      if (bags >= weeklySettings.customerWeeklyThreshold) {
        addRow("CUSTOMER", customerId, weekKey, bags, weeklySettings.customerWeeklyBonus);
      }
    }
  }
  for (const [driverId, weeks] of driverWeekly) {
    // Unapproved/removed drivers can't be awarded now, but their past received bonuses still show via awards below.
    if (driverById.get(driverId)?.status !== "APPROVED") continue;
    for (const [weekKey, bags] of Object.entries(weeks)) {
      if (bags >= weeklySettings.driverWeeklyThreshold) {
        addRow("DRIVER", driverId, weekKey, bags, weeklySettings.driverWeeklyBonus);
      }
    }
  }
  for (const [key, a] of awardByKey) {
    if (rows.has(key)) continue;
    const entityId = (a.entityType === "CUSTOMER" ? a.customerId : a.driverId)!;
    const weeks = a.entityType === "CUSTOMER" ? customerWeekly.get(entityId) : driverWeekly.get(entityId);
    addRow(a.entityType as "CUSTOMER" | "DRIVER", entityId, a.weekKey, weeks?.[a.weekKey] ?? 0, a.bonusBags);
  }

  return [...rows.values()].sort(
    (a, b) => b.weekKey.localeCompare(a.weekKey, undefined, { numeric: true }) || a.name.localeCompare(b.name)
  );
}
