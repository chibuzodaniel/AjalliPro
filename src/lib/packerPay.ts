import { prisma } from "./prisma";

export interface PackerTotals {
  earned: number; // sum of bags × pricePerBag across every approved production line ever logged for this packer
  paid: number; // sum of PackerPayment.amount
  owing: number; // earned - paid
}

/** Packer pay is a running balance, not per-day expense lines — see PackerPayment. */
export async function getPackerTotalsMap(): Promise<Map<string, PackerTotals>> {
  const [lines, payments] = await Promise.all([
    prisma.productionLine.findMany({
      where: { dailyRecord: { status: "APPROVED" } },
      select: { packerId: true, bags: true, pricePerBag: true },
    }),
    prisma.packerPayment.groupBy({ by: ["packerId"], _sum: { amount: true } }),
  ]);

  const earnedByPacker = new Map<string, number>();
  for (const l of lines) {
    earnedByPacker.set(l.packerId, (earnedByPacker.get(l.packerId) ?? 0) + l.bags * l.pricePerBag);
  }
  const paidByPacker = new Map(payments.map((p) => [p.packerId, p._sum.amount ?? 0]));

  const result = new Map<string, PackerTotals>();
  const allIds = new Set([...earnedByPacker.keys(), ...paidByPacker.keys()]);
  for (const id of allIds) {
    const earned = earnedByPacker.get(id) ?? 0;
    const paid = paidByPacker.get(id) ?? 0;
    result.set(id, { earned, paid, owing: earned - paid });
  }
  return result;
}
