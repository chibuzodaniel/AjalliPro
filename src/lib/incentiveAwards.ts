import { prisma } from "./prisma";
import { getApprovedRecordsSorted, getAllApprovedRecordsEverSorted } from "./records";
import { computeIncentiveData, weeklyThresholdBonus } from "./incentives";
import { currentWeekKey, weekKeyOf } from "./week";
import { getWeeklyIncentiveSettings } from "./settings";

export interface PendingIncentiveAward {
  entityType: "CUSTOMER" | "DRIVER";
  entityId: string;
  name: string;
  address: string | null;
  weeklyBags: number;
  threshold: number;
  /** Bonus bags still to be approved for this week (earned minus already received). */
  bonusBags: number;
  weekKey: string;
}

/**
 * Approval-gated weekly bonuses (IncentiveAward) went live on 2026-09-28.
 * Before that, drivers' weekly bonus bags were already given out and taken
 * off stock without going through an approval, so there's no IncentiveAward
 * row for them — every driver week before this one counts as already
 * received, and can't be approved (paid) again.
 */
export const LEGACY_DRIVER_BONUS_CUTOFF_WEEK = weekKeyOf("2026-09-28");

export function isLegacyDriverBonusWeek(entityType: string, weekKey: string): boolean {
  return (
    entityType === "DRIVER" &&
    weekKey.localeCompare(LEGACY_DRIVER_BONUS_CUTOFF_WEEK, undefined, { numeric: true }) < 0
  );
}

/** Key used to group IncentiveAward rows / weekly figures per entity per week. */
function awardKey(entityType: string, entityId: string, weekKey: string) {
  return `${entityType}:${entityId}:${weekKey}`;
}

/** Total bonus bags already approved, per entity+week. A week can hold several awards (top-ups as more thresholds are crossed). */
function sumAwardsByKey(awards: { entityType: string; customerId: string | null; driverId: string | null; weekKey: string; bonusBags: number }[]) {
  const sums = new Map<string, number>();
  for (const a of awards) {
    const entityId = a.entityType === "CUSTOMER" ? a.customerId : a.driverId;
    if (!entityId) continue;
    const k = awardKey(a.entityType, entityId, a.weekKey);
    sums.set(k, (sums.get(k) ?? 0) + a.bonusBags);
  }
  return sums;
}

/**
 * Customers/drivers who've earned more weekly-threshold bonus this week than
 * has been approved (and deducted from stock) so far — see
 * approveIncentiveAward. The bonus is paid per full threshold reached (2000
 * bags on a 1000 threshold = 2× bonus), so someone approved at 1000 bags
 * shows up again as pending once they reach 2000. Drives the Dashboard pop-up
 * notification.
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
  const received = sumAwardsByKey(existingAwards);

  const pending: PendingIncentiveAward[] = [];
  for (const c of customers) {
    const weeklyBags = customerWeekly.get(c.id)?.[wk] ?? 0;
    const earned = weeklyThresholdBonus(weeklyBags, weeklySettings.customerWeeklyThreshold, weeklySettings.customerWeeklyBonus);
    const remaining = earned - (received.get(awardKey("CUSTOMER", c.id, wk)) ?? 0);
    if (remaining > 0) {
      pending.push({
        entityType: "CUSTOMER",
        entityId: c.id,
        name: c.name,
        address: c.address,
        weeklyBags,
        threshold: weeklySettings.customerWeeklyThreshold,
        bonusBags: remaining,
        weekKey: wk,
      });
    }
  }
  for (const d of drivers) {
    const weeklyBags = driverWeekly.get(d.id)?.[wk] ?? 0;
    const earned = weeklyThresholdBonus(weeklyBags, weeklySettings.driverWeeklyThreshold, weeklySettings.driverWeeklyBonus);
    const remaining = earned - (received.get(awardKey("DRIVER", d.id, wk)) ?? 0);
    if (remaining > 0) {
      pending.push({
        entityType: "DRIVER",
        entityId: d.id,
        name: d.name,
        address: null,
        weeklyBags,
        threshold: weeklySettings.driverWeeklyThreshold,
        bonusBags: remaining,
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
  /** How many full thresholds were reached that week (2000 bags / 1000 = 2). */
  multiplier: number;
  /** Total weekly-threshold bonus earned that week, under the current settings. */
  earnedBags: number;
  /** Bonus bags already approved and deducted from stock for that week. */
  receivedBags: number;
  /** earnedBags − receivedBags, never negative — what an Approve would deduct now. */
  remainingBags: number;
  status: IncentiveAwardStatus;
  /** Most recent approval for that week (what Revert undoes), if any. */
  award: {
    id: string;
    deductedOn: string;
    /** Day the bonus was actually handed over (entered on approval); falls back to the approval date for older awards. */
    givenOn: string;
    /** Which pile the (latest) approval took the bags from. */
    source: "FRESH" | "LEAKAGE";
    approvedByName: string;
    approvedAt: Date;
  } | null;
  /** Number of separate approvals for that week (more than one = topped up). */
  approvalCount: number;
  /** Driver week from before approvals existed — the bonus was given/deducted automatically back then (see LEGACY_DRIVER_BONUS_CUTOFF_WEEK). */
  legacyAutoDeducted: boolean;
}

/**
 * Every week, all-time, in which a customer/driver reached the weekly bag
 * threshold at least once — merged with the IncentiveAward rows so each one
 * shows whether the bonus was actually given:
 *  - RECEIVED: everything earned that week has been approved and deducted.
 *  - AWAITING: current week, some (or all) of the earned bonus not approved yet.
 *  - NOT_RECEIVED: a past week where some (or all) of the earned bonus was never approved.
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
    prisma.incentiveAward.findMany({
      include: { approvedBy: true, dailyRecord: true },
      orderBy: { approvedAt: "desc" },
    }),
  ]);
  const { customerWeekly, driverWeekly } = computeIncentiveData(allRecords);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const driverById = new Map(drivers.map((d) => [d.id, d]));

  // Awards are ordered newest first, so the first one seen per key is the latest.
  const awardsByKey = new Map<string, (typeof awards)[number][]>();
  for (const a of awards) {
    const entityId = a.entityType === "CUSTOMER" ? a.customerId : a.driverId;
    if (!entityId) continue;
    const k = awardKey(a.entityType, entityId, a.weekKey);
    const list = awardsByKey.get(k) ?? [];
    list.push(a);
    awardsByKey.set(k, list);
  }

  const rows = new Map<string, IncentiveAwardHistoryRow>();
  function addRow(entityType: "CUSTOMER" | "DRIVER", entityId: string, weekKey: string, weeklyBags: number) {
    const key = awardKey(entityType, entityId, weekKey);
    const threshold = entityType === "CUSTOMER" ? weeklySettings.customerWeeklyThreshold : weeklySettings.driverWeeklyThreshold;
    const bonus = entityType === "CUSTOMER" ? weeklySettings.customerWeeklyBonus : weeklySettings.driverWeeklyBonus;
    const entity = entityType === "CUSTOMER" ? customerById.get(entityId) : driverById.get(entityId);
    const weekAwards = awardsByKey.get(key) ?? [];
    const latest = weekAwards[0];
    const earnedBags = weeklyThresholdBonus(weeklyBags, threshold, bonus);
    const legacyAutoDeducted = isLegacyDriverBonusWeek(entityType, weekKey);
    const approvedBags = weekAwards.reduce((s, a) => s + a.bonusBags, 0);
    const receivedBags = legacyAutoDeducted ? Math.max(earnedBags, approvedBags) : approvedBags;
    const remainingBags = Math.max(0, earnedBags - receivedBags);
    rows.set(key, {
      key,
      entityType,
      entityId,
      name: entity?.name ?? "Unknown",
      address: entityType === "CUSTOMER" ? (customerById.get(entityId)?.address ?? null) : null,
      weekKey,
      weeklyBags,
      multiplier: threshold > 0 ? Math.floor(weeklyBags / threshold) : 0,
      earnedBags,
      receivedBags,
      remainingBags,
      status: remainingBags === 0 ? "RECEIVED" : weekKey === wk ? "AWAITING" : "NOT_RECEIVED",
      award: latest
        ? {
            id: latest.id,
            deductedOn: latest.dailyRecord.date,
            givenOn: latest.givenOn ?? latest.approvedAt.toISOString().slice(0, 10),
            source: latest.source === "LEAKAGE" ? "LEAKAGE" : "FRESH",
            approvedByName: latest.approvedBy.name,
            approvedAt: latest.approvedAt,
          }
        : null,
      approvalCount: weekAwards.length,
      legacyAutoDeducted,
    });
  }

  for (const [customerId, weeks] of customerWeekly) {
    for (const [weekKey, bags] of Object.entries(weeks)) {
      if (bags >= weeklySettings.customerWeeklyThreshold) addRow("CUSTOMER", customerId, weekKey, bags);
    }
  }
  for (const [driverId, weeks] of driverWeekly) {
    // Unapproved/removed drivers can't be awarded now, but their past received bonuses still show via awards below.
    if (driverById.get(driverId)?.status !== "APPROVED") continue;
    for (const [weekKey, bags] of Object.entries(weeks)) {
      if (bags >= weeklySettings.driverWeeklyThreshold) addRow("DRIVER", driverId, weekKey, bags);
    }
  }
  for (const [key, list] of awardsByKey) {
    if (rows.has(key)) continue;
    const a = list[0];
    const entityId = (a.entityType === "CUSTOMER" ? a.customerId : a.driverId)!;
    const weeks = a.entityType === "CUSTOMER" ? customerWeekly.get(entityId) : driverWeekly.get(entityId);
    addRow(a.entityType as "CUSTOMER" | "DRIVER", entityId, a.weekKey, weeks?.[a.weekKey] ?? 0);
  }

  return [...rows.values()].sort(
    (a, b) => b.weekKey.localeCompare(a.weekKey, undefined, { numeric: true }) || a.name.localeCompare(b.name)
  );
}
