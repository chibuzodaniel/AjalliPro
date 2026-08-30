"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRoleSafe } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";

export interface RecordExpensePaymentResult {
  ok: boolean;
  error?: string;
}

/**
 * Payments are entered manually — an amount, not a checkbox — and can't
 * exceed what's still owing on the expense. Each payment adds to the running
 * amountPaid total and gets its own ExpensePayment row (who, how much,
 * when) so the full history is visible later; the expense is only marked
 * fully paid once amountPaid covers the full amount. A mistaken payment
 * (partial or full) can be undone entirely via revertExpensePayment below.
 */
export async function recordExpensePayment(id: string, paymentAmount: number): Promise<RecordExpensePaymentResult> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;
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

  await prisma.$transaction([
    prisma.expenseItem.update({
      where: { id },
      data: {
        amountPaid,
        paid: nowFullyPaid,
        paidAt: new Date(),
        paidById: user.id,
      },
    }),
    prisma.expensePayment.create({
      data: { expenseItemId: id, amount: paymentAmount, paidById: user.id },
    }),
  ]);
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
 * fully unpaid and clearing its payment history — there's no per-payment
 * rollback to a partial amount, this always clears everything, whether the
 * expense was partially or fully paid.
 */
export async function revertExpensePayment(id: string): Promise<RecordExpensePaymentResult> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;
  const expense = await prisma.expenseItem.findUnique({ where: { id }, include: { dailyRecord: true } });
  if (!expense) {
    return { ok: false, error: "Expense not found." };
  }
  if (expense.amountPaid === 0) {
    return { ok: false, error: "This expense has no payment to revert." };
  }

  await prisma.$transaction([
    prisma.expensePayment.deleteMany({ where: { expenseItemId: id } }),
    prisma.expenseItem.update({
      where: { id },
      data: { amountPaid: 0, paid: false, paidAt: null, paidById: null },
    }),
  ]);
  await logActivity(
    `${user.name} reverted the ₦${expense.amountPaid} payment on "${expense.description}" (${expense.dailyRecord.date}) — back to unpaid.`,
    user.id
  );
  revalidatePath("/expenses");
  return { ok: true };
}

export interface ExpensePaymentHistoryEntry {
  id: string;
  amount: number;
  paidAt: Date;
  paidByName: string;
}

/** Read-only — any signed-in user who can already see the Expenses page can view this. */
export async function getExpensePaymentHistory(expenseItemId: string): Promise<ExpensePaymentHistoryEntry[]> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) throw new Error(guard.error);
  const payments = await prisma.expensePayment.findMany({
    where: { expenseItemId },
    include: { paidBy: true },
    orderBy: { paidAt: "asc" },
  });
  return payments.map((p) => ({ id: p.id, amount: p.amount, paidAt: p.paidAt, paidByName: p.paidBy.name }));
}

export interface DeleteExpenseItemResult {
  ok: boolean;
  error?: string;
}

export async function deleteExpenseItem(id: string): Promise<DeleteExpenseItemResult> {
  const guard = await requireRoleSafe(["SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;
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
