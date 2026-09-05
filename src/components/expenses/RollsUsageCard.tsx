"use client";

import { useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";

export interface RollsKgRow {
  label: string;
  kg: number;
}

function fmtKg(kg: number) {
  return `${kg.toFixed(1)} kg`;
}

function KgHistoryTable({ title, rows }: { title: string; rows: RollsKgRow[] }) {
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
                <th>Rolls used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>
                    <b>{fmtKg(r.kg)}</b>
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

export default function RollsUsageCard({
  weekKg,
  weeklyHistory,
  monthlyHistory,
  yearlyHistory,
}: {
  weekKg: number;
  weeklyHistory: RollsKgRow[];
  monthlyHistory: RollsKgRow[];
  yearlyHistory: RollsKgRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <KpiCard
        label="Rolls Used (This Week)"
        value={fmtKg(weekKg)}
        icon="🧻"
        iconBg="rgba(47,215,196,.15)"
        iconColor="var(--teal)"
        delta="From rolls expenses ÷ ₦/kg — view history →"
        onClick={() => setOpen(true)}
      />
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title="Rolls Usage History" maxWidth={600}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
            Every "Rolls" expense's ₦ amount divided by the rolls price (₦/kg) set on Settings at the time it was
            logged, for each period.
          </div>
          <KgHistoryTable title="By week" rows={weeklyHistory} />
          <KgHistoryTable title="By month" rows={monthlyHistory} />
          <KgHistoryTable title="By year" rows={yearlyHistory} />
        </Modal>
      )}
    </>
  );
}
