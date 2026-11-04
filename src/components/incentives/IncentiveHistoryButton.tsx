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
                <th>Instant bonus</th>
                <th>Weekly-threshold bonus</th>
                <th>Total bonus</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>{r.bags}</td>
                  <td>{r.instantBags}</td>
                  <td>{r.thresholdBags}</td>
                  <td>
                    <b>{r.instantBags + r.thresholdBags}</b>
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
  yearlyRows,
}: {
  name: string;
  weeklyRows: IncentiveHistoryRow[];
  monthlyRows: IncentiveHistoryRow[];
  yearlyRows: IncentiveHistoryRow[];
}) {
  const [open, setOpen] = useState(false);
  const totalInstant = yearlyRows.reduce((s, r) => s + r.instantBags, 0);
  const totalThreshold = yearlyRows.reduce((s, r) => s + r.thresholdBags, 0);

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
        <Modal open={open} onClose={() => setOpen(false)} title={`${name} — Incentive History`} maxWidth={680}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
            Instant bonus (entered manually per sale, deducted the moment that daily record is approved) is kept
            separate from weekly-threshold bonus (earned once a week's bags cross the threshold, only deducted once
            Admin/Super Admin approves that week) — broken down by period. All-time: <b>{totalInstant}</b> instant +{" "}
            <b>{totalThreshold}</b> weekly-threshold.
          </div>
          <HistoryTable title="By week" rows={weeklyRows} />
          <HistoryTable title="By month" rows={monthlyRows} />
          <HistoryTable title="By year" rows={yearlyRows} />
        </Modal>
      )}
    </>
  );
}
