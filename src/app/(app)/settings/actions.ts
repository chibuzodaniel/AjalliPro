"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { incentiveTiersSchema } from "@/lib/validation/incentive-tier";

export interface UpdateTiersResult {
  ok: boolean;
  error?: string;
}

export async function updateIncentiveTiers(input: unknown): Promise<UpdateTiersResult> {
  const user = await requireRole(["SUPER_ADMIN"]);
  const parsed = incentiveTiersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tiers" };
  }

  await prisma.$transaction([
    prisma.incentiveTier.deleteMany({}),
    prisma.incentiveTier.createMany({ data: parsed.data }),
  ]);

  await logActivity(`${user.name} updated the customer incentive tier table.`, user.id);
  revalidatePath("/settings");
  return { ok: true };
}
