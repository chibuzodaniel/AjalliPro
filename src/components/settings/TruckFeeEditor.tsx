"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTruckFeeSettings } from "@/app/(app)/settings/actions";

export default function TruckFeeEditor({
  initialLoading,
  initialOffloading,
}: {
  initialLoading: number;
  initialOffloading: number;
}) {
  const router = useRouter();
  const [loadingFee, setLoadingFee] = useState(String(initialLoading));
  const [offloadingFee, setOffloadingFee] = useState(String(initialOffloading));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const result = await updateTruckFeeSettings({
      truckLoadingFeePerBag: Number(loadingFee) || 0,
      truckOffloadingFeePerBag: Number(offloadingFee) || 0,
    });
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
      <div className="form-grid">
        <div className="field">
          <label>Loading fee (₦ per bag)</label>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={loadingFee}
            onChange={(e) => setLoadingFee(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Offloading fee (₦ per bag)</label>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={offloadingFee}
            onChange={(e) => setOffloadingFee(e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-ghost" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save rates"}
        </button>
        {saved && <span style={{ fontSize: 12.5, color: "var(--green)" }}>Saved.</span>}
        {error && <span className="field-error">{error}</span>}
      </div>
    </div>
  );
}
