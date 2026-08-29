import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isApprover, roleLabel, canApproveDailyRecords } from "@/lib/roles";
import { isPushConfigured } from "@/lib/push";
import AppShell from "@/components/shell/AppShell";
import NotificationBell, { type NotifItem } from "@/components/shell/NotificationBell";
import InactivityLogout from "@/components/shell/InactivityLogout";

function fmtTime(d: Date) {
  return d.toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const items: NotifItem[] = [];
  let pendingApprovalCount = 0;
  const approverRole = isApprover(user.role);

  const [dbUser, selfUser, pendingRecordsRaw, pendingDrivers, activity] = await Promise.all([
    approverRole
      ? prisma.user.findUnique({ where: { id: user.id }, select: { dailyRecordApprover: true } })
      : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: user.id }, select: { stayLoggedIn: true } }),
    approverRole
      ? prisma.dailyRecord.findMany({
          where: { status: "PENDING" },
          include: { createdBy: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    approverRole
      ? prisma.driver.findMany({
          where: { status: "PENDING" },
          include: { createdBy: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  if (approverRole) {
    const canSeeDailyRecords = canApproveDailyRecords(user.role, dbUser?.dailyRecordApprover ?? false);
    const pendingRecords = canSeeDailyRecords ? pendingRecordsRaw : [];
    pendingApprovalCount = pendingRecords.length + pendingDrivers.length;

    for (const r of pendingRecords) {
      const label = roleLabel(r.createdByRole);
      items.push({
        title: `Daily record awaiting approval — ${r.date}`,
        sub: `Submitted by ${r.createdBy.name}${label ? ` (${label})` : ""}`,
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

  for (const a of activity) {
    items.push({ title: a.text, pending: false, time: fmtTime(a.createdAt) });
  }

  return (
    <>
      <InactivityLogout exempt={selfUser?.stayLoggedIn ?? false} />
      <NotificationBell items={items} />
      <AppShell
        user={{ name: user.name ?? "", role: user.role }}
        pendingApprovalCount={pendingApprovalCount}
        pushEnabled={isPushConfigured()}
      >
        {children}
      </AppShell>
    </>
  );
}
