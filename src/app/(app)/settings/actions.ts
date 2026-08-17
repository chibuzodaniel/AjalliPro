"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { SUPER_ADMIN_EMAIL } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { weeklyIncentiveSettingsSchema } from "@/lib/validation/weekly-incentive";
import { emailTemplateSettingsSchema } from "@/lib/validation/email-template";
import { pricingSettingsSchema } from "@/lib/validation/pricing";
import { saveWeeklyIncentiveSettings, saveEmailTemplateSettings, savePricingSettings } from "@/lib/settings";

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
