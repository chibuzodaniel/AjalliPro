"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { incentiveTiersSchema } from "@/lib/validation/incentive-tier";
import { weeklyIncentiveSettingsSchema } from "@/lib/validation/weekly-incentive";
import { emailTemplateSettingsSchema } from "@/lib/validation/email-template";
import { saveWeeklyIncentiveSettings, saveEmailTemplateSettings } from "@/lib/settings";

export interface UpdateTiersResult {
  ok: boolean;
  error?: string;
}

export async function updateIncentiveTiers(input: unknown): Promise<UpdateTiersResult> {
  const user = await requireRole(["SUPER_ADMIN"]);
  const parsed = incentiveTiersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tiers" };
  }

  await prisma.$transaction([
    prisma.incentiveTier.deleteMany({}),
    prisma.incentiveTier.createMany({ data: parsed.data }),
  ]);

  await logActivity(`${user.name} updated the customer incentive tier table.`, user.id);
  revalidatePath("/settings");
  return { ok: true };
}

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
