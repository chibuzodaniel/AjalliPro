"use client";

import { useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";

export interface MaterialKgRow {
  label: string;
  kg: number;
}

function fmtKg(kg: number) {
  return `${kg.toFixed(1)} kg`;
}

function KgHistoryTable({ title, columnLabel, rows }: { title: string; columnLabel: string; rows: MaterialKgRow[] }) {
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
                <th>{columnLabel}</th>
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

export default function MaterialUsageCard({
  materialName,
  icon,
  iconBg,
  iconColor,
  weekKg,
  weeklyHistory,
  monthlyHistory,
  yearlyHistory,
}: {
  materialName: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  weekKg: number;
  weeklyHistory: MaterialKgRow[];
  monthlyHistory: MaterialKgRow[];
  yearlyHistory: MaterialKgRow[];
}) {
  const [open, setOpen] = useState(false);
  const columnLabel = `${materialName} used`;

  return (
    <>
      <KpiCard
        label={`${materialName} Used (This Week)`}
        value={fmtKg(weekKg)}
        icon={icon}
        iconBg={iconBg}
        iconColor={iconColor}
        delta={`From ${materialName.toLowerCase()} expenses ÷ ₦/kg — view history →`}
        onClick={() => setOpen(true)}
      />
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title={`${materialName} Usage History`} maxWidth={600}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
            Every "{materialName}" expense's ₦ amount divided by its price (₦/kg) set on Settings at the time it was
            logged, for each period.
          </div>
          <KgHistoryTable title="By week" columnLabel={columnLabel} rows={weeklyHistory} />
          <KgHistoryTable title="By month" columnLabel={columnLabel} rows={monthlyHistory} />
          <KgHistoryTable title="By year" columnLabel={columnLabel} rows={yearlyHistory} />
        </Modal>
      )}
    </>
  );
}
