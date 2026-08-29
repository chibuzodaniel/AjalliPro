"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";

export interface RecordExpensePaymentResult {
  ok: boolean;
  error?: string;
}

/**
 * Payments are entered manually — an amount, not a checkbox — and can't
 * exceed what's still owing on the expense. Each payment adds to the running
 * amountPaid total; the expense is only marked fully paid once amountPaid
 * covers the full amount. A mistaken payment (partial or full) can be
 * undone entirely via revertExpensePayment below.
 */
export async function recordExpensePayment(id: string, paymentAmount: number): Promise<RecordExpensePaymentResult> {
  const user = await requireRole(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!Number.isInteger(paymentAmount) || paymentAmount <= 0) {
    return { ok: false, error: "Enter a payment amount greater than 0." };
  }

  const expense = await prisma.expenseItem.findUnique({ where: { id }, include: { dailyRecord: true } });
  if (!expense) {
    return { ok: false, error: "Expense not found." };
  }

  const remaining = expense.amount - expense.amountPaid;
  if (paymentAmount > remaining) {
    return { ok: false, error: `Only ₦${remaining} is still owing on this expense.` };
  }

  const amountPaid = expense.amountPaid + paymentAmount;
  const nowFullyPaid = amountPaid >= expense.amount;

  await prisma.expenseItem.update({
    where: { id },
    data: {
      amountPaid,
      paid: nowFullyPaid,
      paidAt: new Date(),
      paidById: user.id,
    },
  });
  await logActivity(
    `${user.name} recorded a ₦${paymentAmount} payment on "${expense.description}" (${expense.dailyRecord.date})` +
      (nowFullyPaid ? " — now fully paid." : ` — ₦${expense.amount - amountPaid} still owing.`),
    user.id
  );
  revalidatePath("/expenses");
  return { ok: true };
}

/**
 * Undoes every payment recorded against an expense, resetting it back to
 * fully unpaid. There's no per-payment history to roll back to a partial
 * amount — this always clears the whole running total, whether the expense
 * was partially or fully paid.
 */
export async function revertExpensePayment(id: string): Promise<RecordExpensePaymentResult> {
  const user = await requireRole(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  const expense = await prisma.expenseItem.findUnique({ where: { id }, include: { dailyRecord: true } });
  if (!expense) {
    return { ok: false, error: "Expense not found." };
  }
  if (expense.amountPaid === 0) {
    return { ok: false, error: "This expense has no payment to revert." };
  }

  await prisma.expenseItem.update({
    where: { id },
    data: { amountPaid: 0, paid: false, paidAt: null, paidById: null },
  });
  await logActivity(
    `${user.name} reverted the ₦${expense.amountPaid} payment on "${expense.description}" (${expense.dailyRecord.date}) — back to unpaid.`,
    user.id
  );
  revalidatePath("/expenses");
  return { ok: true };
}

export interface DeleteExpenseItemResult {
  ok: boolean;
  error?: string;
}

export async function deleteExpenseItem(id: string): Promise<DeleteExpenseItemResult> {
  const user = await requireRole(["SUPER_ADMIN"]);
  const expense = await prisma.expenseItem.findUnique({ where: { id }, include: { dailyRecord: true } });
  if (!expense) {
    return { ok: false, error: "Expense not found." };
  }

  await prisma.expenseItem.delete({ where: { id } });
  await logActivity(
    `${user.name} deleted the expense "${expense.description}" (${expense.dailyRecord.date}).`,
    user.id
  );
  revalidatePath("/", "layout");
  return { ok: true };
}
