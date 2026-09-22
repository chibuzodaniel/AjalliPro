"use client";

import { useState } from "react";
import { sendWeeklyPackerPaySmsNow, type SendWeeklyPackerPaySmsResult } from "@/app/(app)/packers/actions";

export default function WeeklyPackerPaySmsButton() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendWeeklyPackerPaySmsResult | null>(null);

  async function handleSend() {
    if (!window.confirm("Send this week's pay SMS to every packer who has a phone on file and is owed money?")) {
      return;
    }
    setSending(true);
    setResult(null);
    const res = await sendWeeklyPackerPaySmsNow();
    setSending(false);
    setResult(res);
  }

  return (
    <div>
      <button className="btn btn-ghost no-print" onClick={handleSend} disabled={sending}>
        {sending ? "Sending…" : "📱 Send weekly pay SMS now"}
      </button>
      {result && (
        <div className="calc-box" style={{ marginTop: 10 }}>
          {result.error ? (
            <span className="field-error">{result.error}</span>
          ) : (
            <span>
              Sent to <b>{result.sent}</b> packer{result.sent === 1 ? "" : "s"}
              {result.failed ? `, ${result.failed} failed` : ""}
              {result.skipped ? ` (${result.skipped} skipped — no phone or nothing owing)` : ""}.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
