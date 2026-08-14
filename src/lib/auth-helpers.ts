import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
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
  return user;
}
