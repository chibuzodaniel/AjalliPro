"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { customerSchema } from "@/lib/validation/customer";
import { getApprovedRecordsSorted } from "@/lib/records";
import { computeIncentiveData } from "@/lib/incentives";
import { currentWeekKey } from "@/lib/week";
import { getWeeklyIncentiveSettings } from "@/lib/settings";

export async function createCustomer(input: unknown) {
  const user = await requireRole(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      createdById: user.id,
    },
  });
  await logActivity(`${user.name} added customer "${customer.name}".`, user.id);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export interface MailPreviewEntry {
  customerId: string;
  name: string;
  email: string;
  weeklyBags: number;
  yearlyBags: number;
  qualifies: boolean;
}

export async function generateWeeklyMailPreview(): Promise<MailPreviewEntry[]> {
  await requireRole(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  const [customers, approvedRecords, weeklySettings] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    getApprovedRecordsSorted(),
    getWeeklyIncentiveSettings(),
  ]);
  const { customerWeekly, customerYearly } = computeIncentiveData(approvedRecords);
  const wk = currentWeekKey();
  const year = new Date().getFullYear();

  return customers.map((c) => {
    const weeklyBags = customerWeekly.get(c.id)?.[wk] ?? 0;
    const yearlyBags = customerYearly.get(c.id)?.[year] ?? 0;
    return {
      customerId: c.id,
      name: c.name,
      email: c.email,
      weeklyBags,
      yearlyBags,
      qualifies: weeklyBags >= weeklySettings.customerWeeklyThreshold,
    };
  });
}
