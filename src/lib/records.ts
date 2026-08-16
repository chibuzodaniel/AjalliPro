import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export const dailyRecordInclude = {
  productionLines: true,
  driverSales: { include: { driver: true, customer: true } },
  truckDeliveries: { include: { customer: true } },
  expenseItems: { include: { paidBy: true } },
  factoryCustomer: true,
  createdBy: true,
  approvedBy: true,
} satisfies Prisma.DailyRecordInclude;

export type DailyRecordFull = Prisma.DailyRecordGetPayload<{
  include: typeof dailyRecordInclude;
}>;

export async function getAllRecordsSorted(): Promise<DailyRecordFull[]> {
  return prisma.dailyRecord.findMany({
    include: dailyRecordInclude,
    orderBy: { date: "desc" },
  });
}

export async function getApprovedRecordsSorted(): Promise<DailyRecordFull[]> {
  const records = await prisma.dailyRecord.findMany({
    where: { status: "APPROVED" },
    include: dailyRecordInclude,
    orderBy: { date: "asc" },
  });
  return records;
}

export function recordProdTotal(r: DailyRecordFull): number {
  return r.productionLines.reduce((s, p) => s + p.bags, 0);
}

export function recordDriverBagsTotal(r: DailyRecordFull): number {
  return r.driverSales.reduce((s, d) => s + d.bags, 0);
}

export function recordDriverBonusBagsTotal(r: DailyRecordFull): number {
  return r.driverSales.reduce((s, d) => s + d.bonusBags, 0);
}

export function recordTruckDeliveryBagsTotal(r: DailyRecordFull): number {
  return r.truckDeliveries.reduce((s, t) => s + t.bags, 0);
}

export function recordTruckDeliveryBonusBagsTotal(r: DailyRecordFull): number {
  return r.truckDeliveries.reduce((s, t) => s + t.bonusBags, 0);
}

export function recordTruckDeliveryCostTotal(r: DailyRecordFull): number {
  return r.truckDeliveries.reduce((s, t) => s + (t.ownTruck ? t.fuelCost : t.hiredCost), 0);
}

export function recordSoldTotal(r: DailyRecordFull): number {
  return r.factoryBags + recordDriverBagsTotal(r) + recordTruckDeliveryBagsTotal(r);
}

export function recordExpenseTotal(r: DailyRecordFull): number {
  return r.expenseItems.reduce((s, e) => s + e.amount, 0);
}
