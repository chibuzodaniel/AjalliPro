"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setStaffSalarySettings } from "@/app/(app)/salary/actions";

export default function StaffSalarySettingsEditor({
  userId,
  initialAmount,
  initialPhone,
}: {
  userId: string;
  initialAmount: number;
  initialPhone: string | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(initialAmount || ""));
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const result = await setStaffSalarySettings(userId, { salaryAmount: Number(amount) || 0, phone });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="₦/month"
          style={{ width: 110 }}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (for SMS)"
          style={{ width: 130 }}
        />
        <button className="btn btn-sm btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleSave} disabled={loading}>
          {loading ? "…" : "Save"}
        </button>
      </div>
      {saved && <span style={{ fontSize: 11.5, color: "var(--green)" }}>Saved.</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
