"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDailyReportSmsPhone } from "@/app/(app)/reports/actions";

export default function DailyReportSmsPhoneEditor({ initialPhone }: { initialPhone: string | null }) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const result = await updateDailyReportSmsPhone(phone);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-title">Daily report SMS</div>
      <div className="section-sub">
        Whoever&apos;s number is set here gets the full report for the day, by SMS, the moment a daily record is
        approved.
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 08012345678"
          style={{ width: 180 }}
        />
        <button className="btn btn-sm btn-ghost" style={{ padding: "6px 14px" }} onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </button>
        {saved && <span style={{ fontSize: 12, color: "var(--green)" }}>Saved.</span>}
        {error && <span className="field-error">{error}</span>}
      </div>
    </div>
  );
}
