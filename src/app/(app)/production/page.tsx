import { getApprovedRecordsSorted, recordProdTotal } from "@/lib/records";
import { filterRecordsByRange, parseRange, RANGE_OPTIONS, RANGE_LABEL } from "@/lib/ranges";
import KpiCard from "@/components/ui/KpiCard";
import RangeTabs from "@/components/ui/RangeTabs";
import ViewAllModal from "@/components/ui/ViewAllModal";
import { BarTrendChart } from "@/components/charts/DynamicTrendChart";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const custom = { from: sp.from, to: sp.to };

  const approvedRecords = await getApprovedRecordsSorted();
  const records = filterRecordsByRange(approvedRecords, range, custom);

  const total = records.reduce((s, r) => s + recordProdTotal(r), 0);
  const days = records.filter((r) => recordProdTotal(r) > 0).length;
  const avg = days ? Math.round(total / days) : 0;

  const packerTotals = new Map<string, number>();
  for (const r of records) {
    for (const p of r.productionLines) {
      packerTotals.set(p.packer.name, (packerTotals.get(p.packer.name) ?? 0) + p.bags);
    }
  }
  const sortedPackers = [...packerTotals.entries()].sort((a, b) => b[1] - a[1]);
  const topPacker = sortedPackers.length ? `${sortedPackers[0][0]} (${sortedPackers[0][1]})` : "—";

  const labels = records.map((r) => r.date.slice(5));
  const series = records.map((r) => recordProdTotal(r));

  const packerTable = (
    <table>
      <thead>
        <tr>
          <th>Packer</th>
          <th>Bags packed</th>
          <th>Share of total</th>
        </tr>
      </thead>
      <tbody>
        {sortedPackers.map(([name, bags]) => (
          <tr key={name}>
            <td>{name}</td>
            <td>{bags}</td>
            <td>{total ? Math.round((bags / total) * 100) : 0}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Total Produced</h1>
          <div className="sub">Bags packed by day and by packer, from approved daily records</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <RangeTabs basePath="/production" current={range} options={RANGE_OPTIONS} />
        <form method="get" action="/production" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="hidden" name="range" value="custom" />
          <input type="date" name="from" defaultValue={sp.from ?? ""} style={{ width: 145 }} />
          <span style={{ color: "var(--text-faint)", fontSize: 12.5 }}>to</span>
          <input type="date" name="to" defaultValue={sp.to ?? ""} style={{ width: 145 }} />
          <button type="submit" className={`tab-btn ${range === "custom" ? "active" : ""}`}>
            View dates
          </button>
        </form>
      </div>
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <KpiCard label="Total Bags Produced" value={total} />
        <KpiCard label="Production Days" value={days} />
        <KpiCard label="Avg / Production Day" value={avg} />
        <KpiCard label="Top Packer" value={<span style={{ fontSize: 17 }}>{topPacker}</span>} />
      </div>
      <div className="card">
        <div className="section-title">Bags produced trend — {RANGE_LABEL[range]}</div>
        {range === "custom" && !custom.from && !custom.to ? (
          <div className="empty">Pick a start and/or end date above to view production for that period.</div>
        ) : (
          <BarTrendChart labels={labels} series={[{ label: "Bags produced", data: series, color: "#2FD7C4" }]} />
        )}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="section-title">Packer breakdown</div>
          <ViewAllModal title="All Packers">{packerTable}</ViewAllModal>
        </div>
        <div className="table-wrap">{packerTable}</div>
        {sortedPackers.length === 0 && <div className="empty">No production logged in this range.</div>}
      </div>
    </div>
  );
}
