"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";

export async function approveDailyRecord(id: string) {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const record = await prisma.dailyRecord.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id },
  });
  await logActivity(`${user.name} approved the daily record for ${record.date}.`, user.id);
  revalidatePath("/", "layout");
}

export async function rejectDailyRecord(id: string) {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const record = await prisma.dailyRecord.update({
    where: { id },
    data: { status: "REJECTED", approvedById: user.id },
  });
  await logActivity(`${user.name} rejected the daily record for ${record.date}.`, user.id);
  revalidatePath("/", "layout");
}
