import webpush from "web-push";
import { prisma } from "./prisma";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

export function isPushConfigured(): boolean {
  return !!(publicKey && privateKey && subject);
}

if (isPushConfigured()) {
  webpush.setVapidDetails(subject!, publicKey!, privateKey!);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a push notification to every subscription owned by the given users.
 * Silently no-ops if VAPID keys aren't configured, and prunes subscriptions
 * the browser has revoked (410/404) so they stop being retried.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!isPushConfigured() || userIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }
}

/**
 * Pushes to every Admin/Super Admin — the "review" audience that should
 * know about new activity needing approval. Editor was originally included
 * here too but that role is disabled for now (re-add "EDITOR" to the role
 * list below if it comes back). Pass excludeUserId to skip notifying the
 * person who triggered the event.
 */
export async function notifyReviewers(payload: PushPayload, excludeUserId?: string): Promise<void> {
  if (!isPushConfigured()) return;
  const reviewers = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  await sendPushToUsers(
    reviewers.map((u) => u.id),
    payload
  );
}

/**
 * Pushes to Super Admin plus only the Admin(s) Super Admin has specifically
 * assigned to handle daily-record approvals (User.dailyRecordApprover) —
 * narrower than notifyReviewers, which pings every Admin/Super Admin.
 */
export async function notifyDailyRecordApprovers(payload: PushPayload, excludeUserId?: string): Promise<void> {
  if (!isPushConfigured()) return;
  const targets = await prisma.user.findMany({
    where: {
      OR: [{ role: "SUPER_ADMIN" }, { role: "ADMIN", dailyRecordApprover: true }],
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  await sendPushToUsers(
    targets.map((u) => u.id),
    payload
  );
}
