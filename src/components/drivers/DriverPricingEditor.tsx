"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDriverPricing } from "@/app/(app)/drivers/actions";

export default function DriverPricingEditor({
  driverId,
  pricePerBag,
  loadingFee,
}: {
  driverId: string;
  pricePerBag: number;
  loadingFee: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(pricePerBag));
  const [fee, setFee] = useState(String(loadingFee));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>
        Edit
      </button>
    );
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    const result = await updateDriverPricing(driverId, {
      pricePerBag: Number(price) || 0,
      loadingFee: Number(fee) || 0,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 70 }} />
      <input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} style={{ width: 70 }} />
      <button className="btn btn-sm btn-approve" disabled={loading} onClick={handleSave}>
        Save
      </button>
      <button className="btn btn-sm btn-ghost" disabled={loading} onClick={() => setEditing(false)}>
        ✕
      </button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
