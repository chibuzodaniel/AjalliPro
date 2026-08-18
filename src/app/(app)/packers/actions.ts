"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";

export interface DeletePackerResult {
  ok: boolean;
  error?: string;
}

export async function deletePacker(id: string): Promise<DeletePackerResult> {
  const user = await requireRole(["SUPER_ADMIN"]);
  const packer = await prisma.packer.findUnique({ where: { id } });
  if (!packer) {
    return { ok: false, error: "Packer not found." };
  }

  const linesCount = await prisma.productionLine.count({ where: { packerId: id } });
  if (linesCount > 0) {
    return {
      ok: false,
      error: `Can't delete "${packer.name}" — has ${linesCount} recorded production line${linesCount === 1 ? "" : "s"}. Remove those daily records first.`,
    };
  }

  await prisma.packer.delete({ where: { id } });
  await logActivity(`${user.name} deleted packer "${packer.name}".`, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
