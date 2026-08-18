"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePackerPricing } from "@/app/(app)/packers/actions";

export default function PackerPricingEditor({
  packerId,
  pricePerBag,
}: {
  packerId: string;
  pricePerBag: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(pricePerBag));
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
    const result = await updatePackerPricing(packerId, { pricePerBag: Number(price) || 0 });
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
      <input
        type="number"
        min={0}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        style={{ width: 70 }}
        title="Pay per bag (₦)"
      />
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
