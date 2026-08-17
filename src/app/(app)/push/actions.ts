"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { isPushConfigured } from "@/lib/push";
import { pushSubscriptionSchema } from "@/lib/validation/push";

export interface SubscribeResult {
  ok: boolean;
  error?: string;
}

export async function isPushEnabled(): Promise<boolean> {
  return isPushConfigured();
}

export async function subscribeToPush(input: unknown): Promise<SubscribeResult> {
  const user = await requireUser();
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid subscription" };
  }
  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
  });

  return { ok: true };
}

export async function unsubscribeFromPush(endpoint: string): Promise<SubscribeResult> {
  await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return { ok: true };
}
