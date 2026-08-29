"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { getExpensePaymentHistory, type ExpensePaymentHistoryEntry } from "@/app/(app)/expenses/actions";
import { formatMoney } from "@/lib/money";

export default function ExpensePaymentHistory({ expenseItemId, count }: { expenseItemId: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<ExpensePaymentHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (entries !== null) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getExpensePaymentHistory(expenseItemId);
      setEntries(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payment history");
    } finally {
      setLoading(false);
    }
  }

  if (count === 0) return null;

  return (
    <>
      <button
        className="btn btn-sm btn-ghost"
        style={{ padding: "4px 8px", fontSize: 11.5 }}
        onClick={handleOpen}
      >
        History ({count})
      </button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title="Payment history" maxWidth={420}>
          {loading && <div className="empty">Loading…</div>}
          {error && <div className="field-error">{error}</div>}
          {entries && entries.length === 0 && <div className="empty">No payments recorded.</div>}
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
                    {e.paidByName}
                    <br />
                    <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
                      {new Date(e.paidAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </span>
                  <b>{formatMoney(e.amount)}</b>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                <span>Total paid</span>
                <span>{formatMoney(entries.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
