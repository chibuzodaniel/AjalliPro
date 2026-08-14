import { prisma } from "@/lib/prisma";
import { getApprovedRecordsSorted } from "@/lib/records";
import { computeIncentiveData, weeksQualified } from "@/lib/incentives";
import { currentWeekKey } from "@/lib/week";
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

  const [customers, drivers, approvedRecords] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.driver.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }),
    getApprovedRecordsSorted(),
  ]);
  const { customerWeekly, driverWeekly, customerYearly } = computeIncentiveData(approvedRecords);
  const wk = currentWeekKey();
  const year = new Date().getFullYear();

  const custRows = customers.map((c) => {
    const wkBags = customerWeekly.get(c.id)?.[wk] ?? 0;
    return { c, wkBags, qualifies: wkBags >= 500 };
  });
  const custQualified = custRows.filter((r) => r.qualifies).length;
  const custAvg = custRows.length ? Math.round(custRows.reduce((s, r) => s + r.wkBags, 0) / custRows.length) : 0;

  const drvRows = drivers.map((d) => {
    const wkBags = driverWeekly.get(d.id)?.[wk] ?? 0;
    return { d, wkBags, qualifies: wkBags >= 1000 };
  });
  const drvQualified = drvRows.filter((r) => r.qualifies).length;
  const drvAvg = drvRows.length ? Math.round(drvRows.reduce((s, r) => s + r.wkBags, 0) / drvRows.length) : 0;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Incentive Tracking</h1>
          <div className="sub">Weekly bag totals against customer (500) and driver (1,000) bonus thresholds</div>
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
          <div className="grid grid-3" style={{ marginBottom: 18 }}>
            <KpiCard label="Qualified This Week" value={custQualified} />
            <KpiCard label="Bonus Bags This Week" value={custQualified * 5} />
            <KpiCard label="Avg Bags / Customer" value={custAvg} />
          </div>
          <div className="card">
            <div className="section-title">Customer weekly incentive — 500 bags/week qualifies for +5 bonus bags</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>This week</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Weeks qualified (all-time)</th>
                    <th>Year-to-date</th>
                  </tr>
                </thead>
                <tbody>
                  {custRows.map(({ c, wkBags, qualifies }) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{wkBags} bags</td>
                      <ProgressBar bags={wkBags} threshold={500} qualifies={qualifies} />
                      <td>
                        {qualifies ? (
                          <span className="pill approved">+5 bonus qualified</span>
                        ) : (
                          <span className="pill pending">in progress</span>
                        )}
                      </td>
                      <td>{weeksQualified(customerWeekly.get(c.id), 500)}</td>
                      <td>{customerYearly.get(c.id)?.[year] ?? 0}</td>
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
          <div className="grid grid-3" style={{ marginBottom: 18 }}>
            <KpiCard label="Qualified This Week" value={drvQualified} />
            <KpiCard label="Bonus Bags This Week" value={drvQualified * 10} />
            <KpiCard label="Avg Bags / Driver" value={drvAvg} />
          </div>
          <div className="card">
            <div className="section-title">Driver weekly incentive — 1,000 bags/week qualifies for +10 bonus bags</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>This week</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Weeks qualified (all-time)</th>
                  </tr>
                </thead>
                <tbody>
                  {drvRows.map(({ d, wkBags, qualifies }) => (
                    <tr key={d.id}>
                      <td>{d.name}</td>
                      <td>{wkBags} bags</td>
                      <ProgressBar bags={wkBags} threshold={1000} qualifies={qualifies} />
                      <td>
                        {qualifies ? (
                          <span className="pill approved">+10 bonus qualified</span>
                        ) : (
                          <span className="pill pending">in progress</span>
                        )}
                      </td>
                      <td>{weeksQualified(driverWeekly.get(d.id), 1000)}</td>
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
