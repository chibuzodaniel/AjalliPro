import { prisma } from "./prisma";

export interface PackerTotals {
  bags: number; // total bags packed across every approved production line ever logged for this packer
  earned: number; // sum of bags × pricePerBag across every approved production line ever logged for this packer
  paid: number; // sum of PackerPayment.amount
  balanceAdjustment: number; // Super Admin correction — see Packer.balanceAdjustment
  owing: number; // earned - paid + balanceAdjustment
}

/** Packer pay is a running balance, not per-day expense lines — see PackerPayment. */
export async function getPackerTotalsMap(): Promise<Map<string, PackerTotals>> {
  const [packers, lines, payments] = await Promise.all([
    prisma.packer.findMany({ select: { id: true, balanceAdjustment: true } }),
    prisma.productionLine.findMany({
      where: { dailyRecord: { status: "APPROVED" } },
      select: { packerId: true, bags: true, pricePerBag: true },
    }),
    prisma.packerPayment.groupBy({ by: ["packerId"], _sum: { amount: true } }),
  ]);

  const adjustmentByPacker = new Map(packers.map((p) => [p.id, p.balanceAdjustment]));
  const bagsByPacker = new Map<string, number>();
  const earnedByPacker = new Map<string, number>();
  for (const l of lines) {
    bagsByPacker.set(l.packerId, (bagsByPacker.get(l.packerId) ?? 0) + l.bags);
    earnedByPacker.set(l.packerId, (earnedByPacker.get(l.packerId) ?? 0) + l.bags * l.pricePerBag);
  }
  const paidByPacker = new Map(payments.map((p) => [p.packerId, p._sum.amount ?? 0]));

  const result = new Map<string, PackerTotals>();
  const allIds = new Set([...adjustmentByPacker.keys(), ...earnedByPacker.keys(), ...paidByPacker.keys()]);
  for (const id of allIds) {
    const bags = bagsByPacker.get(id) ?? 0;
    const earned = earnedByPacker.get(id) ?? 0;
    const paid = paidByPacker.get(id) ?? 0;
    const balanceAdjustment = adjustmentByPacker.get(id) ?? 0;
    result.set(id, { bags, earned, paid, balanceAdjustment, owing: earned - paid + balanceAdjustment });
  }
  return result;
}
