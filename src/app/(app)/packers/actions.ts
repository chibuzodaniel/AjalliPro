"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRoleSafe } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { packerPhoneSchema, packerSmsSchema } from "@/lib/validation/packer";
import { isSmsConfigured, sendSms, sendPackerPaidSms } from "@/lib/sms";
import { runWeeklyPackerPaySms } from "@/lib/packerPaySms";
import { getPackerTotalsMap } from "@/lib/packerPay";
import { formatMoney } from "@/lib/money";

export interface DeletePackerResult {
  ok: boolean;
  error?: string;
}

export async function deletePacker(id: string): Promise<DeletePackerResult> {
  const guard = await requireRoleSafe(["SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;
  const packer = await prisma.packer.findUnique({ where: { id } });
  if (!packer) {
    return { ok: false, error: "Packer not found." };
  }

  const linesCount = await prisma.productionLine.count({ where: { packerId: id } });
  if (linesCount > 0) {
    return {
      ok: false,
      error: `Can't delete "${packer.name}" — has ${linesCount} recorded production line${linesCount === 1 ? "" : "s"}. Remove those daily records first.`,
    };
  }

  await prisma.packer.delete({ where: { id } });
  await logActivity(`${user.name} deleted packer "${packer.name}".`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface SetPackerPhoneResult {
  ok: boolean;
  error?: string;
}

export async function setPackerPhone(id: string, input: unknown): Promise<SetPackerPhoneResult> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;

  const parsed = packerPhoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const packer = await prisma.packer.findUnique({ where: { id } });
  if (!packer) return { ok: false, error: "Packer not found." };

  await prisma.packer.update({ where: { id }, data: { phone: parsed.data.phone || null } });
  await logActivity(`${user.name} set "${packer.name}"'s phone number.`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface SendPackerSmsResult {
  ok: boolean;
  error?: string;
}

/** One-off SMS to a single packer's phone (via BulkSMSNigeria) — same pattern as the customer/driver "Send SMS" button. */
export async function sendPackerSms(packerId: string, input: unknown): Promise<SendPackerSmsResult> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;

  if (!isSmsConfigured()) {
    return {
      ok: false,
      error: "SMS isn't configured yet — set BULKSMSNIGERIA_API_TOKEN and BULKSMSNIGERIA_SENDER_ID in .env first.",
    };
  }

  const parsed = packerSmsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const packer = await prisma.packer.findUnique({ where: { id: packerId } });
  if (!packer) return { ok: false, error: "Packer not found." };
  if (!packer.phone) return { ok: false, error: `"${packer.name}" has no phone number on file.` };

  try {
    await sendSms(packer.phone, parsed.data.message);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not send SMS" };
  }

  await logActivity(`${user.name} sent an SMS to packer "${packer.name}".`, user.id);
  return { ok: true };
}

export interface SendWeeklyPackerPaySmsResult {
  ok: boolean;
  sent: number;
  failed: number;
  skipped: number;
  error?: string;
}

export async function sendWeeklyPackerPaySmsNow(): Promise<SendWeeklyPackerPaySmsResult> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, sent: 0, failed: 0, skipped: 0, error: guard.error };
  const user = guard.user;

  if (!isSmsConfigured()) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: "SMS isn't configured yet — set BULKSMSNIGERIA_API_TOKEN and BULKSMSNIGERIA_SENDER_ID in .env first.",
    };
  }

  const { sent, failed, skipped } = await runWeeklyPackerPaySms();
  await logActivity(
    `${user.name} sent the weekly packer pay SMS (${sent} sent${failed ? `, ${failed} failed` : ""}).`,
    user.id
  );
  revalidatePath("/packers");
  return { ok: true, sent, failed, skipped };
}

export interface PackerPaymentResult {
  ok: boolean;
  error?: string;
}

/**
 * Records a payment against a packer's running balance — the full amount
 * owing, or a partial amount (paying them in installments), your choice.
 * Each call adds one PackerPayment row and texts them that specific amount
 * paid. An SMS failure doesn't undo the recorded payment.
 */
export async function payPackerAmount(packerId: string, amount: number): Promise<PackerPaymentResult> {
  const guard = await requireRoleSafe(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = guard.user;

  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }

  const packer = await prisma.packer.findUnique({ where: { id: packerId } });
  if (!packer) return { ok: false, error: "Packer not found." };

  const totals = (await getPackerTotalsMap()).get(packerId) ?? { bags: 0, earned: 0, paid: 0, owing: 0 };
  if (totals.owing <= 0) {
    return { ok: false, error: `"${packer.name}" has nothing owing right now.` };
  }
  if (amount > totals.owing) {
    return { ok: false, error: `"${packer.name}" is only owed ${formatMoney(totals.owing)}.` };
  }

  await prisma.packerPayment.create({
    data: { packerId, amount, paidById: admin.id },
  });
  const label = amount === totals.owing ? "as paid" : "as partially paid";
  await logActivity(`${admin.name} marked "${packer.name}"'s pay (${formatMoney(amount)}) ${label}.`, admin.id);

  if (packer.phone && isSmsConfigured()) {
    try {
      await sendPackerPaidSms({ to: packer.phone, packerName: packer.name, amount });
    } catch {
      // Payment is already recorded — an SMS failure shouldn't undo it or block the admin's flow.
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Undoes the most recent payment for a packer — e.g. it was marked paid by mistake. */
export async function revertLastPackerPayment(packerId: string): Promise<PackerPaymentResult> {
  const guard = await requireRoleSafe(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = guard.user;

  const packer = await prisma.packer.findUnique({ where: { id: packerId } });
  if (!packer) return { ok: false, error: "Packer not found." };

  const last = await prisma.packerPayment.findFirst({
    where: { packerId },
    orderBy: { paidAt: "desc" },
  });
  if (!last) return { ok: false, error: `No payments recorded for "${packer.name}" yet.` };

  await prisma.packerPayment.delete({ where: { id: last.id } });
  await logActivity(
    `${admin.name} reverted "${packer.name}"'s last payment (${formatMoney(last.amount)}) — back to owing.`,
    admin.id
  );
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface PackerPaymentHistoryEntry {
  id: string;
  amount: number;
  paidAt: Date;
  paidByName: string;
}

export async function getPackerPaymentHistory(packerId: string): Promise<PackerPaymentHistoryEntry[]> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) throw new Error(guard.error);

  const payments = await prisma.packerPayment.findMany({
    where: { packerId },
    include: { paidBy: true },
    orderBy: { paidAt: "desc" },
  });
  return payments.map((p) => ({ id: p.id, amount: p.amount, paidAt: p.paidAt, paidByName: p.paidBy.name }));
}

export interface PackerProductionDay {
  date: string;
  bags: number;
  pricePerBag: number;
  amount: number;
}

/** Day-by-day breakdown behind a packer's running balance — shown when their name is clicked. */
export async function getPackerProductionBreakdown(packerId: string): Promise<PackerProductionDay[]> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) throw new Error(guard.error);

  const lines = await prisma.productionLine.findMany({
    where: { packerId, dailyRecord: { status: "APPROVED" } },
    include: { dailyRecord: { select: { date: true } } },
    orderBy: { dailyRecord: { date: "desc" } },
  });
  return lines.map((l) => ({
    date: l.dailyRecord.date,
    bags: l.bags,
    pricePerBag: l.pricePerBag,
    amount: l.bags * l.pricePerBag,
  }));
}
