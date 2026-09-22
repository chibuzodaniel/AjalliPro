"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRoleSafe } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { isSmsConfigured, sendSms } from "@/lib/sms";
import { timeOfDayGreeting } from "@/lib/greeting";
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

/**
 * Super-Admin-only: excludes/includes a staff member from Salary entirely.
 * Turned off, they're just a normal platform login — the Salary page stops
 * showing their salary/phone/payment controls, same as anyone who's never
 * had payroll set up for them.
 */
export async function setStaffPayrollEnabled(userId: string, enabled: boolean): Promise<SalaryActionResult> {
  const guard = await requireRoleSafe(["SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = guard.user;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found" };

  await prisma.user.update({ where: { id: userId }, data: { payrollEnabled: enabled } });
  await logActivity(
    enabled
      ? `${admin.name} added "${target.name}" back to payroll.`
      : `${admin.name} removed "${target.name}" from payroll.`,
    admin.id
  );
  revalidatePath("/salary");
  return { ok: true };
}

type StaffForPayment = { id: string; name: string; phone: string | null; salaryAmount: number };

/** Shared by the single and bulk mark-paid actions. Assumes the caller already checked permissions. */
async function markOnePaid(
  admin: { id: string; name?: string | null },
  target: StaffForPayment,
  period: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (target.salaryAmount <= 0) {
    return { ok: false, error: `Set "${target.name}"'s salary amount first.` };
  }

  const existing = await prisma.salaryPayment.findUnique({
    where: { userId_period: { userId: target.id, period } },
  });
  if (existing) {
    return { ok: false, error: `"${target.name}"'s salary for ${period} is already marked paid.` };
  }

  await prisma.salaryPayment.create({
    data: { userId: target.id, period, amount: target.salaryAmount, paidById: admin.id },
  });
  await logActivity(
    `${admin.name} marked "${target.name}"'s salary (₦${target.salaryAmount}, ${period}) as paid.`,
    admin.id
  );

  if (target.phone && isSmsConfigured()) {
    try {
      await sendSms(
        target.phone,
        `${timeOfDayGreeting()} ${target.name}, your salary of ${formatMoney(target.salaryAmount)} for ${period} has been paid. Thank you - Cusica Intl`
      );
    } catch {
      // Payment is already recorded — an SMS failure shouldn't undo it or block the admin's flow.
    }
  }

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

  const result = await markOnePaid(admin, target, period);
  if (!result.ok) return result;

  revalidatePath("/salary");
  return { ok: true };
}

export interface MarkSalaryPaidBulkResult {
  ok: boolean;
  paidCount: number;
  skipped: { name: string; reason: string }[];
  error?: string;
}

/**
 * Marks every listed staff member's salary as paid for the given period —
 * used for both "mark selected as paid" and "mark all as paid" (the caller
 * just passes every unpaid staff id for "all"). Staff already paid for that
 * period, or with no salary amount set, are skipped rather than failing the
 * whole batch.
 */
export async function markSalaryPaidBulk(userIds: string[], period: string): Promise<MarkSalaryPaidBulkResult> {
  const guard = await requireRoleSafe(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, paidCount: 0, skipped: [], error: guard.error };
  const admin = guard.user;

  if (!/^\d{4}-\d{2}$/.test(period)) {
    return { ok: false, paidCount: 0, skipped: [], error: "Invalid period" };
  }
  if (userIds.length === 0) {
    return { ok: false, paidCount: 0, skipped: [], error: "No staff selected." };
  }

  const targets = await prisma.user.findMany({ where: { id: { in: userIds } } });
  let paidCount = 0;
  const skipped: { name: string; reason: string }[] = [];

  for (const target of targets) {
    const result = await markOnePaid(admin, target, period);
    if (result.ok) {
      paidCount += 1;
    } else {
      skipped.push({ name: target.name, reason: result.error });
    }
  }

  revalidatePath("/salary");
  return { ok: true, paidCount, skipped };
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
