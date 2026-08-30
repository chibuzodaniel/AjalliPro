"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleSafe } from "@/lib/auth-helpers";
import { needsApproval } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { notifyReviewers, sendPushToUsers } from "@/lib/push";
import { driverSchema, driverPricingSchema } from "@/lib/validation/driver";

export async function createDriver(input: unknown) {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false as const, error: guard.error };
  const user = guard.user;
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
      loadingFee: parsed.data.loadingFee,
      status: pending ? "PENDING" : "APPROVED",
      createdById: user.id,
      approvedById: pending ? null : user.id,
    },
  });
  await logActivity(
    `${user.name} added driver "${driver.name}" (${pending ? "pending" : "approved"}).`,
    user.id
  );
  if (pending) {
    after(() =>
      notifyReviewers(
        {
          title: "New driver awaiting approval",
          body: `${user.name} added "${driver.name}".`,
          url: "/approvals",
        },
        user.id
      )
    );
  }
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function updateDriverPricing(id: string, input: unknown) {
  const guard = await requireRoleSafe(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false as const, error: guard.error };
  const user = guard.user;
  const parsed = driverPricingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const driver = await prisma.driver.update({
    where: { id },
    data: { pricePerBag: parsed.data.pricePerBag, loadingFee: parsed.data.loadingFee },
  });
  await logActivity(
    `${user.name} set "${driver.name}"'s price to ₦${parsed.data.pricePerBag}/bag and loading fee to ₦${parsed.data.loadingFee}/bag.`,
    user.id
  );
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export interface DeleteDriverResult {
  ok: boolean;
  error?: string;
}

export async function deleteDriver(id: string): Promise<DeleteDriverResult> {
  const guard = await requireRoleSafe(["SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) {
    return { ok: false, error: "Driver not found." };
  }

  const salesCount = await prisma.driverSale.count({ where: { driverId: id } });
  if (salesCount > 0) {
    return {
      ok: false,
      error: `Can't delete "${driver.name}" — has ${salesCount} recorded sale${salesCount === 1 ? "" : "s"}. Remove those daily records first.`,
    };
  }

  await prisma.driver.delete({ where: { id } });
  await logActivity(`${user.name} deleted driver "${driver.name}".`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function approveDriver(id: string) {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const driver = await prisma.driver.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id },
  });
  await logActivity(`${user.name} approved driver "${driver.name}".`, user.id);
  after(() =>
    sendPushToUsers([driver.createdById], {
      title: "Driver approved",
      body: `${user.name} approved "${driver.name}".`,
      url: "/drivers",
    })
  );
  revalidatePath("/", "layout");
}

export async function rejectDriver(id: string) {
  const user = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const driver = await prisma.driver.update({
    where: { id },
    data: { status: "REJECTED", approvedById: user.id },
  });
  await logActivity(`${user.name} rejected driver "${driver.name}".`, user.id);
  after(() =>
    sendPushToUsers([driver.createdById], {
      title: "Driver rejected",
      body: `${user.name} rejected "${driver.name}".`,
      url: "/drivers",
    })
  );
  revalidatePath("/", "layout");
}
