"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordExpensePayment, revertExpensePayment } from "@/app/(app)/expenses/actions";
import { formatMoney } from "@/lib/money";

export default function ExpensePaymentControl({
  id,
  amount,
  amountPaid,
}: {
  id: string;
  amount: number;
  amountPaid: number;
}) {
  const router = useRouter();
  // Optimistic: reflects a successful action immediately rather than
  // waiting on router.refresh() to re-fetch, which can take several
  // seconds and would otherwise make the control briefly show stale data.
  const [override, setOverride] = useState<number | null>(null);
  const effectiveAmountPaid = override ?? amountPaid;
  const remaining = amount - effectiveAmountPaid;

  const [value, setValue] = useState(String(remaining > 0 ? remaining : 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    const paymentAmount = Number(value) || 0;
    setLoading(true);
    setError(null);
    try {
      const result = await recordExpensePayment(id, paymentAmount);
      if (!result.ok) {
        setError(result.error ?? "Could not record payment");
        return;
      }
      setOverride(effectiveAmountPaid + paymentAmount);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevert() {
    setLoading(true);
    setError(null);
    try {
      const result = await revertExpensePayment(id);
      if (!result.ok) {
        setError(result.error ?? "Could not revert payment");
        return;
      }
      setOverride(0);
      setValue(String(amount));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revert payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {remaining > 0 ? (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              min={1}
              max={remaining}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{ width: 100 }}
              placeholder={`Up to ${remaining}`}
              disabled={loading}
            />
            <button className="btn btn-sm btn-approve" disabled={loading} onClick={handlePay}>
              {loading ? "…" : "Record payment"}
            </button>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{formatMoney(remaining)} still owing</span>
        </>
      ) : (
        <span style={{ fontSize: 12.5, color: "var(--green)" }}>Paid in full</span>
      )}
      {effectiveAmountPaid > 0 && (
        <button
          className="btn btn-sm btn-ghost"
          style={{ alignSelf: "flex-start", padding: "4px 8px", fontSize: 11.5 }}
          disabled={loading}
          onClick={handleRevert}
        >
          {loading ? "…" : "Revert to unpaid"}
        </button>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
