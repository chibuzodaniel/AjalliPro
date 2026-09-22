"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSafe } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { saveDailyReportSmsPhone } from "@/lib/settings";

export interface SaveDailyReportSmsPhoneResult {
  ok: boolean;
  error?: string;
}

export async function updateDailyReportSmsPhone(phoneNumber: string): Promise<SaveDailyReportSmsPhoneResult> {
  const guard = await requireRoleSafe(["SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = guard.user;

  const trimmed = phoneNumber.trim();
  if (trimmed) {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      return { ok: false, error: "That doesn't look like a valid phone number." };
    }
  }

  await saveDailyReportSmsPhone(trimmed || null);
  await logActivity(
    trimmed
      ? `${admin.name} set the daily report SMS number to ${trimmed}.`
      : `${admin.name} removed the daily report SMS number.`,
    admin.id
  );
  revalidatePath("/reports");
  return { ok: true };
}
