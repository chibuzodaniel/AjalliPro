"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";

export async function setExpensePaid(id: string, paid: boolean) {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const expense = await prisma.expenseItem.update({
    where: { id },
    data: {
      paid,
      paidAt: paid ? new Date() : null,
      paidById: paid ? user.id : null,
    },
    include: { dailyRecord: true },
  });
  await logActivity(
    `${user.name} marked expense "${expense.description}" (${expense.dailyRecord.date}) as ${paid ? "paid" : "unpaid"}.`,
    user.id
  );
  revalidatePath("/expenses");
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
