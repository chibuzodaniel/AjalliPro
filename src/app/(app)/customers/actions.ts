"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRoleSafe } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { customerSchema, customerPricingSchema, customerSmsSchema } from "@/lib/validation/customer";
import { getApprovedRecordsSorted, getAllApprovedRecordsEverSorted } from "@/lib/records";
import { computeIncentiveData } from "@/lib/incentives";
import { currentWeekKey } from "@/lib/week";
import { getWeeklyIncentiveSettings, getEmailTemplateSettings } from "@/lib/settings";
import { isEmailConfigured, sendWeeklyCustomerEmail } from "@/lib/mail";
import { isSmsConfigured, sendWeeklyCustomerSms, sendSms } from "@/lib/sms";

export async function createCustomer(input: unknown) {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false as const, error: guard.error };
  const user = guard.user;
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      pricePerBag: parsed.data.pricePerBag,
      createdById: user.id,
    },
  });
  await logActivity(`${user.name} added customer "${customer.name}".`, user.id);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export interface UpdateCustomerPricingResult {
  ok: boolean;
  error?: string;
}

export async function updateCustomerPricing(id: string, input: unknown): Promise<UpdateCustomerPricingResult> {
  const guard = await requireRoleSafe(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;
  const parsed = customerPricingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const customer = await prisma.customer.update({
    where: { id },
    data: { pricePerBag: parsed.data.pricePerBag },
  });
  await logActivity(`${user.name} set "${customer.name}"'s price to ₦${parsed.data.pricePerBag}/bag.`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface DeleteCustomerResult {
  ok: boolean;
  error?: string;
}

export async function deleteCustomer(id: string): Promise<DeleteCustomerResult> {
  const guard = await requireRoleSafe(["SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return { ok: false, error: "Customer not found." };
  }

  const [factorySales, driverSales, truckDeliveries] = await Promise.all([
    prisma.dailyRecord.count({ where: { factoryCustomerId: id } }),
    prisma.driverSale.count({ where: { customerId: id } }),
    prisma.truckDelivery.count({ where: { customerId: id } }),
  ]);
  const linked = factorySales + driverSales + truckDeliveries;
  if (linked > 0) {
    return {
      ok: false,
      error: `Can't delete "${customer.name}" — linked to ${linked} sale${linked === 1 ? "" : "s"}. Remove or edit those daily records first.`,
    };
  }

  await prisma.mailLog.deleteMany({ where: { customerId: id } });
  await prisma.customer.delete({ where: { id } });
  await logActivity(`${user.name} deleted customer "${customer.name}".`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface SendCustomerSmsResult {
  ok: boolean;
  error?: string;
}

/** One-off SMS to a single customer's phone (via BulkSMSNigeria) — separate from the automated weekly summary. */
export async function sendCustomerSms(customerId: string, input: unknown): Promise<SendCustomerSmsResult> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;

  if (!isSmsConfigured()) {
    return {
      ok: false,
      error: "SMS isn't configured yet — set BULKSMSNIGERIA_API_TOKEN and BULKSMSNIGERIA_SENDER_ID in .env first.",
    };
  }

  const parsed = customerSmsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return { ok: false, error: "Customer not found." };
  }
  if (!customer.phone) {
    return { ok: false, error: `"${customer.name}" has no phone number on file.` };
  }

  try {
    await sendSms(customer.phone, parsed.data.message);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not send SMS" };
  }

  await logActivity(`${user.name} sent an SMS to "${customer.name}".`, user.id);
  return { ok: true };
}

export interface MailPreviewEntry {
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  weeklyBags: number;
  yearlyBags: number;
  qualifies: boolean;
}

async function computeWeeklyMailEntries() {
  const [customers, approvedRecords, allApprovedRecordsEver, weeklySettings] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    getApprovedRecordsSorted(),
    getAllApprovedRecordsEverSorted(),
    getWeeklyIncentiveSettings(),
  ]);
  // Weekly qualification reflects the current session; year-to-date keeps counting through an archive.
  const { customerWeekly } = computeIncentiveData(approvedRecords);
  const { customerYearly } = computeIncentiveData(allApprovedRecordsEver);
  const wk = currentWeekKey();
  const year = new Date().getFullYear();

  const entries = customers.map((c) => {
    const weeklyBags = customerWeekly.get(c.id)?.[wk] ?? 0;
    const yearlyBags = customerYearly.get(c.id)?.[year] ?? 0;
    return {
      customerId: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      weeklyBags,
      yearlyBags,
      qualifies: weeklyBags >= weeklySettings.customerWeeklyThreshold,
    };
  });

  return { entries, weeklySettings, weekKey: wk };
}

export async function generateWeeklyMailPreview(): Promise<MailPreviewEntry[]> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) throw new Error(guard.error);
  const { entries } = await computeWeeklyMailEntries();
  return entries;
}

export interface SendWeeklyMailResult {
  ok: boolean;
  sent: number;
  failed: number;
  smsSent: number;
  smsFailed: number;
  error?: string;
}

export async function sendWeeklyMailNow(): Promise<SendWeeklyMailResult> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, sent: 0, failed: 0, smsSent: 0, smsFailed: 0, error: guard.error };
  const user = guard.user;

  const emailOn = isEmailConfigured();
  const smsOn = isSmsConfigured();
  if (!emailOn && !smsOn) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      smsSent: 0,
      smsFailed: 0,
      error:
        "Neither email nor SMS is configured yet — set BREVO_API_KEY/BREVO_FROM_EMAIL and/or BULKSMSNIGERIA_API_TOKEN/BULKSMSNIGERIA_SENDER_ID in .env first.",
    };
  }

  const [{ entries, weeklySettings, weekKey }, template] = await Promise.all([
    computeWeeklyMailEntries(),
    getEmailTemplateSettings(),
  ]);

  let sent = 0;
  let failed = 0;
  let smsSent = 0;
  let smsFailed = 0;
  for (const entry of entries) {
    if (emailOn && entry.email) {
      try {
        await sendWeeklyCustomerEmail({
          to: entry.email,
          customerName: entry.name,
          weeklyBags: entry.weeklyBags,
          yearlyBags: entry.yearlyBags,
          qualifies: entry.qualifies,
          threshold: weeklySettings.customerWeeklyThreshold,
          bonus: weeklySettings.customerWeeklyBonus,
          weekKey,
          template,
        });
        await prisma.mailLog.create({ data: { customerId: entry.customerId, weekKey } });
        sent += 1;
      } catch {
        failed += 1;
      }
    }
    if (smsOn && entry.phone) {
      try {
        await sendWeeklyCustomerSms({
          to: entry.phone,
          customerName: entry.name,
          weeklyBags: entry.weeklyBags,
          yearlyBags: entry.yearlyBags,
          qualifies: entry.qualifies,
          threshold: weeklySettings.customerWeeklyThreshold,
          bonus: weeklySettings.customerWeeklyBonus,
        });
        smsSent += 1;
      } catch {
        smsFailed += 1;
      }
    }
  }

  await logActivity(
    `${user.name} sent the weekly customer mail (${sent} sent${failed ? `, ${failed} failed` : ""}) and SMS (${smsSent} sent${smsFailed ? `, ${smsFailed} failed` : ""}).`,
    user.id
  );
  revalidatePath("/customers");
  return { ok: true, sent, failed, smsSent, smsFailed };
}
