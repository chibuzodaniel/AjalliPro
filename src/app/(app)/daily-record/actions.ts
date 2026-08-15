"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { needsApproval } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { dailyRecordSchema } from "@/lib/validation/daily-record";
import { latestClosingStock, computeClosingStock } from "@/lib/stock";

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

  const computedOpening = await latestClosingStock();
  const opening =
    user.role === "SUPER_ADMIN" && data.openingStockOverride != null ? data.openingStockOverride : computedOpening;
  const prodTotal = data.production.reduce((s, p) => s + p.bags, 0);
  const driverBagsTotal = data.driverSales.reduce((s, d) => s + d.bags, 0);
  const closing = computeClosingStock(opening, prodTotal, data.factoryBags, driverBagsTotal, data.leakageBags);
  const pending = needsApproval(user.role);

  try {
    const record = await prisma.dailyRecord.create({
      data: {
        date: data.date,
        openingStock: opening,
        closingStock: closing,
        factoryBags: data.factoryBags,
        factoryPricePerBag: data.factoryPricePerBag,
        factoryCustomerId: data.factoryCustomerId || null,
        pumpWaterAmount: data.pumpWaterAmount,
        leakageBags: data.leakageBags,
        status: pending ? "PENDING" : "APPROVED",
        createdById: user.id,
        createdByRole: user.role,
        approvedById: pending ? null : user.id,
        productionLines: {
          create: data.production.map((p) => ({ packerName: p.packerName, bags: p.bags })),
        },
        driverSales: {
          create: data.driverSales.map((d) => ({
            driverId: d.driverId,
            bags: d.bags,
            pricePerBag: d.pricePerBag,
            loadingFee: d.loadingFee,
            customerId: d.customerId || null,
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
