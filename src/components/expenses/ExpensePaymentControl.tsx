"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordExpensePayment } from "@/app/(app)/expenses/actions";
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
  const remaining = amount - amountPaid;
  const [value, setValue] = useState(String(remaining));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (remaining <= 0) {
    return <span style={{ fontSize: 12.5, color: "var(--green)" }}>Paid in full</span>;
  }

  async function handlePay() {
    const paymentAmount = Number(value) || 0;
    setLoading(true);
    setError(null);
    const result = await recordExpensePayment(id, paymentAmount);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not record payment");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="number"
          min={1}
          max={remaining}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ width: 100 }}
          placeholder={`Up to ${remaining}`}
        />
        <button className="btn btn-sm btn-approve" disabled={loading} onClick={handlePay}>
          {loading ? "…" : "Record payment"}
        </button>
      </div>
      <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
        {formatMoney(remaining)} still owing
      </span>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
