"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markPackerPaid, revertLastPackerPayment } from "@/app/(app)/packers/actions";
import { formatMoney } from "@/lib/money";

export default function PackerPaymentControl({ packerId, owing }: { packerId: string; owing: number }) {
  const router = useRouter();
  // Optimistic: router.refresh() can take a few seconds against this app's
  // real-world DB latency, so reflect a successful action immediately rather
  // than briefly showing stale paid/unpaid state (or a stale owing amount).
  const [override, setOverride] = useState<boolean | null>(null);
  const paidUp = override ?? owing <= 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaid() {
    setLoading(true);
    setError(null);
    try {
      const result = await markPackerPaid(packerId);
      if (!result.ok) {
        setError(result.error ?? "Could not mark as paid");
        return;
      }
      setOverride(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark as paid");
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
      setOverride(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revert");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {paidUp ? (
        <>
          <span style={{ fontSize: 12.5, color: "var(--green)" }}>Paid up</span>
          <button
            className="btn btn-sm btn-ghost"
            style={{ alignSelf: "flex-start", padding: "4px 8px", fontSize: 11.5 }}
            disabled={loading}
            onClick={handleRevert}
          >
            {loading ? "…" : "Revert last payment"}
          </button>
        </>
      ) : (
        <button className="btn btn-sm btn-approve" disabled={loading} onClick={handleMarkPaid}>
          {loading ? "…" : `Mark ${formatMoney(owing)} paid`}
        </button>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
