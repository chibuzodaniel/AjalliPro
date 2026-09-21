"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { getSalaryPaymentHistory, type SalaryPaymentHistoryEntry } from "@/app/(app)/salary/actions";
import { formatMoney } from "@/lib/money";

export default function SalaryPaymentHistory({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<SalaryPaymentHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (entries !== null) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getSalaryPaymentHistory(userId);
      setEntries(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payment history");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn btn-sm btn-ghost" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={handleOpen}>
        History
      </button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title={`${name} — Salary History`} maxWidth={420}>
          {loading && <div className="empty">Loading…</div>}
          {error && <div className="field-error">{error}</div>}
          {entries && entries.length === 0 && <div className="empty">No salary payments recorded yet.</div>}
          {entries && entries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {entries.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    fontSize: 13,
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 8,
                  }}
                >
                  <span>
                    {e.period}
                    <br />
                    <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
                      Marked paid by {e.paidByName},{" "}
                      {new Date(e.paidAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </span>
                  <b>{formatMoney(e.amount)}</b>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
