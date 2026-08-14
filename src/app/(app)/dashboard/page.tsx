import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isApprover } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getApprovedRecordsSorted, recordSoldTotal } from "@/lib/records";
import { computeRevenue } from "@/lib/revenue";
import { computeIncentiveData } from "@/lib/incentives";
import { currentWeekKey, todayISO, weekKeyOf } from "@/lib/week";
import { formatMoney } from "@/lib/money";
import KpiCard from "@/components/ui/KpiCard";
import { LineTrendChart, BarTrendChart } from "@/components/charts/TrendChart";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const approver = user ? isApprover(user.role) : false;

  const [approvedRecords, customers, drivers, activity, pendingDailyCount, pendingDriverCount] = await Promise.all([
    getApprovedRecordsSorted(),
    prisma.customer.findMany(),
    prisma.driver.findMany({ where: { status: "APPROVED" } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.dailyRecord.count({ where: { status: "PENDING" } }),
    prisma.driver.count({ where: { status: "PENDING" } }),
  ]);

  const stock = approvedRecords.length ? approvedRecords[approvedRecords.length - 1].closingStock : 0;
  const today = todayISO();
  const todayRec = approvedRecords.find((r) => r.date === today);
  const soldToday = todayRec ? recordSoldTotal(todayRec) : 0;
  const producedToday = todayRec ? todayRec.productionLines.reduce((s, p) => s + p.bags, 0) : null;

  const wk = currentWeekKey();
  const weekRecords = approvedRecords.filter((r) => weekKeyOf(r.date) === wk);
  const revenue = computeRevenue(weekRecords);
  const weekProduced = weekRecords.reduce(
    (s, r) => s + r.productionLines.reduce((s2, p) => s2 + p.bags, 0),
    0
  );

  // 14-day series
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  const byDate = new Map(approvedRecords.map((r) => [r.date, r]));
  const soldSeries = days.map((day) => {
    const r = byDate.get(day);
    return r ? recordSoldTotal(r) : 0;
  });
  const openSeries = days.map((day) => byDate.get(day)?.openingStock ?? null);
  const closeSeries = days.map((day) => byDate.get(day)?.closingStock ?? null);
  const dayLabels = days.map((d) => d.slice(5));

  // top drivers this week
  const driverTotals = new Map<string, number>();
  for (const r of weekRecords) {
    for (const ds of r.driverSales) {
      driverTotals.set(ds.driver.name, (driverTotals.get(ds.driver.name) ?? 0) + ds.bags);
    }
  }
  const topDrivers = [...driverTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // incentive watch
  const { customerWeekly, driverWeekly } = computeIncentiveData(approvedRecords);
  const watchItems: { label: string; bags: number; threshold: number }[] = [];
  for (const c of customers) {
    const b = customerWeekly.get(c.id)?.[wk] ?? 0;
    if (b > 0 && b < 500) watchItems.push({ label: c.name, bags: b, threshold: 500 });
  }
  for (const d of drivers) {
    const b = driverWeekly.get(d.id)?.[wk] ?? 0;
    if (b > 0 && b < 1000) watchItems.push({ label: `${d.name} (driver)`, bags: b, threshold: 1000 });
  }

  const pendingTotal = pendingDailyCount + pendingDriverCount;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">
            {new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
        <Link href="/reports" className="btn btn-ghost no-print">
          📈 View reports
        </Link>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <KpiCard
          label="Current Stock"
          value={`${stock} bags`}
          icon="📦"
          iconBg="rgba(124,110,245,.15)"
          iconColor="var(--accent)"
          delta="Live"
        />
        <KpiCard
          label="Bags Sold (Today)"
          value={soldToday}
          icon="🧴"
          iconBg="rgba(47,215,196,.15)"
          iconColor="var(--teal)"
        />
        <KpiCard
          label="Total Produced (Today)"
          value={producedToday !== null ? `${producedToday} bags` : "—"}
          icon="🏭"
          iconBg="rgba(255,193,85,.15)"
          iconColor="var(--amber)"
          delta={producedToday !== null ? "Live" : "Not logged yet"}
          deltaTone={producedToday !== null ? "pos" : "neg"}
        />
        <KpiCard
          label="Total Produced (This Week)"
          value={`${weekProduced} bags`}
          icon="🏭"
          iconBg="rgba(255,193,85,.15)"
          iconColor="var(--amber)"
          delta="See breakdown →"
        />
        {approver && (
          <KpiCard
            label="Net Income (This Week)"
            value={formatMoney(revenue.net)}
            icon="₦"
            iconBg="rgba(63,222,154,.15)"
            iconColor="var(--green)"
          />
        )}
        <KpiCard
          label="Pending Approvals"
          value={pendingTotal}
          icon="⏳"
          iconBg="rgba(255,193,85,.15)"
          iconColor="var(--amber)"
          delta="needs review"
          deltaTone="neg"
        />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title">Bags Sold — last 14 days</div>
          <div className="section-sub">Factory sales + driver sales combined</div>
          <LineTrendChart labels={dayLabels} series={[{ label: "Bags sold", data: soldSeries, color: "#7C6EF5" }]} />
        </div>
        <div className="card">
          <div className="section-title">Stock Movement</div>
          <div className="section-sub">Opening vs closing (approved records)</div>
          <BarTrendChart
            labels={dayLabels}
            series={[
              { label: "Opening", data: openSeries, color: "#2FD7C4" },
              { label: "Closing", data: closeSeries, color: "#7C6EF5" },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-3" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="section-title">Top Drivers (This Week)</div>
          {topDrivers.length === 0 ? (
            <div className="empty">No driver sales yet</div>
          ) : (
            topDrivers.map(([name, bags]) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <span>{name}</span>
                <b>{bags} bags</b>
              </div>
            ))
          )}
        </div>
        <div className="card">
          <div className="section-title">Incentive Watch</div>
          <div className="section-sub">Customers/drivers near weekly bonus threshold</div>
          {watchItems.length === 0 ? (
            <div className="empty">Nothing to show</div>
          ) : (
            watchItems.map((w) => (
              <div key={w.label} style={{ fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                {w.label}: {w.bags}/{w.threshold} bags
              </div>
            ))
          )}
        </div>
        <div className="card">
          <div className="section-title">Recent Activity</div>
          {activity.length === 0 ? (
            <div className="empty">No activity yet</div>
          ) : (
            activity.map((a) => (
              <div
                key={a.id}
                style={{ fontSize: 12.5, padding: "7px 0", borderBottom: "1px solid var(--border)", color: "var(--text-dim)" }}
              >
                {a.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
