"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { IncentiveHistoryRow } from "@/lib/incentives";

function HistoryTable({ title, rows }: { title: string; rows: IncentiveHistoryRow[] }) {
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
                <th>Bags</th>
                <th>Incentive bags earned</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>{r.bags}</td>
                  <td>
                    <b>{r.bonusBags}</b>
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

export default function IncentiveHistoryButton({
  name,
  weeklyRows,
  monthlyRows,
}: {
  name: string;
  weeklyRows: IncentiveHistoryRow[];
  monthlyRows: IncentiveHistoryRow[];
}) {
  const [open, setOpen] = useState(false);
  const totalBonus = monthlyRows.reduce((s, r) => s + r.bonusBags, 0);

  if (weeklyRows.length === 0) return null;

  return (
    <>
      <button
        className="btn btn-sm btn-ghost"
        style={{ padding: "4px 8px", fontSize: 11.5 }}
        onClick={() => setOpen(true)}
      >
        History
      </button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title={`${name} — Incentive History`} maxWidth={600}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
            Every incentive bag earned — threshold bonus (weeks a bag total qualified) plus any manually-entered
            instant bonus — broken down by period. All-time total: <b>{totalBonus} bags</b>.
          </div>
          <HistoryTable title="By week" rows={weeklyRows} />
          <HistoryTable title="By month" rows={monthlyRows} />
        </Modal>
      )}
    </>
  );
}
