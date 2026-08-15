"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { needsApproval } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { dailyRecordSchema } from "@/lib/validation/daily-record";
import { latestClosingStock, latestLeakageClosing, computeClosingStock, computeLeakageClosing } from "@/lib/stock";
import { getPricingSettings } from "@/lib/settings";
import { bonusForBags } from "@/lib/incentives";

export interface CreateDailyRecordResult {
  ok: boolean;
  error?: string;
}

export async function createDailyRecord(input: unknown): Promise<CreateDailyRecordResult> {
  const user = await requireRole(["SALES_STAFF", "EDITOR", "ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  const parsed = dailyRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const existing = await prisma.dailyRecord.findUnique({ where: { date: data.date } });
  if (existing) {
    return { ok: false, error: `A daily record for ${data.date} already exists.` };
  }

  const [computedOpening, leakageOpening, fixedPricing, tiers, drivers] = await Promise.all([
    latestClosingStock(),
    latestLeakageClosing(),
    getPricingSettings(),
    prisma.incentiveTier.findMany(),
    prisma.driver.findMany({ where: { id: { in: data.driverSales.map((d) => d.driverId) } } }),
  ]);

  if (data.factoryBagsFromLeakage > leakageOpening) {
    return {
      ok: false,
      error: `Only ${leakageOpening} bags are available in the leakage pile to rebag.`,
    };
  }

  const opening =
    user.role === "SUPER_ADMIN" && data.openingStockOverride != null ? data.openingStockOverride : computedOpening;
  const prodTotal = data.production.reduce((s, p) => s + p.bags, 0);
  const driverBagsTotal = data.driverSales.reduce((s, d) => s + d.bags, 0);
  const driverBonusBagsTotal = data.driverSales.reduce((s, d) => s + bonusForBags(d.bags, tiers), 0);
  const truckDeliveryBagsTotal = data.truckDeliveries.reduce((s, t) => s + t.bags, 0);

  const closing = computeClosingStock({
    opening,
    prodTotal,
    factoryBags: data.factoryBags,
    factoryBagsFromLeakage: data.factoryBagsFromLeakage,
    driverBagsTotal,
    driverBonusBagsTotal,
    truckDeliveryBagsTotal,
    leakageBagsNew: data.leakageBags,
  });
  const leakageClosing = computeLeakageClosing(leakageOpening, data.leakageBags, data.factoryBagsFromLeakage);
  const pending = needsApproval(user.role);

  const canEditFactoryPrice = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const factoryPricePerBag = canEditFactoryPrice ? data.factoryPricePerBag : fixedPricing.factoryPricePerBag;
  const driverById = new Map(drivers.map((d) => [d.id, d]));

  try {
    const record = await prisma.dailyRecord.create({
      data: {
        date: data.date,
        openingStock: opening,
        closingStock: closing,
        factoryBags: data.factoryBags,
        factoryBagsFromLeakage: data.factoryBagsFromLeakage,
        factoryPricePerBag,
        factoryCustomerId: data.factoryCustomerId || null,
        pumpWaterAmount: data.pumpWaterAmount,
        leakageOpening,
        leakageBags: data.leakageBags,
        leakageClosing,
        status: pending ? "PENDING" : "APPROVED",
        createdById: user.id,
        createdByRole: user.role,
        approvedById: pending ? null : user.id,
        productionLines: {
          create: data.production.map((p) => ({ packerName: p.packerName, bags: p.bags })),
        },
        driverSales: {
          create: data.driverSales.map((d) => {
            const driver = driverById.get(d.driverId);
            return {
              driverId: d.driverId,
              bags: d.bags,
              pricePerBag: driver?.pricePerBag ?? 0,
              loadingFee: driver?.loadingFee ?? 0,
              bonusBags: bonusForBags(d.bags, tiers),
              customerId: d.customerId || null,
            };
          }),
        },
        truckDeliveries: {
          create: data.truckDeliveries.map((t) => ({
            customerId: t.customerId || null,
            bags: t.bags,
            ownTruck: t.ownTruck,
            fuelCost: t.ownTruck ? t.fuelCost : 0,
            hiredCost: t.ownTruck ? 0 : t.hiredCost,
          })),
        },
        expenseItems: {
          create: data.expenses.map((e) => ({
            description: e.description,
            amount: e.amount,
            paid: e.paid,
            paidAt: e.paid ? new Date() : null,
            paidById: e.paid ? user.id : null,
          })),
        },
      },
    });

    await logActivity(
      `${user.name} logged the daily record for ${record.date} (${pending ? "pending" : "approved"}).`,
      user.id
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: `A daily record for ${data.date} already exists.` };
    }
    throw e;
  }
}
