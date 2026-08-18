"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePackerPriceSetting } from "@/app/(app)/settings/actions";

export default function PackerPriceEditor({ initial }: { initial: number }) {
  const router = useRouter();
  const [price, setPrice] = useState(String(initial));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const result = await updatePackerPriceSetting({ packerPricePerBag: Number(price) || 0 });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <div className="field">
        <label>Packer pay (₦ per bag)</label>
        <input type="number" min={0} placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-ghost" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save rate"}
        </button>
        {saved && <span style={{ fontSize: 12.5, color: "var(--green)" }}>Saved.</span>}
        {error && <span className="field-error">{error}</span>}
      </div>
    </div>
  );
}
