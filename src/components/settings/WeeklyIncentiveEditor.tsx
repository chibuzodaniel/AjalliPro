"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWeeklyIncentiveSettings } from "@/app/(app)/settings/actions";
import type { WeeklyIncentiveSettings } from "@/lib/settings";

export default function WeeklyIncentiveEditor({ initial }: { initial: WeeklyIncentiveSettings }) {
  const router = useRouter();
  const [customerThreshold, setCustomerThreshold] = useState(String(initial.customerWeeklyThreshold));
  const [customerBonus, setCustomerBonus] = useState(String(initial.customerWeeklyBonus));
  const [driverThreshold, setDriverThreshold] = useState(String(initial.driverWeeklyThreshold));
  const [driverBonus, setDriverBonus] = useState(String(initial.driverWeeklyBonus));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const result = await updateWeeklyIncentiveSettings({
      customerWeeklyThreshold: Number(customerThreshold) || 0,
      customerWeeklyBonus: Number(customerBonus) || 0,
      driverWeeklyThreshold: Number(driverThreshold) || 0,
      driverWeeklyBonus: Number(driverBonus) || 0,
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
          <label>Customer weekly threshold (bags)</label>
          <input
            type="number"
            min={1}
            value={customerThreshold}
            onChange={(e) => setCustomerThreshold(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Customer weekly bonus (bags)</label>
          <input type="number" min={0} value={customerBonus} onChange={(e) => setCustomerBonus(e.target.value)} />
        </div>
        <div className="field">
          <label>Driver weekly threshold (bags)</label>
          <input type="number" min={1} value={driverThreshold} onChange={(e) => setDriverThreshold(e.target.value)} />
        </div>
        <div className="field">
          <label>Driver weekly bonus (bags)</label>
          <input type="number" min={0} value={driverBonus} onChange={(e) => setDriverBonus(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-ghost" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save thresholds"}
        </button>
        {saved && <span style={{ fontSize: 12.5, color: "var(--green)" }}>Saved.</span>}
        {error && <span className="field-error">{error}</span>}
      </div>
    </div>
  );
}
