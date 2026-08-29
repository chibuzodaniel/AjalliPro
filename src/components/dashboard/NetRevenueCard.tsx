"use client";

import { useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";

export interface PeriodRow {
  label: string;
  gross: number;
  expenses: number;
  net: number;
}

function HistoryTable({ title, rows }: { title: string; rows: PeriodRow[] }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: "var(--text-dim)" }}>{title}</div>
      {rows.length === 0 ? (
        <div className="empty">No data yet</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>{formatMoney(r.gross)}</td>
                  <td>{formatMoney(r.expenses)}</td>
                  <td>
                    <b>{formatMoney(r.net)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function NetRevenueCard({
  weekNet,
  weeklyHistory,
  monthlyHistory,
  yearlyHistory,
}: {
  weekNet: number;
  weeklyHistory: PeriodRow[];
  monthlyHistory: PeriodRow[];
  yearlyHistory: PeriodRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <KpiCard
        label="Net Revenue (This Week)"
        value={formatMoney(weekNet)}
        icon="📊"
        iconBg="rgba(63,222,154,.15)"
        iconColor="var(--green)"
        delta="Revenue minus every expense — view history →"
        onClick={() => setOpen(true)}
      />
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title="Net Revenue History" maxWidth={700}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
            Revenue (pump + sachet sales) minus every expense logged, for each period.
          </div>
          <HistoryTable title="By week" rows={weeklyHistory} />
          <HistoryTable title="By month" rows={monthlyHistory} />
          <HistoryTable title="By year" rows={yearlyHistory} />
        </Modal>
      )}
    </>
  );
}
