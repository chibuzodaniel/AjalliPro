"use client";

import { useState } from "react";
import { generateWeeklyMailPreview, sendWeeklyMailNow, type MailPreviewEntry } from "@/app/(app)/customers/actions";
import { currentWeekKey } from "@/lib/week";

export default function WeeklyMailGenerator({ threshold, bonus }: { threshold: number; bonus: number }) {
  const [entries, setEntries] = useState<MailPreviewEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; error?: string } | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setSendResult(null);
    const result = await generateWeeklyMailPreview();
    setEntries(result);
    setLoading(false);
  }

  async function handleSend() {
    const count = entries?.length ?? 0;
    if (!window.confirm(`Send this week's summary email to ${count} customer${count === 1 ? "" : "s"} now?`)) {
      return;
    }
    setSending(true);
    setSendResult(null);
    const result = await sendWeeklyMailNow();
    setSending(false);
    setSendResult(result);
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="section-title">Weekly customer mail</div>
      <div className="section-sub">
        Generates each customer&apos;s weekly + year-to-date purchase summary and flags the {threshold}-bag/week
        bonus (+{bonus} bags). Preview it here, then send it for real via Brevo.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-ghost no-print" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating…" : "✉️ Preview this week's customer mail"}
        </button>
        {entries && entries.length > 0 && (
          <button className="btn btn-primary no-print" onClick={handleSend} disabled={sending}>
            {sending ? "Sending…" : "📤 Send weekly mail now"}
          </button>
        )}
      </div>
      {sendResult && (
        <div className="calc-box" style={{ marginTop: 12 }}>
          {sendResult.error ? (
            <span className="field-error">{sendResult.error}</span>
          ) : (
            <span>
              Sent to <b>{sendResult.sent}</b> customer{sendResult.sent === 1 ? "" : "s"}
              {sendResult.failed ? `, ${sendResult.failed} failed` : ""}.
            </span>
          )}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        {entries && entries.length === 0 && <div className="empty">No customers to mail yet.</div>}
        {entries &&
          entries.map((c) => (
            <div className="card" key={c.customerId} style={{ marginBottom: 10 }}>
              <b>{c.name}</b> — {c.email || "no email on file, will be skipped"}
              <br />
              <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
                This week: {c.weeklyBags} bags · Year to date: {c.yearlyBags} bags
              </span>
              {c.qualifies && (
                <div className="pill approved" style={{ marginTop: 6 }}>
                  Qualifies for +{bonus} bonus bags this week
                </div>
              )}
            </div>
          ))}
        {entries && entries.length > 0 && (
          <div className="hint">Preview generated for {currentWeekKey()}.</div>
        )}
      </div>
    </div>
  );
}
