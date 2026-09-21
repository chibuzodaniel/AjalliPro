import { prisma } from "@/lib/prisma";
import { getApprovedRecordsSorted, getAllApprovedRecordsEverSorted } from "@/lib/records";
import {
  computeIncentiveData,
  weeksQualified,
  weeksQualifiedInYear,
  yearTotal,
  buildWeeklyIncentiveHistory,
  buildMonthlyIncentiveHistory,
} from "@/lib/incentives";
import { currentWeekKey, MONTH_NAMES } from "@/lib/week";
import { getWeeklyIncentiveSettings } from "@/lib/settings";
import KpiCard from "@/components/ui/KpiCard";
import RangeTabs from "@/components/ui/RangeTabs";
import ViewAllModal from "@/components/ui/ViewAllModal";
import IncentiveHistoryButton from "@/components/incentives/IncentiveHistoryButton";

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
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "drivers" ? "drivers" : "customers";

  const [customers, drivers, approvedRecords, allApprovedRecordsEver, weeklySettings] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.driver.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }),
    getApprovedRecordsSorted(),
    getAllApprovedRecordsEverSorted(),
    getWeeklyIncentiveSettings(),
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

  const custRows = customers.map((c) => {
    const wkBags = customerWeekly.get(c.id)?.[wk] ?? 0;
    const qualifies = wkBags >= customerWeeklyThreshold;
    const thresholdBonusYear =
      weeksQualifiedInYear(customerWeeklyAll.get(c.id), customerWeeklyThreshold, year) * customerWeeklyBonus;
    const instantWeek = customerInstantWeekly.get(c.id)?.[wk] ?? 0;
    const instantYear = yearTotal(customerInstantYearly.get(c.id), year);
    const weekBonusBags = (qualifies ? customerWeeklyBonus : 0) + instantWeek;
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
    return { c, wkBags, qualifies, instantWeek, instantYear, weekBonusBags, yearBonusBags, weeklyRows, monthlyRows };
  });
  const custQualified = custRows.filter((r) => r.qualifies).length;
  const custAvg = custRows.length ? Math.round(custRows.reduce((s, r) => s + r.wkBags, 0) / custRows.length) : 0;
  const custIncentiveWeekTotal = custRows.reduce((s, r) => s + r.weekBonusBags, 0);
  const custIncentiveYearTotal = custRows.reduce((s, r) => s + r.yearBonusBags, 0);

  const drvRows = drivers.map((d) => {
    const wkBags = driverWeekly.get(d.id)?.[wk] ?? 0;
    const qualifies = wkBags >= driverWeeklyThreshold;
    const instantWeek = driverInstantWeekly.get(d.id)?.[wk] ?? 0;
    const instantYear = yearTotal(driverInstantYearly.get(d.id), year);
    const weekBonusBags = qualifies ? driverWeeklyBonus : 0;
    const yearBonusBags = weeksQualifiedInYear(driverWeeklyAll.get(d.id), driverWeeklyThreshold, year) * driverWeeklyBonus;
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
    };
  });
  const drvQualified = drvRows.filter((r) => r.qualifies).length;
  const drvAvg = drvRows.length ? Math.round(drvRows.reduce((s, r) => s + r.wkBags, 0) / drvRows.length) : 0;
  const drvIncentiveWeekTotal = drvRows.reduce((s, r) => s + r.totalWeek, 0);
  const drvIncentiveYearTotal = drvRows.reduce((s, r) => s + r.totalYear, 0);

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
          <th>Total incentives (year)</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {custRows.map(({ c, wkBags, qualifies, instantWeek, instantYear, yearBonusBags, weeklyRows, monthlyRows }) => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>{wkBags} bags</td>
            <ProgressBar bags={wkBags} threshold={customerWeeklyThreshold} qualifies={qualifies} />
            <td>
              {qualifies ? (
                <span className="pill approved">+{customerWeeklyBonus} bonus qualified</span>
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
              <IncentiveHistoryButton name={c.name} weeklyRows={weeklyRows} monthlyRows={monthlyRows} />
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
          <th>Total incentives (year)</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {drvRows.map(({ d, wkBags, qualifies, instantWeek, instantYear, totalYear, weeklyRows, monthlyRows }) => (
          <tr key={d.id}>
            <td>{d.name}</td>
            <td>{wkBags} bags</td>
            <ProgressBar bags={wkBags} threshold={driverWeeklyThreshold} qualifies={qualifies} />
            <td>
              {qualifies ? (
                <span className="pill approved">+{driverWeeklyBonus} bonus qualified</span>
              ) : (
                <span className="pill pending">in progress</span>
              )}
            </td>
            <td>{weeksQualified(driverWeeklyAll.get(d.id), driverWeeklyThreshold)}</td>
            <td>{instantWeek}</td>
            <td>{instantYear}</td>
            <td>{totalYear}</td>
            <td>
              <IncentiveHistoryButton name={d.name} weeklyRows={weeklyRows} monthlyRows={monthlyRows} />
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
            <KpiCard label="Incentive Bags — This Week" value={custIncentiveWeekTotal} />
            <KpiCard label="Incentive Bags — This Year" value={custIncentiveYearTotal} />
          </div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="section-title">
                Customer weekly incentive — {customerWeeklyThreshold} bags/week qualifies for +{customerWeeklyBonus}{" "}
                bonus bags. Instant incentives are entered manually per truck delivery.
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
            <KpiCard label="Incentive Bags — This Week" value={drvIncentiveWeekTotal} />
            <KpiCard label="Incentive Bags — This Year" value={drvIncentiveYearTotal} />
          </div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="section-title">
                Driver weekly incentive — {driverWeeklyThreshold} bags/week qualifies for +{driverWeeklyBonus} bonus
                bags. Instant incentives are entered manually per sale.
              </div>
              <ViewAllModal title="All Drivers — Incentive Detail">{driversTable}</ViewAllModal>
            </div>
            <div className="table-wrap">{driversTable}</div>
            {drvRows.length === 0 && <div className="empty">No drivers yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
