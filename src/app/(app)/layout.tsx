import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isApprover } from "@/lib/roles";
import AppShell from "@/components/shell/AppShell";
import NotificationBell, { type NotifItem } from "@/components/shell/NotificationBell";

function fmtTime(d: Date) {
  return d.toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const items: NotifItem[] = [];
  let pendingApprovalCount = 0;

  if (isApprover(user.role)) {
    const [pendingRecords, pendingDrivers] = await Promise.all([
      prisma.dailyRecord.findMany({
        where: { status: "PENDING" },
        include: { createdBy: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.driver.findMany({
        where: { status: "PENDING" },
        include: { createdBy: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    pendingApprovalCount = pendingRecords.length + pendingDrivers.length;

    for (const r of pendingRecords) {
      items.push({
        title: `Daily record awaiting approval — ${r.date}`,
        sub: `Submitted by ${r.createdBy.name} (${r.createdByRole})`,
        pending: true,
        href: "/approvals",
      });
    }
    for (const d of pendingDrivers) {
      items.push({
        title: `Driver "${d.name}" awaiting approval`,
        sub: `Submitted by ${d.createdBy.name}`,
        pending: true,
        href: "/approvals",
      });
    }
  }

  const activity = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  for (const a of activity) {
    items.push({ title: a.text, pending: false, time: fmtTime(a.createdAt) });
  }

  return (
    <>
      <NotificationBell items={items} />
      <AppShell user={{ name: user.name ?? "", role: user.role }} pendingApprovalCount={pendingApprovalCount}>
        {children}
      </AppShell>
    </>
  );
}
