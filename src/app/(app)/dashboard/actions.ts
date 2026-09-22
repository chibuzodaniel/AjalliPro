"use server";

import { prisma } from "@/lib/prisma";
import { requireRoleSafe } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { isSmsConfigured, sendSms } from "@/lib/sms";
import { timeOfDayGreeting } from "@/lib/greeting";
import { announcementSchema } from "@/lib/validation/announcement";

export interface AnnouncementResult {
  ok: boolean;
  sent: number;
  failed: number;
  skipped: number;
  error?: string;
}

type Recipient = { name: string; phone: string | null };

const AUDIENCE_LABEL: Record<string, string> = {
  STAFF: "Staff",
  DRIVERS: "Drivers",
  CUSTOMERS: "Customers",
  PACKERS: "Packers",
  INDIVIDUAL: "an individual",
};

async function fetchAudience(audience: "STAFF" | "DRIVERS" | "CUSTOMERS" | "PACKERS"): Promise<Recipient[]> {
  switch (audience) {
    case "STAFF":
      return prisma.user.findMany({ select: { name: true, phone: true } });
    case "DRIVERS":
      return prisma.driver.findMany({ select: { name: true, phone: true } });
    case "CUSTOMERS":
      return prisma.customer.findMany({ select: { name: true, phone: true } });
    case "PACKERS":
      return prisma.packer.findMany({ select: { name: true, phone: true } });
  }
}

async function fetchOne(
  type: "STAFF" | "DRIVER" | "CUSTOMER" | "PACKER",
  id: string
): Promise<Recipient | null> {
  switch (type) {
    case "STAFF":
      return prisma.user.findUnique({ where: { id }, select: { name: true, phone: true } });
    case "DRIVER":
      return prisma.driver.findUnique({ where: { id }, select: { name: true, phone: true } });
    case "CUSTOMER":
      return prisma.customer.findUnique({ where: { id }, select: { name: true, phone: true } });
    case "PACKER":
      return prisma.packer.findUnique({ where: { id }, select: { name: true, phone: true } });
  }
}

function personalize(message: string, recipientName: string): string {
  return message
    .replace(/\{\{\s*name\s*\}\}/gi, recipientName)
    .replace(/\{\{\s*greetings?\s*\}\}/gi, timeOfDayGreeting());
}

/**
 * Broadcasts (or sends one-off, via audience "INDIVIDUAL") an SMS to a
 * filtered group — Staff, Drivers, Customers, Packers, or a single picked
 * person across any of those. {{name}} and {{greeting}} are personalized
 * per recipient, not just once for the whole batch.
 */
export async function sendAnnouncement(input: unknown): Promise<AnnouncementResult> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, sent: 0, failed: 0, skipped: 0, error: guard.error };
  const admin = guard.user;

  if (!isSmsConfigured()) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: "SMS isn't configured yet — set BULKSMSNIGERIA_API_TOKEN and BULKSMSNIGERIA_SENDER_ID in .env first.",
    };
  }

  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, sent: 0, failed: 0, skipped: 0, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { audience, individualType, individualId, message } = parsed.data;

  let recipients: Recipient[];
  if (audience === "INDIVIDUAL") {
    if (!individualType || !individualId) {
      return { ok: false, sent: 0, failed: 0, skipped: 0, error: "Pick who this should go to." };
    }
    const one = await fetchOne(individualType, individualId);
    if (!one) return { ok: false, sent: 0, failed: 0, skipped: 0, error: "Recipient not found." };
    recipients = [one];
  } else {
    recipients = await fetchAudience(audience);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const r of recipients) {
    if (!r.phone) {
      skipped++;
      continue;
    }
    try {
      await sendSms(r.phone, personalize(message, r.name));
      sent++;
    } catch {
      failed++;
    }
  }

  await logActivity(
    `${admin.name} sent an announcement to ${AUDIENCE_LABEL[audience]} (${sent} sent${failed ? `, ${failed} failed` : ""}${skipped ? `, ${skipped} skipped` : ""}).`,
    admin.id
  );

  return { ok: true, sent, failed, skipped };
}
