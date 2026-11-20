"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { IncentiveHistoryRow } from "@/lib/incentives";
import type { IncentiveAwardStatus } from "@/lib/incentiveAwards";

function StatusPill({ status }: { status: IncentiveAwardStatus | undefined }) {
  if (status === "RECEIVED") return <span className="pill approved">received</span>;
  if (status === "AWAITING") return <span className="pill pending">awaiting approval</span>;
  if (status === "NOT_RECEIVED") return <span className="pill rejected">not received</span>;
  return <span style={{ color: "var(--text-faint)" }}>—</span>;
}

function HistoryTable({
  title,
  rows,
  weekStatuses,
}: {
  title: string;
  rows: IncentiveHistoryRow[];
  /** Only passed for the weekly table — weekly-threshold bonus approval is a per-week thing. */
  weekStatuses?: Record<string, IncentiveAwardStatus>;
}) {
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
                {weekStatuses && <th>Weekly bonus status</th>}
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
                  {weekStatuses && (
                    <td>
                      <StatusPill status={weekStatuses[r.label]} />
                    </td>
                  )}
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
  weekStatuses = {},
}: {
  name: string;
  weeklyRows: IncentiveHistoryRow[];
  monthlyRows: IncentiveHistoryRow[];
  yearlyRows: IncentiveHistoryRow[];
  weekStatuses?: Record<string, IncentiveAwardStatus>;
}) {
  const [open, setOpen] = useState(false);
  const totalInstant = yearlyRows.reduce((s, r) => s + r.instantBags, 0);
  const totalThreshold = yearlyRows.reduce((s, r) => s + r.thresholdBags, 0);
  const statuses = Object.values(weekStatuses);
  const received = statuses.filter((s) => s === "RECEIVED").length;
  const notReceived = statuses.filter((s) => s === "NOT_RECEIVED").length;
  const awaiting = statuses.filter((s) => s === "AWAITING").length;

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
        <Modal open={open} onClose={() => setOpen(false)} title={`${name} — Incentive History`} maxWidth={760}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
            Instant bonus (entered manually per sale, given and deducted the moment that daily record is approved) is
            kept separate from weekly-threshold bonus (earned once a week&apos;s bags cross the threshold, only given once
            Admin/Super Admin approves that week) — broken down by period. All-time: <b>{totalInstant}</b> instant +{" "}
            <b>{totalThreshold}</b> weekly-threshold.
            {statuses.length > 0 && (
              <>
                {" "}
                Weekly bonuses: <b>{received}</b> received, <b>{awaiting}</b> awaiting approval, <b>{notReceived}</b>{" "}
                not received.
              </>
            )}
          </div>
          <HistoryTable title="By week" rows={weeklyRows} weekStatuses={weekStatuses} />
          <HistoryTable title="By month" rows={monthlyRows} />
          <HistoryTable title="By year" rows={yearlyRows} />
        </Modal>
      )}
    </>
  );
}
