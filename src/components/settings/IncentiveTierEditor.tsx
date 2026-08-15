"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateIncentiveTiers } from "@/app/(app)/settings/actions";

interface Tier {
  key: number;
  min: string;
  max: string;
  bonus: string;
}

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return keySeq;
}

export default function IncentiveTierEditor({
  initialTiers,
}: {
  initialTiers: { min: number; max: number; bonus: number }[];
}) {
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>(
    initialTiers.map((t) => ({ key: nextKey(), min: String(t.min), max: String(t.max), bonus: String(t.bonus) }))
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(key: number, field: keyof Omit<Tier, "key">, value: string) {
    setTiers((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    const payload = tiers.map((t) => ({
      min: Number(t.min) || 0,
      max: Number(t.max) || 0,
      bonus: Number(t.bonus) || 0,
    }));
    const result = await updateIncentiveTiers(payload);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save tiers");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Min bags</th>
              <th>Max bags</th>
              <th>Bonus bags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.key}>
                <td>
                  <input type="number" min={0} value={t.min} onChange={(e) => update(t.key, "min", e.target.value)} style={{ width: 90 }} />
                </td>
                <td>
                  <input type="number" min={0} value={t.max} onChange={(e) => update(t.key, "max", e.target.value)} style={{ width: 90 }} />
                </td>
                <td>
                  <input type="number" min={0} value={t.bonus} onChange={(e) => update(t.key, "bonus", e.target.value)} style={{ width: 90 }} />
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setTiers((rows) => rows.filter((r) => r.key !== t.key))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="add-row-btn"
        style={{ marginTop: 10 }}
        onClick={() => setTiers((rows) => [...rows, { key: nextKey(), min: "0", max: "0", bonus: "0" }])}
      >
        + Add tier
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button className="btn btn-ghost" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save tiers"}
        </button>
        {saved && <span style={{ fontSize: 12.5, color: "var(--green)" }}>Saved.</span>}
        {error && <span className="field-error">{error}</span>}
      </div>
      <div className="hint" style={{ marginTop: 8 }}>
        This table is for per-sale bonuses only. The separate weekly bonus thresholds (customers/drivers hitting a
        bag total in one week) are edited below.
      </div>
    </div>
  );
}
