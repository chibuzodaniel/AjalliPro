"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { payPackerAmount, revertLastPackerPayment } from "@/app/(app)/packers/actions";
import { formatMoney } from "@/lib/money";

export default function PackerPaymentControl({ packerId, owing, paid }: { packerId: string; owing: number; paid: number }) {
  const router = useRouter();
  // Optimistic: router.refresh() can take a few seconds against this app's
  // real-world DB latency, so reflect a successful action immediately
  // rather than briefly showing stale owing/paid amounts.
  const [override, setOverride] = useState<number | null>(null);
  const effectiveOwing = override ?? owing;
  const effectivePaid = override !== null ? paid + (owing - override) : paid;

  const [value, setValue] = useState(String(owing > 0 ? owing : 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    const paymentAmount = Number(value) || 0;
    setLoading(true);
    setError(null);
    try {
      const result = await payPackerAmount(packerId, paymentAmount);
      if (!result.ok) {
        setError(result.error ?? "Could not record payment");
        return;
      }
      setOverride(effectiveOwing - paymentAmount);
      setValue(String(Math.max(0, effectiveOwing - paymentAmount)));
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
      const result = await revertLastPackerPayment(packerId);
      if (!result.ok) {
        setError(result.error ?? "Could not revert");
        return;
      }
      // We don't know the reverted payment's exact amount client-side, so
      // just fall back to the server's numbers on refresh rather than guess.
      setOverride(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revert");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {effectiveOwing > 0 ? (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              min={1}
              max={effectiveOwing}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{ width: 100 }}
              placeholder={`Up to ${effectiveOwing}`}
              disabled={loading}
            />
            <button className="btn btn-sm btn-approve" disabled={loading} onClick={handlePay}>
              {loading ? "…" : "Record payment"}
            </button>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{formatMoney(effectiveOwing)} still owing</span>
        </>
      ) : (
        <span style={{ fontSize: 12.5, color: "var(--green)" }}>Paid up</span>
      )}
      {effectivePaid > 0 && (
        <button
          className="btn btn-sm btn-ghost"
          style={{ alignSelf: "flex-start", padding: "4px 8px", fontSize: 11.5 }}
          disabled={loading}
          onClick={handleRevert}
        >
          {loading ? "…" : "Revert last payment"}
        </button>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
