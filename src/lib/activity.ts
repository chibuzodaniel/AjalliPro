import { prisma } from "./prisma";

export async function logActivity(text: string, userId?: string) {
  await prisma.activityLog.create({ data: { text, userId } });
}

export async function getRecentActivity(limit = 20) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
