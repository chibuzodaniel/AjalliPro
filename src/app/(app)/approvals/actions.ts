"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { canApproveDailyRecords } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { sendPushToUsers } from "@/lib/push";

async function requireDailyRecordApprover() {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { dailyRecordApprover: true } });
  if (!canApproveDailyRecords(user.role, dbUser?.dailyRecordApprover ?? false)) {
    throw new Error("You're not assigned to approve daily records. Ask Super Admin to assign you in Settings.");
  }
  return user;
}

export async function approveDailyRecord(id: string) {
  const user = await requireDailyRecordApprover();
  const record = await prisma.dailyRecord.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id },
  });
  await logActivity(`${user.name} approved the daily record for ${record.date}.`, user.id);
  await sendPushToUsers([record.createdById], {
    title: "Daily record approved",
    body: `${user.name} approved your daily record for ${record.date}.`,
    url: "/daily-record",
  });
  revalidatePath("/", "layout");
}

export async function rejectDailyRecord(id: string) {
  const user = await requireDailyRecordApprover();
  const record = await prisma.dailyRecord.update({
    where: { id },
    data: { status: "REJECTED", approvedById: user.id },
  });
  await logActivity(`${user.name} rejected the daily record for ${record.date}.`, user.id);
  await sendPushToUsers([record.createdById], {
    title: "Daily record rejected",
    body: `${user.name} rejected your daily record for ${record.date}.`,
    url: "/daily-record",
  });
  revalidatePath("/", "layout");
}
