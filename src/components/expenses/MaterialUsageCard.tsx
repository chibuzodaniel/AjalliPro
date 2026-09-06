"use client";

import { useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";

export interface MaterialQtyRow {
  label: string;
  qty: number;
}

function MaterialQtyHistoryTable({
  title,
  columnLabel,
  unit,
  rows,
}: {
  title: string;
  columnLabel: string;
  unit: string;
  rows: MaterialQtyRow[];
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
                <th>{columnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>
                    <b>{r.qty.toFixed(1)} {unit}</b>
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
  unit,
  icon,
  iconBg,
  iconColor,
  weekQty,
  weeklyHistory,
  monthlyHistory,
  yearlyHistory,
}: {
  materialName: string;
  unit: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  weekQty: number;
  weeklyHistory: MaterialQtyRow[];
  monthlyHistory: MaterialQtyRow[];
  yearlyHistory: MaterialQtyRow[];
}) {
  const [open, setOpen] = useState(false);
  const columnLabel = `${materialName} used`;

  return (
    <>
      <KpiCard
        label={`${materialName} Used (This Week)`}
        value={`${weekQty.toFixed(1)} ${unit}`}
        icon={icon}
        iconBg={iconBg}
        iconColor={iconColor}
        delta={`From ${materialName.toLowerCase()} expenses ÷ ₦/${unit} — view history →`}
        onClick={() => setOpen(true)}
      />
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title={`${materialName} Usage History`} maxWidth={600}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
            Every "{materialName}" expense's ₦ amount divided by its price (₦/{unit}) set on Settings at the time it
            was logged, for each period.
          </div>
          <MaterialQtyHistoryTable title="By week" columnLabel={columnLabel} unit={unit} rows={weeklyHistory} />
          <MaterialQtyHistoryTable title="By month" columnLabel={columnLabel} unit={unit} rows={monthlyHistory} />
          <MaterialQtyHistoryTable title="By year" columnLabel={columnLabel} unit={unit} rows={yearlyHistory} />
        </Modal>
      )}
    </>
  );
}
