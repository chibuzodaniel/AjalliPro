"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRoleSafe } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { isSmsConfigured, sendSms } from "@/lib/sms";
import { formatMoney } from "@/lib/money";
import { staffSalarySettingsSchema } from "@/lib/validation/salary";

export interface SalaryActionResult {
  ok: boolean;
  error?: string;
}

export async function setStaffSalarySettings(userId: string, input: unknown): Promise<SalaryActionResult> {
  const guard = await requireRoleSafe(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = guard.user;
  const parsed = staffSalarySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found" };

  await prisma.user.update({
    where: { id: userId },
    data: { salaryAmount: parsed.data.salaryAmount, phone: parsed.data.phone || null },
  });
  await logActivity(
    `${admin.name} set "${target.name}"'s salary to ₦${parsed.data.salaryAmount}/month.`,
    admin.id
  );
  revalidatePath("/salary");
  return { ok: true };
}

/** Marks the given month ('YYYY-MM') as paid for a staff member, and SMSes them if a phone/SMS is configured. */
export async function markSalaryPaid(userId: string, period: string): Promise<SalaryActionResult> {
  const guard = await requireRoleSafe(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = guard.user;

  if (!/^\d{4}-\d{2}$/.test(period)) {
    return { ok: false, error: "Invalid period" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found" };
  if (target.salaryAmount <= 0) {
    return { ok: false, error: `Set "${target.name}"'s salary amount first.` };
  }

  const existing = await prisma.salaryPayment.findUnique({
    where: { userId_period: { userId, period } },
  });
  if (existing) {
    return { ok: false, error: `"${target.name}"'s salary for ${period} is already marked paid.` };
  }

  await prisma.salaryPayment.create({
    data: { userId, period, amount: target.salaryAmount, paidById: admin.id },
  });
  await logActivity(
    `${admin.name} marked "${target.name}"'s salary (₦${target.salaryAmount}, ${period}) as paid.`,
    admin.id
  );

  if (target.phone && isSmsConfigured()) {
    try {
      await sendSms(
        target.phone,
        `Hi ${target.name}, your salary of ${formatMoney(target.salaryAmount)} for ${period} has been paid. Thank you - Cusica Intl`
      );
    } catch {
      // Payment is already recorded — an SMS failure shouldn't undo it or block the admin's flow.
    }
  }

  revalidatePath("/salary");
  return { ok: true };
}

export async function revertSalaryPayment(userId: string, period: string): Promise<SalaryActionResult> {
  const guard = await requireRoleSafe(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = guard.user;

  const existing = await prisma.salaryPayment.findUnique({
    where: { userId_period: { userId, period } },
    include: { user: true },
  });
  if (!existing) {
    return { ok: false, error: "Payment not found." };
  }

  await prisma.salaryPayment.delete({ where: { id: existing.id } });
  await logActivity(
    `${admin.name} reverted "${existing.user.name}"'s salary payment for ${period} — back to unpaid.`,
    admin.id
  );
  revalidatePath("/salary");
  return { ok: true };
}

export interface SalaryPaymentHistoryEntry {
  id: string;
  period: string;
  amount: number;
  paidAt: Date;
  paidByName: string;
}

export async function getSalaryPaymentHistory(userId: string): Promise<SalaryPaymentHistoryEntry[]> {
  const guard = await requireRoleSafe(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) throw new Error(guard.error);

  const payments = await prisma.salaryPayment.findMany({
    where: { userId },
    include: { paidBy: true },
    orderBy: { period: "desc" },
  });
  return payments.map((p) => ({ id: p.id, period: p.period, amount: p.amount, paidAt: p.paidAt, paidByName: p.paidBy.name }));
}
