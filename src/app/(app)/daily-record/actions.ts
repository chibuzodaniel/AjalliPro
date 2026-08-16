"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth-helpers";
import { needsApproval, isApprover } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { dailyRecordSchema, dailyRecordEditSchema } from "@/lib/validation/daily-record";
import { latestClosingStock, latestLeakageClosing, computeClosingStock, computeLeakageClosing } from "@/lib/stock";
import { getPricingSettings } from "@/lib/settings";
import {
  dailyRecordInclude,
  recordProdTotal,
  recordDriverBagsTotal,
  recordDriverBonusBagsTotal,
  recordTruckDeliveryBagsTotal,
} from "@/lib/records";

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

  const [computedOpening, computedLeakageOpening, fixedPricing, drivers, truckCustomers] = await Promise.all([
    latestClosingStock(),
    latestLeakageClosing(),
    getPricingSettings(),
    prisma.driver.findMany({ where: { id: { in: data.driverSales.map((d) => d.driverId) } } }),
    prisma.customer.findMany({
      where: { id: { in: data.truckDeliveries.map((t) => t.customerId) } },
    }),
  ]);

  const opening =
    user.role === "SUPER_ADMIN" && data.openingStockOverride != null ? data.openingStockOverride : computedOpening;
  const leakageOpening =
    user.role === "SUPER_ADMIN" && data.leakageOpeningOverride != null
      ? data.leakageOpeningOverride
      : computedLeakageOpening;

  if (data.factoryBagsFromLeakage > leakageOpening) {
    return {
      ok: false,
      error: `Only ${leakageOpening} bags are available in the leakage pile to rebag.`,
    };
  }

  const prodTotal = data.production.reduce((s, p) => s + p.bags, 0);
  const driverBagsTotal = data.driverSales.reduce((s, d) => s + d.bags, 0);
  const driverBonusBagsTotal = data.driverSales.reduce((s, d) => s + d.bonusBags, 0);
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
  const truckCustomerById = new Map(truckCustomers.map((c) => [c.id, c]));

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
              bonusBags: d.bonusBags,
            };
          }),
        },
        truckDeliveries: {
          create: data.truckDeliveries.map((t) => {
            const customer = truckCustomerById.get(t.customerId);
            return {
              customerId: t.customerId,
              bags: t.bags,
              pricePerBag: customer?.pricePerBag ?? 0,
              ownTruck: t.ownTruck,
              fuelCost: t.ownTruck ? t.fuelCost : 0,
              hiredCost: t.ownTruck ? 0 : t.hiredCost,
            };
          }),
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

export interface UpdateDailyRecordResult {
  ok: boolean;
  error?: string;
}

async function cascadeRecalculate(
  tx: Prisma.TransactionClient,
  fromDate: string,
  startingClosingStock: number,
  startingLeakageClosing: number
) {
  const forward = await tx.dailyRecord.findMany({
    where: { status: "APPROVED", date: { gt: fromDate } },
    include: dailyRecordInclude,
    orderBy: { date: "asc" },
  });

  let runningClosing = startingClosingStock;
  let runningLeakageClosing = startingLeakageClosing;

  for (const rec of forward) {
    const opening = runningClosing;
    const leakageOpening = runningLeakageClosing;

    const closing = computeClosingStock({
      opening,
      prodTotal: recordProdTotal(rec),
      factoryBags: rec.factoryBags,
      factoryBagsFromLeakage: rec.factoryBagsFromLeakage,
      driverBagsTotal: recordDriverBagsTotal(rec),
      driverBonusBagsTotal: recordDriverBonusBagsTotal(rec),
      truckDeliveryBagsTotal: recordTruckDeliveryBagsTotal(rec),
      leakageBagsNew: rec.leakageBags,
    });
    const leakageClosing = computeLeakageClosing(leakageOpening, rec.leakageBags, rec.factoryBagsFromLeakage);

    await tx.dailyRecord.update({
      where: { id: rec.id },
      data: { openingStock: opening, closingStock: closing, leakageOpening, leakageClosing },
    });

    runningClosing = closing;
    runningLeakageClosing = leakageClosing;
  }
}

export async function updateDailyRecord(id: string, input: unknown): Promise<UpdateDailyRecordResult> {
  const user = await requireUser();
  const parsed = dailyRecordEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const existing = await prisma.dailyRecord.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Daily record not found." };
  }

  const canEdit = isApprover(user.role) || (existing.createdById === user.id && existing.status === "PENDING");
  if (!canEdit) {
    return { ok: false, error: "You don't have permission to edit this record." };
  }

  const [fixedPricing, drivers, truckCustomers] = await Promise.all([
    getPricingSettings(),
    prisma.driver.findMany({ where: { id: { in: data.driverSales.map((d) => d.driverId) } } }),
    prisma.customer.findMany({
      where: { id: { in: data.truckDeliveries.map((t) => t.customerId) } },
    }),
  ]);

  const opening =
    user.role === "SUPER_ADMIN" && data.openingStockOverride != null
      ? data.openingStockOverride
      : existing.openingStock;
  const leakageOpening =
    user.role === "SUPER_ADMIN" && data.leakageOpeningOverride != null
      ? data.leakageOpeningOverride
      : existing.leakageOpening;

  if (data.factoryBagsFromLeakage > leakageOpening) {
    return {
      ok: false,
      error: `Only ${leakageOpening} bags are available in the leakage pile to rebag.`,
    };
  }

  const prodTotal = data.production.reduce((s, p) => s + p.bags, 0);
  const driverBagsTotal = data.driverSales.reduce((s, d) => s + d.bags, 0);
  const driverBonusBagsTotal = data.driverSales.reduce((s, d) => s + d.bonusBags, 0);
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

  const canEditFactoryPrice = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const factoryPricePerBag = canEditFactoryPrice ? data.factoryPricePerBag : fixedPricing.factoryPricePerBag;
  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const truckCustomerById = new Map(truckCustomers.map((c) => [c.id, c]));

  await prisma.$transaction(async (tx) => {
    await tx.productionLine.deleteMany({ where: { dailyRecordId: id } });
    await tx.driverSale.deleteMany({ where: { dailyRecordId: id } });
    await tx.truckDelivery.deleteMany({ where: { dailyRecordId: id } });
    await tx.expenseItem.deleteMany({ where: { dailyRecordId: id } });

    await tx.dailyRecord.update({
      where: { id },
      data: {
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
              bonusBags: d.bonusBags,
            };
          }),
        },
        truckDeliveries: {
          create: data.truckDeliveries.map((t) => {
            const customer = truckCustomerById.get(t.customerId);
            return {
              customerId: t.customerId,
              bags: t.bags,
              pricePerBag: customer?.pricePerBag ?? 0,
              ownTruck: t.ownTruck,
              fuelCost: t.ownTruck ? t.fuelCost : 0,
              hiredCost: t.ownTruck ? 0 : t.hiredCost,
            };
          }),
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

    if (existing.status === "APPROVED") {
      await cascadeRecalculate(tx, existing.date, closing, leakageClosing);
    }
  }, { timeout: 20000 });

  await logActivity(`${user.name} edited the daily record for ${existing.date}.`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface DeleteDailyRecordResult {
  ok: boolean;
  error?: string;
}

export async function deleteDailyRecord(id: string): Promise<DeleteDailyRecordResult> {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const existing = await prisma.dailyRecord.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Daily record not found." };
  }

  await prisma.$transaction(
    async (tx) => {
      if (existing.status === "APPROVED") {
        const prev = await tx.dailyRecord.findFirst({
          where: { status: "APPROVED", date: { lt: existing.date } },
          orderBy: { date: "desc" },
        });
        const startingClosing = prev?.closingStock ?? 0;
        const startingLeakageClosing = prev?.leakageClosing ?? 0;

        await tx.dailyRecord.delete({ where: { id } });
        await cascadeRecalculate(tx, existing.date, startingClosing, startingLeakageClosing);
      } else {
        await tx.dailyRecord.delete({ where: { id } });
      }
    },
    { timeout: 20000 }
  );

  await logActivity(`${user.name} deleted the daily record for ${existing.date}.`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
