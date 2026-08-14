"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { needsApproval } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { driverSchema } from "@/lib/validation/driver";

export async function createDriver(input: unknown) {
  const user = await requireRole(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  const parsed = driverSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const pending = needsApproval(user.role);
  const driver = await prisma.driver.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      pricePerBag: parsed.data.pricePerBag,
      status: pending ? "PENDING" : "APPROVED",
      createdById: user.id,
      approvedById: pending ? null : user.id,
    },
  });
  await logActivity(
    `${user.name} added driver "${driver.name}" (${pending ? "pending" : "approved"}).`,
    user.id
  );
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function approveDriver(id: string) {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const driver = await prisma.driver.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id },
  });
  await logActivity(`${user.name} approved driver "${driver.name}".`, user.id);
  revalidatePath("/", "layout");
}

export async function rejectDriver(id: string) {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const driver = await prisma.driver.update({
    where: { id },
    data: { status: "REJECTED", approvedById: user.id },
  });
  await logActivity(`${user.name} rejected driver "${driver.name}".`, user.id);
  revalidatePath("/", "layout");
}
