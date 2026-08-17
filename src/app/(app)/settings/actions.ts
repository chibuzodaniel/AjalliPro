"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
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
