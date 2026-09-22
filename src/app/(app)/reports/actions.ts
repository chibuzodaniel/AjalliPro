"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSafe } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { saveDailyReportSmsPhones } from "@/lib/settings";

export interface SaveDailyReportSmsPhonesResult {
  ok: boolean;
  error?: string;
}

export async function updateDailyReportSmsPhones(phoneNumbers: string[]): Promise<SaveDailyReportSmsPhonesResult> {
  const guard = await requireRoleSafe(["SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = guard.user;

  const cleaned = phoneNumbers.map((p) => p.trim()).filter(Boolean);
  for (const phone of cleaned) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      return { ok: false, error: `"${phone}" doesn't look like a valid phone number.` };
    }
  }

  await saveDailyReportSmsPhones(cleaned);
  await logActivity(
    cleaned.length > 0
      ? `${admin.name} set the daily report SMS numbers to ${cleaned.join(", ")}.`
      : `${admin.name} removed all daily report SMS numbers.`,
    admin.id
  );
  revalidatePath("/reports");
  return { ok: true };
}
