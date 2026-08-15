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
