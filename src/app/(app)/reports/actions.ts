"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSafe } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { saveDailyReportSmsPhones, getDailyReportSmsPhones } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { dailyRecordInclude } from "@/lib/records";
import { buildDailyReportSmsText } from "@/lib/dailyReport";
import { isSmsConfigured, sendSms } from "@/lib/sms";

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

export async function sendDailyReportSmsNow(recordId: string): Promise<SaveDailyReportSmsPhonesResult> {
  const guard = await requireRoleSafe(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = guard.user;

  if (!isSmsConfigured()) return { ok: false, error: "SMS isn't configured yet." };

  const record = await prisma.dailyRecord.findUnique({ where: { id: recordId }, include: dailyRecordInclude });
  if (!record) return { ok: false, error: "Record not found." };

  const phones = await getDailyReportSmsPhones();
  if (phones.length === 0) return { ok: false, error: "No SMS numbers configured — add one on the Reports page." };

  const text = buildDailyReportSmsText(record);
  let sent = 0;
  for (const phone of phones) {
    try {
      await sendSms(phone, text);
      sent++;
    } catch (err) {
      console.error(`Failed to send daily report SMS to ${phone}:`, err);
    }
  }
  if (sent === 0) return { ok: false, error: "Could not send to any number — check the SMS provider logs." };

  await logActivity(`${admin.name} manually resent the daily report SMS for ${record.date}.`, admin.id);
  return { ok: true };
}
