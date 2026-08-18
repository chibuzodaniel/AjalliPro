"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth-helpers";
import { needsApproval, isApprover } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { notifyDailyRecordApprovers } from "@/lib/push";
import { dailyRecordSchema, dailyRecordEditSchema } from "@/lib/validation/daily-record";
import { latestClosingStock, latestLeakageClosing, computeClosingStock, computeLeakageClosing } from "@/lib/stock";
import { getPricingSettings } from "@/lib/settings";
import {
  dailyRecordInclude,
  recordProdTotal,
  recordDriverBagsTotal,
  recordDriverBonusBagsTotal,
  recordTruckDeliveryBagsTotal,
  recordTruckDeliveryBonusBagsTotal,
} from "@/lib/records";

function buildLoadingFeeExpenses(
  driverSales: { driverId: string; bags: number }[],
  driverById: Map<string, { name: string; loadingFee: number }>
) {
  const expenses: { description: string; amount: number; paid: boolean; paidAt: null; paidById: null }[] = [];
  for (const d of driverSales) {
    if (d.bags <= 0) continue;
    const driver = driverById.get(d.driverId);
    if (!driver || driver.loadingFee <= 0) continue;
    expenses.push({
      description: `Loading fee — ${driver.name}`,
      amount: d.bags * driver.loadingFee,
      paid: false,
      paidAt: null,
      paidById: null,
    });
  }
  return expenses;
}

export interface CreateDailyRecordResult {
  ok: boolean;
  error?: string;
}

export async function createDailyRecord(input: unknown): Promise<CreateDailyRecordResult> {
  const user = await requireRole([
    "SALES_STAFF",
    // "EDITOR", // disabled for now
    "ADMIN_STAFF",
    "ADMIN",
    "SUPER_ADMIN",
  ]);
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

  if (data.factoryBagsFromLeakage + data.leakageWasteBags > leakageOpening) {
    return {
      ok: false,
      error: `Only ${leakageOpening} bags are available in the leakage pile to rebag or waste.`,
    };
  }

  const prodTotal = data.production.reduce((s, p) => s + p.bags, 0);
  const driverBagsTotal = data.driverSales.reduce((s, d) => s + d.bags, 0);
  const driverBonusBagsTotal = data.driverSales.reduce((s, d) => s + d.bonusBags, 0);
  const truckDeliveryBagsTotal = data.truckDeliveries.reduce((s, t) => s + t.bags, 0);
  const truckDeliveryBonusBagsTotal = data.truckDeliveries.reduce((s, t) => s + t.bonusBags, 0);

  const closing = computeClosingStock({
    opening,
    prodTotal,
    factoryBags: data.factoryBags,
    factoryBagsFromLeakage: data.factoryBagsFromLeakage,
    driverBagsTotal,
    driverBonusBagsTotal,
    truckDeliveryBagsTotal,
    truckDeliveryBonusBagsTotal,
    leakageBagsNew: data.leakageBags,
  });
  const leakageClosing = computeLeakageClosing(
    leakageOpening,
    data.leakageBags,
    data.factoryBagsFromLeakage,
    data.leakageWasteBags
  );
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
        leakageWasteBags: data.leakageWasteBags,
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
              bonusBags: t.bonusBags,
              pricePerBag: customer?.pricePerBag ?? 0,
              ownTruck: t.ownTruck,
              fuelCost: t.ownTruck ? t.fuelCost : 0,
              hiredCost: t.ownTruck ? 0 : t.hiredCost,
            };
          }),
        },
        expenseItems: {
          create: [
            ...data.expenses.map((e) => ({
              description: e.description,
              amount: e.amount,
              paid: e.paid,
              paidAt: e.paid ? new Date() : null,
              paidById: e.paid ? user.id : null,
            })),
            ...buildLoadingFeeExpenses(data.driverSales, driverById),
          ],
        },
      },
    });

    await logActivity(
      `${user.name} logged the daily record for ${record.date} (${pending ? "pending" : "approved"}).`,
      user.id
    );
    if (pending) {
      await notifyDailyRecordApprovers(
        {
          title: "New daily record awaiting approval",
          body: `${user.name} logged the record for ${record.date}.`,
          url: "/approvals",
        },
        user.id
      );
    }
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
  startingLeakageClosing: number,
  excludeId?: string
) {
  const forward = await tx.dailyRecord.findMany({
    where: { status: "APPROVED", date: { gt: fromDate } },
    include: dailyRecordInclude,
    orderBy: { date: "asc" },
  });

  let runningClosing = startingClosingStock;
  let runningLeakageClosing = startingLeakageClosing;

  for (const rec of forward) {
    if (rec.id === excludeId) {
      // Its opening/closing were already set explicitly (e.g. a Super Admin override) —
      // don't recompute it, just carry its already-saved closing forward.
      runningClosing = rec.closingStock;
      runningLeakageClosing = rec.leakageClosing;
      continue;
    }
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
      truckDeliveryBonusBagsTotal: recordTruckDeliveryBonusBagsTotal(rec),
      leakageBagsNew: rec.leakageBags,
    });
    const leakageClosing = computeLeakageClosing(leakageOpening, rec.leakageBags, rec.factoryBagsFromLeakage, rec.leakageWasteBags);

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

  const dateChanged = data.date !== existing.date;
  if (dateChanged) {
    const conflict = await prisma.dailyRecord.findUnique({ where: { date: data.date } });
    if (conflict && conflict.id !== id) {
      return { ok: false, error: `A daily record for ${data.date} already exists.` };
    }
  }

  const [fixedPricing, drivers, truckCustomers, prevApprovedForNewDate] = await Promise.all([
    getPricingSettings(),
    prisma.driver.findMany({ where: { id: { in: data.driverSales.map((d) => d.driverId) } } }),
    prisma.customer.findMany({
      where: { id: { in: data.truckDeliveries.map((t) => t.customerId) } },
    }),
    dateChanged
      ? prisma.dailyRecord.findFirst({
          where: { status: "APPROVED", date: { lt: data.date }, id: { not: id } },
          orderBy: { date: "desc" },
        })
      : Promise.resolve(null),
  ]);

  const overrideApplied =
    user.role === "SUPER_ADMIN" && (data.openingStockOverride != null || data.leakageOpeningOverride != null);
  const opening =
    user.role === "SUPER_ADMIN" && data.openingStockOverride != null
      ? data.openingStockOverride
      : dateChanged
        ? (prevApprovedForNewDate?.closingStock ?? 0)
        : existing.openingStock;
  const leakageOpening =
    user.role === "SUPER_ADMIN" && data.leakageOpeningOverride != null
      ? data.leakageOpeningOverride
      : dateChanged
        ? (prevApprovedForNewDate?.leakageClosing ?? 0)
        : existing.leakageOpening;

  if (data.factoryBagsFromLeakage + data.leakageWasteBags > leakageOpening) {
    return {
      ok: false,
      error: `Only ${leakageOpening} bags are available in the leakage pile to rebag or waste.`,
    };
  }

  const prodTotal = data.production.reduce((s, p) => s + p.bags, 0);
  const driverBagsTotal = data.driverSales.reduce((s, d) => s + d.bags, 0);
  const driverBonusBagsTotal = data.driverSales.reduce((s, d) => s + d.bonusBags, 0);
  const truckDeliveryBagsTotal = data.truckDeliveries.reduce((s, t) => s + t.bags, 0);
  const truckDeliveryBonusBagsTotal = data.truckDeliveries.reduce((s, t) => s + t.bonusBags, 0);

  const closing = computeClosingStock({
    opening,
    prodTotal,
    factoryBags: data.factoryBags,
    factoryBagsFromLeakage: data.factoryBagsFromLeakage,
    driverBagsTotal,
    driverBonusBagsTotal,
    truckDeliveryBagsTotal,
    truckDeliveryBonusBagsTotal,
    leakageBagsNew: data.leakageBags,
  });
  const leakageClosing = computeLeakageClosing(
    leakageOpening,
    data.leakageBags,
    data.factoryBagsFromLeakage,
    data.leakageWasteBags
  );

  const canEditFactoryPrice = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const factoryPricePerBag = canEditFactoryPrice ? data.factoryPricePerBag : fixedPricing.factoryPricePerBag;
  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const truckCustomerById = new Map(truckCustomers.map((c) => [c.id, c]));

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.productionLine.deleteMany({ where: { dailyRecordId: id } });
        await tx.driverSale.deleteMany({ where: { dailyRecordId: id } });
        await tx.truckDelivery.deleteMany({ where: { dailyRecordId: id } });
        await tx.expenseItem.deleteMany({ where: { dailyRecordId: id } });

        await tx.dailyRecord.update({
          where: { id },
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
            leakageWasteBags: data.leakageWasteBags,
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
                  bonusBags: t.bonusBags,
                  pricePerBag: customer?.pricePerBag ?? 0,
                  ownTruck: t.ownTruck,
                  fuelCost: t.ownTruck ? t.fuelCost : 0,
                  hiredCost: t.ownTruck ? 0 : t.hiredCost,
                };
              }),
            },
            expenseItems: {
              create: [
                ...data.expenses.map((e) => ({
                  description: e.description,
                  amount: e.amount,
                  paid: e.paid,
                  paidAt: e.paid ? new Date() : null,
                  paidById: e.paid ? user.id : null,
                })),
                ...buildLoadingFeeExpenses(data.driverSales, driverById),
              ],
            },
          },
        });

        if (existing.status === "APPROVED") {
          if (dateChanged) {
            const boundaryDate = existing.date < data.date ? existing.date : data.date;
            const anchor = await tx.dailyRecord.findFirst({
              where: { status: "APPROVED", date: { lt: boundaryDate }, id: { not: id } },
              orderBy: { date: "desc" },
            });
            await cascadeRecalculate(
              tx,
              anchor?.date ?? "",
              anchor?.closingStock ?? 0,
              anchor?.leakageClosing ?? 0,
              overrideApplied ? id : undefined
            );
          } else {
            await cascadeRecalculate(tx, existing.date, closing, leakageClosing);
          }
        }
      },
      { timeout: 20000 }
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: `A daily record for ${data.date} already exists.` };
    }
    throw e;
  }

  await logActivity(
    dateChanged
      ? `${user.name} edited the daily record and moved its date from ${existing.date} to ${data.date}.`
      : `${user.name} edited the daily record for ${existing.date}.`,
    user.id
  );
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
