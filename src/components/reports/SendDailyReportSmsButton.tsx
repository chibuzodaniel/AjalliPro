"use client";

import { useState } from "react";
import { sendDailyReportSmsNow } from "@/app/(app)/reports/actions";

export default function SendDailyReportSmsButton({ recordId, recordDate }: { recordId: string; recordDate: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setLoading(true);
    setError(null);
    setSent(false);
    const result = await sendDailyReportSmsNow(recordId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not send SMS report");
      return;
    }
    setSent(true);
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button className="btn btn-sm btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={handleSend} disabled={loading}>
        {loading ? "Sending…" : `📩 Send SMS report for ${recordDate}`}
      </button>
      {sent && <span style={{ fontSize: 12, color: "var(--green)" }}>Sent.</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
