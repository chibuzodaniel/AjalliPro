import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Checked fresh from the DB (never trusted from the JWT) so Super Admin
 * toggling a profile's editing off takes effect immediately, not after
 * that person's session token next refreshes.
 */
export async function requireEditingEnabled(userId: string) {
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { canEdit: true } });
  if (dbUser && !dbUser.canEdit) {
    throw new Error("Your account has been set to read-only by an admin. You can't make changes right now.");
  }
}

/**
 * Server Action guard. Always call this inside every mutating action —
 * never trust a role passed from the client. Throws, which surfaces as a
 * rejected action promise the calling client component can catch.
 */
export async function requireRole(allowed: Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");
  if (!allowed.includes(user.role)) {
    throw new Error("You don't have permission to do that.");
  }
  await requireEditingEnabled(user.id);
  return user;
}
