"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDailyReportSmsPhones } from "@/app/(app)/reports/actions";
import SendDailyReportSmsButton from "@/components/reports/SendDailyReportSmsButton";

export default function DailyReportSmsPhoneEditor({
  initialPhones,
  latestApprovedRecord,
}: {
  initialPhones: string[];
  latestApprovedRecord?: { id: string; date: string } | null;
}) {
  const router = useRouter();
  const [phones, setPhones] = useState<string[]>(initialPhones.length > 0 ? initialPhones : [""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateOne(index: number, value: string) {
    setPhones((prev) => prev.map((p, i) => (i === index ? value : p)));
  }

  function removeOne(index: number) {
    setPhones((prev) => prev.filter((_, i) => i !== index));
  }

  function addOne() {
    setPhones((prev) => [...prev, ""]);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const result = await updateDailyReportSmsPhones(phones);
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
        Everyone listed here gets the full report for the day, by SMS, the moment a daily record is approved.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {phones.length === 0 && (
          <div className="hint">No numbers configured yet — click "+ Add number" to add one.</div>
        )}
        {phones.map((phone, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => updateOne(i, e.target.value)}
              placeholder="e.g. 08012345678"
              style={{ width: 180 }}
            />
            <button
              className="btn btn-sm btn-ghost"
              style={{ padding: "6px 10px", fontSize: 12 }}
              onClick={() => removeOne(i)}
            >
              Remove
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
          <button className="btn btn-sm btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={addOne}>
            + Add number
          </button>
          <button className="btn btn-sm btn-ghost" style={{ padding: "6px 14px" }} onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
          {saved && <span style={{ fontSize: 12, color: "var(--green)" }}>Saved.</span>}
          {error && <span className="field-error">{error}</span>}
        </div>
        {latestApprovedRecord && (
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 10 }}>
            <SendDailyReportSmsButton recordId={latestApprovedRecord.id} recordDate={latestApprovedRecord.date} />
          </div>
        )}
      </div>
    </div>
  );
}
