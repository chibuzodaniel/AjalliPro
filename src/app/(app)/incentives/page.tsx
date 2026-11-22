import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getApprovedRecordsSorted, getAllApprovedRecordsEverSorted } from "@/lib/records";
import {
  computeIncentiveData,
  weeksQualified,
  weeklyThresholdBonus,
  weeklyThresholdBonusInYear,
  yearTotal,
  buildWeeklyIncentiveHistory,
  buildMonthlyIncentiveHistory,
  buildYearlyIncentiveHistory,
} from "@/lib/incentives";
import { currentWeekKey, MONTH_NAMES } from "@/lib/week";
import { getWeeklyIncentiveSettings } from "@/lib/settings";
import Link from "next/link";
import {
  getIncentiveAwardHistory,
  type IncentiveAwardStatus,
} from "@/lib/incentiveAwards";
import KpiCard from "@/components/ui/KpiCard";
import RangeTabs from "@/components/ui/RangeTabs";
import ViewAllModal from "@/components/ui/ViewAllModal";
import IncentiveHistoryButton from "@/components/incentives/IncentiveHistoryButton";
import RevertIncentiveAwardButton from "@/components/incentives/RevertIncentiveAwardButton";
import ApproveIncentiveAwardButton from "@/components/incentives/ApproveIncentiveAwardButton";

function monthLabel(key: string) {
  return `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
}

function ProgressBar({ bags, threshold, qualifies }: { bags: number; threshold: number; qualifies: boolean }) {
  const pct = Math.min(100, (bags / threshold) * 100);
  return (
    <td style={{ minWidth: 120 }}>
      <div style={{ background: "var(--panel-2)", borderRadius: 20, height: 8, overflow: "hidden" }}>
        <div
          style={{ width: `${pct}%`, height: "100%", background: qualifies ? "var(--green)" : "var(--accent)" }}
        />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
        {bags}/{threshold}
      </span>
    </td>
  );
}

export default async function IncentivesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "drivers" ? "drivers" : "customers";
  const statusFilter =
    sp.status === "RECEIVED" || sp.status === "AWAITING" || sp.status === "NOT_RECEIVED" ? sp.status : "all";
  const user = await getCurrentUser();
  const canRevertAward = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canApproveAward = canRevertAward;

  const [customers, drivers, approvedRecords, allApprovedRecordsEver, weeklySettings, awardHistory] =
    await Promise.all([
      prisma.customer.findMany({ orderBy: { name: "asc" } }),
      prisma.driver.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }),
      getApprovedRecordsSorted(),
      getAllApprovedRecordsEverSorted(),
      getWeeklyIncentiveSettings(),
      getIncentiveAwardHistory(),
    ]);
  // "This week" figures reflect only the current session (since the last archive).
  // Everything else here — all-time weeks qualified, year-to-date totals — keeps
  // counting straight through an archive, since that's a bookkeeping reset for
  // day-to-day recording, not a reset of what a customer/driver has actually done.
  const { customerWeekly, driverWeekly, customerInstantWeekly, driverInstantWeekly } =
    computeIncentiveData(approvedRecords);
  const {
    customerWeekly: customerWeeklyAll,
    driverWeekly: driverWeeklyAll,
    customerYearly,
    driverInstantWeekly: driverInstantWeeklyAll,
    driverInstantYearly,
    customerInstantWeekly: customerInstantWeeklyAll,
    customerInstantYearly,
  } = computeIncentiveData(allApprovedRecordsEver);
  const wk = currentWeekKey();
  const year = new Date().getFullYear();
  const { customerWeeklyThreshold, customerWeeklyBonus, driverWeeklyThreshold, driverWeeklyBonus } = weeklySettings;

  const statusesByEntity = new Map<string, Record<string, IncentiveAwardStatus>>();
  for (const h of awardHistory) {
    const k = `${h.entityType}:${h.entityId}`;
    const m = statusesByEntity.get(k) ?? {};
    m[h.weekKey] = h.status;
    statusesByEntity.set(k, m);
  }
  const statusesFor = (entityType: "CUSTOMER" | "DRIVER", id: string) =>
    statusesByEntity.get(`${entityType}:${id}`) ?? {};

  const custRows = customers.map((c) => {
    const wkBags = customerWeekly.get(c.id)?.[wk] ?? 0;
    const qualifies = wkBags >= customerWeeklyThreshold;
    const thresholdBonusYear =
      weeklyThresholdBonusInYear(customerWeeklyAll.get(c.id), customerWeeklyThreshold, customerWeeklyBonus, year);
    const instantWeek = customerInstantWeekly.get(c.id)?.[wk] ?? 0;
    const instantYear = yearTotal(customerInstantYearly.get(c.id), year);
    const thresholdBonusWeek = weeklyThresholdBonus(wkBags, customerWeeklyThreshold, customerWeeklyBonus);
    const weekBonusBags = thresholdBonusWeek + instantWeek;
    const yearBonusBags = thresholdBonusYear + instantYear;
    const weeklyRows = buildWeeklyIncentiveHistory(
      customerWeeklyAll.get(c.id),
      customerInstantWeeklyAll.get(c.id),
      customerWeeklyThreshold,
      customerWeeklyBonus
    );
    const monthlyRows = buildMonthlyIncentiveHistory(
      customerWeeklyAll.get(c.id),
      customerInstantWeeklyAll.get(c.id),
      customerWeeklyThreshold,
      customerWeeklyBonus,
      monthLabel
    );
    const yearlyRows = buildYearlyIncentiveHistory(
      customerWeeklyAll.get(c.id),
      customerInstantWeeklyAll.get(c.id),
      customerWeeklyThreshold,
      customerWeeklyBonus
    );
    return {
      c,
      wkBags,
      qualifies,
      instantWeek,
      instantYear,
      weekBonusBags,
      yearBonusBags,
      weeklyRows,
      monthlyRows,
      yearlyRows,
    };
  });
  const custQualified = custRows.filter((r) => r.qualifies).length;
  const custAvg = custRows.length ? Math.round(custRows.reduce((s, r) => s + r.wkBags, 0) / custRows.length) : 0;
  const custInstantWeekTotal = custRows.reduce((s, r) => s + r.instantWeek, 0);
  const custInstantYearTotal = custRows.reduce((s, r) => s + r.instantYear, 0);
  const custIncentiveWeekTotal = custRows.reduce((s, r) => s + r.weekBonusBags, 0);
  const custIncentiveYearTotal = custRows.reduce((s, r) => s + r.yearBonusBags, 0);
  const custThresholdWeekTotal = custIncentiveWeekTotal - custInstantWeekTotal;
  const custThresholdYearTotal = custIncentiveYearTotal - custInstantYearTotal;

  const drvRows = drivers.map((d) => {
    const wkBags = driverWeekly.get(d.id)?.[wk] ?? 0;
    const qualifies = wkBags >= driverWeeklyThreshold;
    const instantWeek = driverInstantWeekly.get(d.id)?.[wk] ?? 0;
    const instantYear = yearTotal(driverInstantYearly.get(d.id), year);
    const weekBonusBags = weeklyThresholdBonus(wkBags, driverWeeklyThreshold, driverWeeklyBonus);
    const yearBonusBags = weeklyThresholdBonusInYear(driverWeeklyAll.get(d.id), driverWeeklyThreshold, driverWeeklyBonus, year);
    const weeklyRows = buildWeeklyIncentiveHistory(
      driverWeeklyAll.get(d.id),
      driverInstantWeeklyAll.get(d.id),
      driverWeeklyThreshold,
      driverWeeklyBonus
    );
    const monthlyRows = buildMonthlyIncentiveHistory(
      driverWeeklyAll.get(d.id),
      driverInstantWeeklyAll.get(d.id),
      driverWeeklyThreshold,
      driverWeeklyBonus,
      monthLabel
    );
    const yearlyRows = buildYearlyIncentiveHistory(
      driverWeeklyAll.get(d.id),
      driverInstantWeeklyAll.get(d.id),
      driverWeeklyThreshold,
      driverWeeklyBonus
    );
    return {
      d,
      wkBags,
      qualifies,
      instantWeek,
      instantYear,
      weekBonusBags,
      yearBonusBags,
      totalWeek: instantWeek + weekBonusBags,
      totalYear: instantYear + yearBonusBags,
      weeklyRows,
      monthlyRows,
      yearlyRows,
    };
  });
  const drvQualified = drvRows.filter((r) => r.qualifies).length;
  const drvAvg = drvRows.length ? Math.round(drvRows.reduce((s, r) => s + r.wkBags, 0) / drvRows.length) : 0;
  const drvInstantWeekTotal = drvRows.reduce((s, r) => s + r.instantWeek, 0);
  const drvInstantYearTotal = drvRows.reduce((s, r) => s + r.instantYear, 0);
  const drvIncentiveWeekTotal = drvRows.reduce((s, r) => s + r.totalWeek, 0);
  const drvIncentiveYearTotal = drvRows.reduce((s, r) => s + r.totalYear, 0);
  const drvThresholdWeekTotal = drvIncentiveWeekTotal - drvInstantWeekTotal;
  const drvThresholdYearTotal = drvIncentiveYearTotal - drvInstantYearTotal;

  const customersTable = (
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>This week</th>
          <th>Progress</th>
          <th>Status</th>
          <th>Weeks qualified (all-time)</th>
          <th>Year-to-date bags</th>
          <th>Instant incentive (week)</th>
          <th>Instant incentive (year)</th>
          <th>Total (instant + weekly-threshold, year)</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {custRows.map(({ c, wkBags, qualifies, instantWeek, instantYear, yearBonusBags, weeklyRows, monthlyRows, yearlyRows }) => (
          <tr key={c.id}>
            <td>
              {c.name}
              {c.address && <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{c.address}</div>}
            </td>
            <td>{wkBags} bags</td>
            <ProgressBar bags={wkBags} threshold={customerWeeklyThreshold} qualifies={qualifies} />
            <td>
              {qualifies ? (
                <span className="pill approved">
                  +{weeklyThresholdBonus(wkBags, customerWeeklyThreshold, customerWeeklyBonus)} bonus qualified
                  {wkBags >= customerWeeklyThreshold * 2 && ` (×${Math.floor(wkBags / customerWeeklyThreshold)})`}
                </span>
              ) : (
                <span className="pill pending">in progress</span>
              )}
            </td>
            <td>{weeksQualified(customerWeeklyAll.get(c.id), customerWeeklyThreshold)}</td>
            <td>{yearTotal(customerYearly.get(c.id), year)}</td>
            <td>{instantWeek}</td>
            <td>{instantYear}</td>
            <td>{yearBonusBags}</td>
            <td>
              <IncentiveHistoryButton name={c.name} weekStatuses={statusesFor("CUSTOMER", c.id)} weeklyRows={weeklyRows} monthlyRows={monthlyRows} yearlyRows={yearlyRows} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const driversTable = (
    <table>
      <thead>
        <tr>
          <th>Driver</th>
          <th>This week</th>
          <th>Progress</th>
          <th>Status</th>
          <th>Weeks qualified (all-time)</th>
          <th>Instant incentive (week)</th>
          <th>Instant incentive (year)</th>
          <th>Total (instant + weekly-threshold, year)</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {drvRows.map(({ d, wkBags, qualifies, instantWeek, instantYear, totalYear, weeklyRows, monthlyRows, yearlyRows }) => (
          <tr key={d.id}>
            <td>{d.name}</td>
            <td>{wkBags} bags</td>
            <ProgressBar bags={wkBags} threshold={driverWeeklyThreshold} qualifies={qualifies} />
            <td>
              {qualifies ? (
                <span className="pill approved">
                  +{weeklyThresholdBonus(wkBags, driverWeeklyThreshold, driverWeeklyBonus)} bonus qualified
                  {wkBags >= driverWeeklyThreshold * 2 && ` (×${Math.floor(wkBags / driverWeeklyThreshold)})`}
                </span>
              ) : (
                <span className="pill pending">in progress</span>
              )}
            </td>
            <td>{weeksQualified(driverWeeklyAll.get(d.id), driverWeeklyThreshold)}</td>
            <td>{instantWeek}</td>
            <td>{instantYear}</td>
            <td>{totalYear}</td>
            <td>
              <IncentiveHistoryButton name={d.name} weekStatuses={statusesFor("DRIVER", d.id)} weeklyRows={weeklyRows} monthlyRows={monthlyRows} yearlyRows={yearlyRows} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Incentive Tracking</h1>
          <div className="sub">
            Weekly bag totals against customer ({customerWeeklyThreshold}) and driver ({driverWeeklyThreshold})
            bonus thresholds — bonus bags are given free and are not part of any sales total
          </div>
        </div>
      </div>
      <RangeTabs
        basePath="/incentives"
        current={tab}
        paramName="tab"
        options={[
          { value: "customers", label: "Customers" },
          { value: "drivers", label: "Drivers" },
        ]}
      />

      {tab === "customers" ? (
        <div>
          <div className="grid grid-4" style={{ marginBottom: 18 }}>
            <KpiCard label="Qualified This Week" value={custQualified} />
            <KpiCard label="Avg Bags / Customer" value={custAvg} />
            <KpiCard
              label="Incentive Bags — This Week"
              value={custIncentiveWeekTotal}
              delta={`Instant ${custInstantWeekTotal} + weekly-threshold ${custThresholdWeekTotal}`}
            />
            <KpiCard
              label="Incentive Bags — This Year"
              value={custIncentiveYearTotal}
              delta={`Instant ${custInstantYearTotal} + weekly-threshold ${custThresholdYearTotal}`}
            />
          </div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="section-title">
                Customer weekly incentive — {customerWeeklyThreshold} bags/week qualifies for +{customerWeeklyBonus}{" "}
                bonus bags, paid again for every further {customerWeeklyThreshold} bags that week. Instant incentives are entered manually per truck delivery.
              </div>
              <ViewAllModal title="All Customers — Incentive Detail">{customersTable}</ViewAllModal>
            </div>
            <div className="table-wrap">{customersTable}</div>
            {custRows.length === 0 && <div className="empty">No customers yet.</div>}
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-4" style={{ marginBottom: 18 }}>
            <KpiCard label="Qualified This Week" value={drvQualified} />
            <KpiCard label="Avg Bags / Driver" value={drvAvg} />
            <KpiCard
              label="Incentive Bags — This Week"
              value={drvIncentiveWeekTotal}
              delta={`Instant ${drvInstantWeekTotal} + weekly-threshold ${drvThresholdWeekTotal}`}
            />
            <KpiCard
              label="Incentive Bags — This Year"
              value={drvIncentiveYearTotal}
              delta={`Instant ${drvInstantYearTotal} + weekly-threshold ${drvThresholdYearTotal}`}
            />
          </div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="section-title">
                Driver weekly incentive — {driverWeeklyThreshold} bags/week qualifies for +{driverWeeklyBonus} bonus
                bags, paid again for every further {driverWeeklyThreshold} bags that week. Instant incentives are entered manually per sale.
              </div>
              <ViewAllModal title="All Drivers — Incentive Detail">{driversTable}</ViewAllModal>
            </div>
            <div className="table-wrap">{driversTable}</div>
            {drvRows.length === 0 && <div className="empty">No drivers yet.</div>}
          </div>
        </div>
      )}

      {(() => {
        const entityType = tab === "customers" ? "CUSTOMER" : "DRIVER";
        const noun = tab === "customers" ? "customer" : "driver";
        const historyForTab = awardHistory.filter((h) => h.entityType === entityType);
        const counts = {
          RECEIVED: historyForTab.filter((h) => h.status === "RECEIVED").length,
          AWAITING: historyForTab.filter((h) => h.status === "AWAITING").length,
          NOT_RECEIVED: historyForTab.filter((h) => h.status === "NOT_RECEIVED").length,
        };
        const visible = statusFilter === "all" ? historyForTab : historyForTab.filter((h) => h.status === statusFilter);
        const statusQs = (s: string) => `/incentives?tab=${tab}${s === "all" ? "" : `&status=${s}`}`;
        const filterOptions = [
          { value: "all", label: `All (${historyForTab.length})` },
          { value: "RECEIVED", label: `Received (${counts.RECEIVED})` },
          { value: "AWAITING", label: `Awaiting approval (${counts.AWAITING})` },
          { value: "NOT_RECEIVED", label: `Not received (${counts.NOT_RECEIVED})` },
        ];
        return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">{tab === "customers" ? "Customer" : "Driver"} weekly bonus history (all-time)</div>
        <div className="section-sub">
          Every week a {noun} crossed the weekly threshold, and whether they actually received the bonus.{" "}
          <b>Received</b> = approved by Admin/Super Admin and deducted from stock. <b>Awaiting approval</b> = this
          week, can still be approved. <b>Not received</b> = a past week that qualified but was never approved — it can
          still be approved late: you enter the date it was given, the bags come off that day&apos;s stock, and every later day is recalculated. Past weeks are judged against the current
          threshold.
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
          {filterOptions.map((o) => (
            <Link
              key={o.value}
              href={statusQs(o.value)}
              className={`btn btn-sm ${statusFilter === o.value ? "" : "btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              {o.label}
            </Link>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Week</th>
                <th>Bags that week</th>
                <th>Bonus earned</th>
                <th>Received</th>
                <th>Status</th>
                <th>Last approved by</th>
                <th>Last approved at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((h) => (
                <tr key={h.key}>
                  <td>
                    {h.name}
                    {h.address && <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{h.address}</div>}
                  </td>
                  <td>{h.weekKey}</td>
                  <td>{h.weeklyBags}</td>
                  <td>
                    +{h.earnedBags}
                    {h.multiplier > 1 && (
                      <span style={{ fontSize: 11, color: "var(--text-faint)" }}> (×{h.multiplier})</span>
                    )}
                  </td>
                  <td>
                    {h.receivedBags}
                    {h.approvalCount > 1 && (
                      <span style={{ fontSize: 11, color: "var(--text-faint)" }}> ({h.approvalCount} approvals)</span>
                    )}
                  </td>
                  <td>
                    {h.status === "RECEIVED" && h.award && (
                      <span className="pill approved">
                        received {h.award.givenOn}
                        {h.award.deductedOn !== h.award.givenOn && ` — deducted ${h.award.deductedOn}`}
                        {h.award.source === "LEAKAGE" ? " from leakage pile" : ""}
                      </span>
                    )}
                    {h.status === "RECEIVED" && !h.award && h.legacyAutoDeducted && (
                      <span className="pill approved">received — auto-deducted (before approvals)</span>
                    )}
                    {h.status === "AWAITING" && (
                      <span className="pill pending">
                        {h.receivedBags > 0 ? `+${h.remainingBags} more awaiting approval` : "awaiting approval"}
                      </span>
                    )}
                    {h.status === "NOT_RECEIVED" && (
                      <span className="pill rejected">
                        {h.receivedBags > 0 ? `partly received — ${h.remainingBags} not received` : "not received"}
                      </span>
                    )}
                  </td>
                  <td>{h.award?.approvedByName ?? "—"}</td>
                  <td>
                    {h.award
                      ? h.award.approvedAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
                      : "—"}
                  </td>
                  <td style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    {h.remainingBags > 0 && canApproveAward && (
                      <ApproveIncentiveAwardButton
                        entityType={h.entityType}
                        entityId={h.entityId}
                        weekKey={h.weekKey}
                        bonusBags={h.remainingBags}
                        isPastWeek={h.status === "NOT_RECEIVED"}
                      />
                    )}
                    {h.award && canRevertAward && <RevertIncentiveAwardButton awardId={h.award.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="empty">
              {historyForTab.length === 0
                ? `No ${noun} has qualified for a weekly bonus yet.`
                : "Nothing matches this filter."}
            </div>
          )}
        </div>
      </div>
        );
      })()}
    </div>
  );
}
