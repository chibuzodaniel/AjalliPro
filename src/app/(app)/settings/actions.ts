"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { SUPER_ADMIN_EMAIL } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { sendPushToUsers } from "@/lib/push";
import { weeklyIncentiveSettingsSchema } from "@/lib/validation/weekly-incentive";
import { emailTemplateSettingsSchema } from "@/lib/validation/email-template";
import { pricingSettingsSchema, packerPriceSettingSchema } from "@/lib/validation/pricing";
import {
  saveWeeklyIncentiveSettings,
  saveEmailTemplateSettings,
  savePricingSettings,
  savePackerPriceSetting,
} from "@/lib/settings";

export interface UpdateWeeklyIncentiveResult {
  ok: boolean;
  error?: string;
}

export async function updateWeeklyIncentiveSettings(input: unknown): Promise<UpdateWeeklyIncentiveResult> {
  const user = await requireRole(["SUPER_ADMIN"]);
  const parsed = weeklyIncentiveSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid values" };
  }

  await saveWeeklyIncentiveSettings(parsed.data);
  await logActivity(
    `${user.name} updated the weekly incentive thresholds (customers: ${parsed.data.customerWeeklyThreshold}+ bags → +${parsed.data.customerWeeklyBonus}, drivers: ${parsed.data.driverWeeklyThreshold}+ bags → +${parsed.data.driverWeeklyBonus}).`,
    user.id
  );
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface UpdateEmailTemplateResult {
  ok: boolean;
  error?: string;
}

export async function updateEmailTemplate(input: unknown): Promise<UpdateEmailTemplateResult> {
  const user = await requireRole(["SUPER_ADMIN"]);
  const parsed = emailTemplateSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid values" };
  }

  await saveEmailTemplateSettings(parsed.data);
  await logActivity(`${user.name} updated the weekly customer mail template.`, user.id);
  revalidatePath("/settings");
  return { ok: true };
}

export interface SetDailyRecordApproverResult {
  ok: boolean;
  error?: string;
}

export async function setDailyRecordApprover(userId: string, value: boolean): Promise<SetDailyRecordApproverResult> {
  const admin = await requireRole(["SUPER_ADMIN"]);
  const target = await prisma.user.update({ where: { id: userId }, data: { dailyRecordApprover: value } });
  await logActivity(
    `${admin.name} ${value ? "assigned" : "unassigned"} "${target.name}" ${value ? "to" : "from"} daily record approval notifications.`,
    admin.id
  );
  await sendPushToUsers([userId], {
    title: value ? "You can now approve daily records" : "Daily record approval access removed",
    body: value
      ? `${admin.name} assigned you to approve and get notified about daily records.`
      : `${admin.name} removed your daily record approval access.`,
    url: "/approvals",
  });
  revalidatePath("/settings");
  return { ok: true };
}

export interface PromoteSuperAdminResult {
  ok: boolean;
  error?: string;
}

/** Any current Super Admin can promote another user to Super Admin. */
export async function promoteSuperAdmin(userId: string): Promise<PromoteSuperAdminResult> {
  const admin = await requireRole(["SUPER_ADMIN"]);
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found" };
  if (target.role === "SUPER_ADMIN") return { ok: false, error: "Already a Super Admin" };

  await prisma.user.update({ where: { id: userId }, data: { role: "SUPER_ADMIN" } });
  await logActivity(`${admin.name} promoted "${target.name}" to Super Admin.`, admin.id);
  await sendPushToUsers([userId], {
    title: "You're now a Super Admin",
    body: `${admin.name} gave you full Super Admin access.`,
    url: "/settings",
  });
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Revoking Super Admin is restricted to the primary Super Admin account
 * (SUPER_ADMIN_EMAIL) — any other Super Admin, including ones promoted via
 * promoteSuperAdmin above, cannot strip another Super Admin's rights.
 */
export async function revokeSuperAdmin(userId: string): Promise<PromoteSuperAdminResult> {
  const admin = await requireRole(["SUPER_ADMIN"]);
  if ((admin.email ?? "").toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return { ok: false, error: "Only the primary Super Admin can revoke Super Admin rights." };
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found" };
  if (target.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return { ok: false, error: "This is the primary Super Admin account and can't be revoked." };
  }
  if (target.role !== "SUPER_ADMIN") return { ok: false, error: "This user isn't a Super Admin" };

  await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
  await logActivity(`${admin.name} revoked Super Admin rights from "${target.name}" (now Admin).`, admin.id);
  await sendPushToUsers([userId], {
    title: "Super Admin rights revoked",
    body: `${admin.name} revoked your Super Admin rights. You're now an Admin.`,
    url: "/settings",
  });
  revalidatePath("/settings");
  return { ok: true };
}

export interface DeleteUserResult {
  ok: boolean;
  error?: string;
}

/**
 * Only removes accounts with no recorded activity — anyone who has ever
 * created/approved a daily record or driver, added a customer, or marked an
 * expense paid can't be deleted, since their id is referenced all over the
 * data those actions produced. Mirrors the same "can't delete, has X" guard
 * used for drivers/customers.
 */
export async function deleteUser(userId: string): Promise<DeleteUserResult> {
  const admin = await requireRole(["SUPER_ADMIN"]);
  if (userId === admin.id) {
    return { ok: false, error: "You can't delete your own account." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found" };
  if (target.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return { ok: false, error: "This is the primary Super Admin account and can't be deleted." };
  }

  const [recordsCreated, recordsApproved, driversCreated, driversApproved, customersCreated, expensesMarkedPaid] =
    await Promise.all([
      prisma.dailyRecord.count({ where: { createdById: userId } }),
      prisma.dailyRecord.count({ where: { approvedById: userId } }),
      prisma.driver.count({ where: { createdById: userId } }),
      prisma.driver.count({ where: { approvedById: userId } }),
      prisma.customer.count({ where: { createdById: userId } }),
      prisma.expenseItem.count({ where: { paidById: userId } }),
    ]);
  const activityCount =
    recordsCreated + recordsApproved + driversCreated + driversApproved + customersCreated + expensesMarkedPaid;
  if (activityCount > 0) {
    return {
      ok: false,
      error: `Can't delete "${target.name}" — this account has ${activityCount} recorded action${
        activityCount === 1 ? "" : "s"
      } (records, drivers, customers, or expenses) tied to it.`,
    };
  }

  await prisma.activityLog.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await logActivity(`${admin.name} deleted the unused account "${target.name}" (${target.email}).`, admin.id);
  revalidatePath("/settings");
  return { ok: true };
}

export interface UpdatePricingResult {
  ok: boolean;
  error?: string;
}

export async function updatePricingSettings(input: unknown): Promise<UpdatePricingResult> {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const parsed = pricingSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid value" };
  }

  await savePricingSettings(parsed.data);
  await logActivity(`${user.name} set the factory sale price to ₦${parsed.data.factoryPricePerBag}/bag.`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updatePackerPriceSetting(input: unknown): Promise<UpdatePricingResult> {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const parsed = packerPriceSettingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid value" };
  }

  await savePackerPriceSetting(parsed.data.packerPricePerBag);
  await logActivity(`${user.name} set the packer pay rate to ₦${parsed.data.packerPricePerBag}/bag.`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface ResetPreviewCounts {
  dailyRecords: number;
  drivers: number;
  customers: number;
  packers: number;
  expenses: number;
  activityLogs: number;
}

/** Only the primary Super Admin sees this — used to show what a reset would delete before they confirm. */
export async function getResetPreviewCounts(): Promise<ResetPreviewCounts> {
  const user = await requireRole(["SUPER_ADMIN"]);
  if ((user.email ?? "").toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return { dailyRecords: 0, drivers: 0, customers: 0, packers: 0, expenses: 0, activityLogs: 0 };
  }
  const [dailyRecords, drivers, customers, packers, expenses, activityLogs] = await Promise.all([
    prisma.dailyRecord.count(),
    prisma.driver.count(),
    prisma.customer.count(),
    prisma.packer.count(),
    prisma.expenseItem.count(),
    prisma.activityLog.count(),
  ]);
  return { dailyRecords, drivers, customers, packers, expenses, activityLogs };
}

export interface ResetSelection {
  dailyRecords: boolean;
  expenses: boolean;
  drivers: boolean;
  customers: boolean;
  packers: boolean;
  settings: boolean;
  activityLog: boolean;
}

export interface ResetAllDataResult {
  ok: boolean;
  error?: string;
}

const RESET_CONFIRM_PHRASE = "RESET ALL DATA";

const RESET_LABELS: Record<keyof ResetSelection, string> = {
  dailyRecords: "daily records (production, sales, deliveries, expenses, leakages)",
  expenses: "expense line items",
  drivers: "drivers",
  customers: "customers",
  packers: "packers",
  settings: "settings (pricing, incentive thresholds, email template)",
  activityLog: "the activity log",
};

/**
 * Selective (or full) factory reset. The caller picks exactly which
 * categories to clear; "reset everything" is just every category selected
 * at once. User accounts are never touched, including the caller's own.
 * Restricted to the primary Super Admin (SUPER_ADMIN_EMAIL) specifically —
 * the same bar as revoking another Super Admin — since this is far more
 * destructive and there's no undo. The caller must also send the exact
 * confirmation phrase shown in the UI, checked again here so this can't be
 * triggered by a stray request.
 *
 * Daily records are the root of most foreign keys here (driver sales,
 * production lines, truck deliveries, expenses all cascade from them), so
 * clearing daily records first unblocks clearing drivers/customers/packers
 * in the same request. If daily records are NOT included, those categories
 * are only safe to clear once nothing still references them — checked below
 * with the same guards used by their individual delete buttons.
 */
export async function resetSelectedData(selection: ResetSelection, confirmPhrase: string): Promise<ResetAllDataResult> {
  const user = await requireRole(["SUPER_ADMIN"]);
  if ((user.email ?? "").toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return { ok: false, error: "Only the primary Super Admin can reset the system." };
  }
  if (confirmPhrase !== RESET_CONFIRM_PHRASE) {
    return { ok: false, error: `Type "${RESET_CONFIRM_PHRASE}" exactly to confirm.` };
  }
  const chosen = (Object.keys(selection) as (keyof ResetSelection)[]).filter((k) => selection[k]);
  if (chosen.length === 0) {
    return { ok: false, error: "Select at least one thing to reset." };
  }

  if (selection.drivers && !selection.dailyRecords) {
    const salesCount = await prisma.driverSale.count();
    if (salesCount > 0) {
      return {
        ok: false,
        error: `Can't reset drivers — ${salesCount} recorded sale${salesCount === 1 ? "" : "s"} still reference them. Also reset daily records, or clear those first.`,
      };
    }
  }
  if (selection.customers && !selection.dailyRecords) {
    const [factorySales, driverSales, truckDeliveries] = await Promise.all([
      prisma.dailyRecord.count({ where: { factoryCustomerId: { not: null } } }),
      prisma.driverSale.count({ where: { customerId: { not: null } } }),
      prisma.truckDelivery.count({ where: { customerId: { not: null } } }),
    ]);
    const linked = factorySales + driverSales + truckDeliveries;
    if (linked > 0) {
      return {
        ok: false,
        error: `Can't reset customers — linked to ${linked} sale${linked === 1 ? "" : "s"}. Also reset daily records, or clear those first.`,
      };
    }
  }
  if (selection.packers && !selection.dailyRecords) {
    const linesCount = await prisma.productionLine.count();
    if (linesCount > 0) {
      return {
        ok: false,
        error: `Can't reset packers — ${linesCount} recorded production line${linesCount === 1 ? "" : "s"} still reference them. Also reset daily records, or clear those first.`,
      };
    }
  }

  await prisma.$transaction(
    async (tx) => {
      if (selection.customers) await tx.mailLog.deleteMany({});
      if (selection.expenses) await tx.expenseItem.deleteMany({});
      if (selection.dailyRecords) await tx.dailyRecord.deleteMany({}); // cascades production lines, driver sales, truck deliveries, expenses
      if (selection.drivers) await tx.driver.deleteMany({});
      if (selection.customers) await tx.customer.deleteMany({});
      if (selection.packers) await tx.packer.deleteMany({});
      if (selection.settings) {
        await tx.incentiveTier.deleteMany({});
        await tx.pricingSetting.deleteMany({});
        await tx.weeklyIncentiveSetting.deleteMany({});
        await tx.emailTemplateSetting.deleteMany({});
      }
      if (selection.activityLog) await tx.activityLog.deleteMany({});
    },
    { timeout: 30000 }
  );

  const summary = chosen.map((k) => RESET_LABELS[k]).join(", ");
  await logActivity(`${user.name} reset: ${summary}.`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
