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
 * covers the full amount. There's no partial-payment undo — correcting a
 * mistaken entry means deleting the expense (Super Admin only) and
 * re-adding it.
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
