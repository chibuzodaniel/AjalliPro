import { getCurrentUser } from "@/lib/auth-helpers";
import { isApprover } from "@/lib/roles";
import { getApprovedRecordsSorted, recordProdTotal, recordDriverBagsTotal } from "@/lib/records";
import { computeRevenue } from "@/lib/revenue";
import { filterRecordsByRange, parseRange, RANGE_OPTIONS, RANGE_LABEL } from "@/lib/ranges";
import { formatMoney } from "@/lib/money";
import KpiCard from "@/components/ui/KpiCard";
import RangeTabs from "@/components/ui/RangeTabs";
import { LineTrendChart } from "@/components/charts/TrendChart";
import PrintButton from "@/components/shared/PrintButton";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const user = await getCurrentUser();
  const approver = user ? isApprover(user.role) : false;

  const approvedRecords = await getApprovedRecordsSorted();
  const records = filterRecordsByRange(approvedRecords, range);

  const bagsSold = records.reduce((s, r) => s + r.factoryBags + recordDriverBagsTotal(r), 0);
  const pumpTotal = records.reduce((s, r) => s + r.pumpWaterAmount, 0);
  const produced = records.reduce((s, r) => s + recordProdTotal(r), 0);
  const revenue = computeRevenue(records);

  const labels = records.map((r) => r.date.slice(5));
  const series = records.map((r) => r.factoryBags + recordDriverBagsTotal(r));

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Reports</h1>
          <div className="sub">Sales, production &amp; revenue — weekly, monthly, yearly or overall</div>
        </div>
        <PrintButton />
      </div>
      <RangeTabs basePath="/reports" current={range} options={RANGE_OPTIONS} />

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <KpiCard label="Total Bags Sold" value={bagsSold} />
        <KpiCard label="Pump Water Sales" value={formatMoney(pumpTotal)} />
        <KpiCard label="Total Bags Produced" value={produced} />
        <KpiCard label="Total Expenses" value={formatMoney(revenue.expenses)} />
      </div>
      {approver && (
        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <KpiCard label="Net Revenue" value={formatMoney(revenue.net)} />
        </div>
      )}
      <div className="card">
        <div className="section-title">Sales trend — {RANGE_LABEL[range]}</div>
        <LineTrendChart labels={labels} series={[{ label: "Bags sold", data: series, color: "#3FDE9A" }]} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">Record detail</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Produced</th>
                <th>Factory sales</th>
                <th>Driver sales</th>
                <th>Pump water</th>
                <th>Leakages</th>
                <th>Expenses</th>
                <th>Closing stock</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text-faint)" }}>
                    No approved records in this range
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>{recordProdTotal(r)}</td>
                    <td>
                      {r.factoryBags} @ {formatMoney(r.factoryPricePerBag)}
                    </td>
                    <td>{recordDriverBagsTotal(r)} bags</td>
                    <td>{formatMoney(r.pumpWaterAmount)}</td>
                    <td>{r.leakageBags}</td>
                    <td>{formatMoney(r.expenseRolls + r.expensePackingBags + r.expenseGas + r.expenseOther)}</td>
                    <td>{r.closingStock}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
