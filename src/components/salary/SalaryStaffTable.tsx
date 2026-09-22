"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markSalaryPaidBulk } from "@/app/(app)/salary/actions";
import StaffSalarySettingsEditor from "./StaffSalarySettingsEditor";
import SalaryPaymentControl from "./SalaryPaymentControl";
import SalaryPaymentHistory from "./SalaryPaymentHistory";

export interface StaffSalaryRow {
  id: string;
  name: string;
  /** Pre-resolved display label — null means hidden (e.g. Super Admin, from a non-Super-Admin viewer). */
  roleLabel: string | null;
  salaryAmount: number;
  phone: string | null;
  paid: boolean;
}

export default function SalaryStaffTable({ staff, period }: { staff: StaffSalaryRow[]; period: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<"selected" | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ paidCount: number; skipped: { name: string; reason: string }[] } | null>(
    null
  );

  const unpaid = staff.filter((s) => !s.paid);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllUnpaid() {
    setSelected((prev) => (prev.size === unpaid.length ? new Set() : new Set(unpaid.map((s) => s.id))));
  }

  async function runBulk(ids: string[], mode: "selected" | "all") {
    if (ids.length === 0) return;
    setLoading(mode);
    setError(null);
    setSummary(null);
    const result = await markSalaryPaidBulk(ids, period);
    setLoading(null);
    if (!result.ok) {
      setError(result.error ?? "Could not mark salaries as paid");
      return;
    }
    setSummary({ paidCount: result.paidCount, skipped: result.skipped });
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <button
          className="btn btn-sm btn-approve"
          disabled={loading !== null || selected.size === 0}
          onClick={() => runBulk([...selected], "selected")}
        >
          {loading === "selected" ? "Marking…" : `Mark selected as paid (${selected.size})`}
        </button>
        <button
          className="btn btn-sm btn-ghost"
          disabled={loading !== null || unpaid.length === 0}
          onClick={() => runBulk(unpaid.map((s) => s.id), "all")}
        >
          {loading === "all" ? "Marking…" : `Mark all as paid (${unpaid.length})`}
        </button>
      </div>
      {error && <div className="field-error" style={{ marginBottom: 10 }}>{error}</div>}
      {summary && (
        <div className="calc-box" style={{ marginBottom: 12, flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <span>
            Marked <b>{summary.paidCount}</b> salar{summary.paidCount === 1 ? "y" : "ies"} as paid
            {summary.skipped.length ? `, ${summary.skipped.length} skipped` : ""}.
          </span>
          {summary.skipped.map((s) => (
            <span key={s.name} style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
              {s.name}: {s.reason}
            </span>
          ))}
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={unpaid.length > 0 && selected.size === unpaid.length}
                  onChange={toggleAllUnpaid}
                  disabled={unpaid.length === 0}
                  title="Select all unpaid"
                />
              </th>
              <th>Name</th>
              <th>Role</th>
              <th>Salary / phone</th>
              <th>This month ({period})</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>
                  {!s.paid && (
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                  )}
                </td>
                <td>{s.name}</td>
                <td>{s.roleLabel && <span className="badge-role">{s.roleLabel}</span>}</td>
                <td>
                  <StaffSalarySettingsEditor userId={s.id} initialAmount={s.salaryAmount} initialPhone={s.phone} />
                </td>
                <td>
                  <SalaryPaymentControl userId={s.id} period={period} initialPaid={s.paid} salaryAmount={s.salaryAmount} />
                </td>
                <td>
                  <SalaryPaymentHistory userId={s.id} name={s.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {staff.length === 0 && <div className="empty">No staff accounts yet.</div>}
    </div>
  );
}
