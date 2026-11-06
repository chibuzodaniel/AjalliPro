import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isApprover } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getApprovedRecordsSorted, getAllApprovedRecordsEverSorted, recordSoldTotal } from "@/lib/records";
import { computeRevenue } from "@/lib/revenue";
import { computeIncentiveData, weeksQualifiedInYear, yearTotal } from "@/lib/incentives";
import { currentWeekKey, todayISO, weekKeyOf } from "@/lib/week";
import { formatMoney } from "@/lib/money";
import { getWeeklyIncentiveSettings } from "@/lib/settings";
import { getPendingIncentiveAwards } from "@/lib/incentiveAwards";
import KpiCard from "@/components/ui/KpiCard";
import AnnouncementButton from "@/components/dashboard/AnnouncementButton";
import AddBankTransactionButton from "@/components/dashboard/AddBankTransactionButton";
import BankBalanceCard from "@/components/dashboard/BankBalanceCard";
import BagsSoldWeeklyCard from "@/components/dashboard/BagsSoldWeeklyCard";
import { getBankAccountsWithBalances } from "@/lib/bankAccounts";
import IncentiveAwardNotice from "@/components/dashboard/IncentiveAwardNotice";
import IncentiveAwardToast from "@/components/dashboard/IncentiveAwardToast";
import { LineTrendChart, BarTrendChart } from "@/components/charts/DynamicTrendChart";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const approver = user ? isApprover(user.role) : false;
  const isAdminOrSuperAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [
    approvedRecords,
    allApprovedRecordsEver,
    customers,
    drivers,
    staffUsers,
    packers,
    smsTemplates,
    activity,
    pendingDailyCount,
    pendingDriverCount,
    weeklySettings,
    bankAccounts,
  ] = await Promise.all([
    getApprovedRecordsSorted(),
    getAllApprovedRecordsEverSorted(),
    prisma.customer.findMany(),
    prisma.driver.findMany({ where: { status: "APPROVED" } }),
    prisma.user.findMany({ select: { id: true, name: true, phone: true } }),
    prisma.packer.findMany({ select: { id: true, name: true, phone: true } }),
    prisma.smsTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.dailyRecord.count({ where: { status: "PENDING" } }),
    prisma.driver.count({ where: { status: "PENDING" } }),
    getWeeklyIncentiveSettings(),
    isAdminOrSuperAdmin ? getBankAccountsWithBalances() : Promise.resolve([]),
  ]);
  const activeBankAccounts = bankAccounts.filter((a) => a.active);
  const canAnnounce = user ? user.role === "ADMIN_STAFF" || approver : false;
  const pendingIncentiveAwards = user ? await getPendingIncentiveAwards() : [];

  const stock = approvedRecords.length ? approvedRecords[approvedRecords.length - 1].closingStock : 0;
  const today = todayISO();
  const isSunday = new Date(today + "T00:00:00").getDay() === 0;
  const todayRec = approvedRecords.find((r) => r.date === today);
  const soldToday = todayRec ? recordSoldTotal(todayRec) : 0;
  const producedToday = todayRec ? todayRec.productionLines.reduce((s, p) => s + p.bags, 0) : null;

  const wk = currentWeekKey();
  const weekRecords = approvedRecords.filter((r) => weekKeyOf(r.date) === wk);
  const weekProduced = weekRecords.reduce(
    (s, r) => s + r.productionLines.reduce((s2, p) => s2 + p.bags, 0),
    0
  );
  const weekSoldTotal = weekRecords.reduce((s, r) => s + recordSoldTotal(r), 0);

  // Weekly bags-sold history for the KPI card's modal — spans straight
  // through an archive, same as incentive history, since this is what was
  // actually sold, not a running balance that resets on archive.
  const weeklySoldMap = new Map<string, number>();
  for (const r of allApprovedRecordsEver) {
    const weekKey = weekKeyOf(r.date);
    weeklySoldMap.set(weekKey, (weeklySoldMap.get(weekKey) ?? 0) + recordSoldTotal(r));
  }
  const weeklySoldRows = [...weeklySoldMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))
    .map(([label, bags]) => ({ label, bags }));

  // Net income cards — gross sales revenue for the period, not reduced by
  // expenses (those are tracked separately, with their own paid/owing
  // picture, on the Expenses page). Always computed fresh from approved
  // records for the current week/month/year, no date range to pick.
  const monthPrefix = today.slice(0, 7);
  const yearPrefix = today.slice(0, 4);
  const monthRevenue = computeRevenue(approvedRecords.filter((r) => r.date.startsWith(monthPrefix)));
  const yearRevenue = computeRevenue(approvedRecords.filter((r) => r.date.startsWith(yearPrefix)));
  const weekRevenue = computeRevenue(weekRecords);

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

  // incentive watch — "this week" figures reflect only the current session
  // (since the last archive); year-to-date figures keep counting through an
  // archive, since that's a bookkeeping reset, not a reset of what a
  // customer/driver has actually done.
  const { customerWeekly, driverWeekly, driverInstantWeekly, customerInstantWeekly } =
    computeIncentiveData(approvedRecords);
  const { customerWeekly: customerWeeklyAll, driverWeekly: driverWeeklyAll, driverInstantYearly, customerInstantYearly } =
    computeIncentiveData(allApprovedRecordsEver);
  const watchItems: { label: string; address: string | null; bags: number; threshold: number }[] = [];
  for (const c of customers) {
    const b = customerWeekly.get(c.id)?.[wk] ?? 0;
    if (b > 0 && b < weeklySettings.customerWeeklyThreshold)
      watchItems.push({ label: c.name, address: c.address, bags: b, threshold: weeklySettings.customerWeeklyThreshold });
  }
  for (const d of drivers) {
    const b = driverWeekly.get(d.id)?.[wk] ?? 0;
    if (b > 0 && b < weeklySettings.driverWeeklyThreshold)
      watchItems.push({ label: `${d.name} (driver)`, address: null, bags: b, threshold: weeklySettings.driverWeeklyThreshold });
  }

  // Incentive bags given out — never part of any sales/revenue total, tracked
  // separately. Kept as two distinct figures throughout, not blended into
  // one number: "instant" bonus bags are entered manually per sale/delivery
  // and deducted the moment that daily record is approved; "weekly
  // threshold" bonus bags are only earned once a customer/driver's weekly
  // bag total crosses the threshold, and only actually come off stock once
  // Admin/Super Admin explicitly approves that week's bonus (see
  // IncentiveAwardNotice/approveIncentiveAward) — so a qualified-but-not-yet-
  // approved week's threshold bonus isn't really "given out" yet.
  const thisYear = new Date().getFullYear();
  let instantWeekTotal = 0;
  let instantYearTotal = 0;
  let thresholdWeekTotal = 0;
  let thresholdYearTotal = 0;
  for (const c of customers) {
    const wkBags = customerWeekly.get(c.id)?.[wk] ?? 0;
    instantWeekTotal += customerInstantWeekly.get(c.id)?.[wk] ?? 0;
    instantYearTotal += yearTotal(customerInstantYearly.get(c.id), thisYear);
    if (wkBags >= weeklySettings.customerWeeklyThreshold) thresholdWeekTotal += weeklySettings.customerWeeklyBonus;
    thresholdYearTotal +=
      weeksQualifiedInYear(customerWeeklyAll.get(c.id), weeklySettings.customerWeeklyThreshold, thisYear) *
      weeklySettings.customerWeeklyBonus;
  }
  for (const d of drivers) {
    const wkBags = driverWeekly.get(d.id)?.[wk] ?? 0;
    instantWeekTotal += driverInstantWeekly.get(d.id)?.[wk] ?? 0;
    instantYearTotal += yearTotal(driverInstantYearly.get(d.id), thisYear);
    if (wkBags >= weeklySettings.driverWeeklyThreshold) thresholdWeekTotal += weeklySettings.driverWeeklyBonus;
    thresholdYearTotal +=
      weeksQualifiedInYear(driverWeeklyAll.get(d.id), weeklySettings.driverWeeklyThreshold, thisYear) *
      weeklySettings.driverWeeklyBonus;
  }
  const incentiveWeekTotal = instantWeekTotal + thresholdWeekTotal;
  const incentiveYearTotal = instantYearTotal + thresholdYearTotal;

  const pendingTotal = pendingDailyCount + pendingDriverCount;

  return (
    <div>
      {approver ? (
        <IncentiveAwardNotice pending={pendingIncentiveAwards} />
      ) : (
        pendingIncentiveAwards.length > 0 && <IncentiveAwardToast pending={pendingIncentiveAwards} />
      )}
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">
            {new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {canAnnounce && (
            <AnnouncementButton
              staff={staffUsers}
              drivers={drivers}
              customers={customers}
              packers={packers}
              templates={smsTemplates}
            />
          )}
          {isAdminOrSuperAdmin && <AddBankTransactionButton accounts={activeBankAccounts} />}
          <Link href="/reports" className="btn btn-ghost no-print">
            📈 View reports
          </Link>
        </div>
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
        <BagsSoldWeeklyCard weekTotal={weekSoldTotal} rows={weeklySoldRows} />
        <KpiCard
          label="Total Produced (Today)"
          value={producedToday !== null ? `${producedToday} bags` : "—"}
          icon="🏭"
          iconBg="rgba(255,193,85,.15)"
          iconColor="var(--amber)"
          delta={producedToday !== null ? "Live" : isSunday ? "Closed — Sunday" : "Not logged yet"}
          deltaTone={producedToday !== null || isSunday ? "pos" : "neg"}
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
          <>
            <KpiCard
              label="Net Income (This Week)"
              value={formatMoney(weekRevenue.gross)}
              icon="₦"
              iconBg="rgba(63,222,154,.15)"
              iconColor="var(--green)"
              delta={`Pump ${formatMoney(weekRevenue.pumpWaterTotal)} + Sachet ${formatMoney(weekRevenue.sachetTotal)}`}
            />
            <KpiCard
              label="Net Income (This Month)"
              value={formatMoney(monthRevenue.gross)}
              icon="₦"
              iconBg="rgba(63,222,154,.15)"
              iconColor="var(--green)"
              delta={`Pump ${formatMoney(monthRevenue.pumpWaterTotal)} + Sachet ${formatMoney(monthRevenue.sachetTotal)}`}
            />
            <KpiCard
              label="Net Income (This Year)"
              value={formatMoney(yearRevenue.gross)}
              icon="₦"
              iconBg="rgba(63,222,154,.15)"
              iconColor="var(--green)"
              delta={`Pump ${formatMoney(yearRevenue.pumpWaterTotal)} + Sachet ${formatMoney(yearRevenue.sachetTotal)}`}
            />
            <BankBalanceCard accounts={bankAccounts} />
          </>
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
        <KpiCard
          label="Total Incentives (This Week)"
          value={`${incentiveWeekTotal} bags`}
          icon="🎁"
          iconBg="rgba(124,110,245,.15)"
          iconColor="var(--accent)"
          delta={
            <Link href="/incentives">
              Instant {instantWeekTotal} + weekly threshold {thresholdWeekTotal} — not part of sales →
            </Link>
          }
        />
        <KpiCard
          label="Total Incentives (This Year)"
          value={`${incentiveYearTotal} bags`}
          icon="🎁"
          iconBg="rgba(124,110,245,.15)"
          iconColor="var(--accent)"
          delta={
            <Link href="/incentives">
              Instant {instantYearTotal} + weekly threshold {thresholdYearTotal} — not part of sales →
            </Link>
          }
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
                {w.address && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{w.address}</div>}
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
