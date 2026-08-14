"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { SUPER_ADMIN_EMAIL } from "@/lib/auth";

export interface RegisterResult {
  ok: boolean;
  error?: string;
}

export async function registerUser(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, password } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const role = email === SUPER_ADMIN_EMAIL.toLowerCase() ? "SUPER_ADMIN" : parsed.data.role;
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  return { ok: true };
}
