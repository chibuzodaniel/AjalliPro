import { prisma } from "@/lib/prisma";
import { getApprovedRecordsSorted } from "@/lib/records";
import { computeIncentiveData, weeksQualified, weeksQualifiedInYear, yearTotal } from "@/lib/incentives";
import { currentWeekKey } from "@/lib/week";
import { getWeeklyIncentiveSettings } from "@/lib/settings";
import KpiCard from "@/components/ui/KpiCard";
import RangeTabs from "@/components/ui/RangeTabs";

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

  const [customers, drivers, approvedRecords, weeklySettings] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.driver.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }),
    getApprovedRecordsSorted(),
    getWeeklyIncentiveSettings(),
  ]);
  const {
    customerWeekly,
    driverWeekly,
    customerYearly,
    driverInstantWeekly,
    driverInstantYearly,
    customerInstantWeekly,
    customerInstantYearly,
  } = computeIncentiveData(approvedRecords);
  const wk = currentWeekKey();
  const year = new Date().getFullYear();
  const { customerWeeklyThreshold, customerWeeklyBonus, driverWeeklyThreshold, driverWeeklyBonus } = weeklySettings;

  const custRows = customers.map((c) => {
    const wkBags = customerWeekly.get(c.id)?.[wk] ?? 0;
    const qualifies = wkBags >= customerWeeklyThreshold;
    const thresholdBonusYear =
      weeksQualifiedInYear(customerWeekly.get(c.id), customerWeeklyThreshold, year) * customerWeeklyBonus;
    const instantWeek = customerInstantWeekly.get(c.id)?.[wk] ?? 0;
    const instantYear = yearTotal(customerInstantYearly.get(c.id), year);
    const weekBonusBags = (qualifies ? customerWeeklyBonus : 0) + instantWeek;
    const yearBonusBags = thresholdBonusYear + instantYear;
    return { c, wkBags, qualifies, instantWeek, instantYear, weekBonusBags, yearBonusBags };
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
    const yearBonusBags = weeksQualifiedInYear(driverWeekly.get(d.id), driverWeeklyThreshold, year) * driverWeeklyBonus;
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
    };
  });
  const drvQualified = drvRows.filter((r) => r.qualifies).length;
  const drvAvg = drvRows.length ? Math.round(drvRows.reduce((s, r) => s + r.wkBags, 0) / drvRows.length) : 0;
  const drvIncentiveWeekTotal = drvRows.reduce((s, r) => s + r.totalWeek, 0);
  const drvIncentiveYearTotal = drvRows.reduce((s, r) => s + r.totalYear, 0);

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
            <div className="section-title">
              Customer weekly incentive — {customerWeeklyThreshold} bags/week qualifies for +{customerWeeklyBonus}{" "}
              bonus bags. Instant incentives are entered manually per truck delivery.
            </div>
            <div className="table-wrap">
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
                  </tr>
                </thead>
                <tbody>
                  {custRows.map(({ c, wkBags, qualifies, instantWeek, instantYear, yearBonusBags }) => (
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
                      <td>{weeksQualified(customerWeekly.get(c.id), customerWeeklyThreshold)}</td>
                      <td>{yearTotal(customerYearly.get(c.id), year)}</td>
                      <td>{instantWeek}</td>
                      <td>{instantYear}</td>
                      <td>{yearBonusBags}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <div className="section-title">
              Driver weekly incentive — {driverWeeklyThreshold} bags/week qualifies for +{driverWeeklyBonus} bonus
              bags. Instant incentives are entered manually per sale.
            </div>
            <div className="table-wrap">
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
                  </tr>
                </thead>
                <tbody>
                  {drvRows.map(({ d, wkBags, qualifies, instantWeek, instantYear, totalYear }) => (
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
                      <td>{weeksQualified(driverWeekly.get(d.id), driverWeeklyThreshold)}</td>
                      <td>{instantWeek}</td>
                      <td>{instantYear}</td>
                      <td>{totalYear}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {drvRows.length === 0 && <div className="empty">No drivers yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
