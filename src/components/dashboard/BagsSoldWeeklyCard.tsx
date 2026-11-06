"use client";

import { useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";

export interface WeeklyBagsSoldRow {
  label: string;
  bags: number;
}

export default function BagsSoldWeeklyCard({ weekTotal, rows }: { weekTotal: number; rows: WeeklyBagsSoldRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <KpiCard
        label="Bags Sold (This Week)"
        value={`${weekTotal} bags`}
        icon="🧴"
        iconBg="rgba(47,215,196,.15)"
        iconColor="var(--teal)"
        delta="Factory + drivers + trucks — view history →"
        onClick={() => setOpen(true)}
      />
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title="Bags Sold — Weekly History" maxWidth={480}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
            Factory, driver, and truck sales combined — bonus bags are given free and aren&apos;t counted as sold.
          </div>
          {rows.length === 0 ? (
            <div className="empty">No sales recorded yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Bags sold</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <td>{r.label}</td>
                      <td>{r.bags} bags</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
