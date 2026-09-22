"use client";

import { useState } from "react";
import {
  generateWeeklyMailPreview,
  sendWeeklyMailNow,
  sendWeeklySmsNow,
  type MailPreviewEntry,
  type SendWeeklyMailResult,
  type SendWeeklySmsResult,
} from "@/app/(app)/customers/actions";
import { currentWeekKey } from "@/lib/week";

export default function WeeklyMailGenerator({ threshold, bonus }: { threshold: number; bonus: number }) {
  const [entries, setEntries] = useState<MailPreviewEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<"both" | "sms" | null>(null);
  const [sendResult, setSendResult] = useState<SendWeeklyMailResult | null>(null);
  const [smsResult, setSmsResult] = useState<SendWeeklySmsResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setSendResult(null);
    setSmsResult(null);
    setGenerateError(null);
    try {
      const result = await generateWeeklyMailPreview();
      setEntries(result);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Could not generate preview");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendBoth() {
    const count = entries?.length ?? 0;
    if (!window.confirm(`Send this week's summary (email + SMS) to ${count} customer${count === 1 ? "" : "s"} now?`)) {
      return;
    }
    setSending("both");
    setSendResult(null);
    setSmsResult(null);
    const result = await sendWeeklyMailNow();
    setSending(null);
    setSendResult(result);
  }

  async function handleSendSmsOnly() {
    const count = entries?.length ?? 0;
    if (!window.confirm(`Send this week's SMS summary to ${count} customer${count === 1 ? "" : "s"} now?`)) {
      return;
    }
    setSending("sms");
    setSendResult(null);
    setSmsResult(null);
    const result = await sendWeeklySmsNow();
    setSending(null);
    setSmsResult(result);
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="section-title">Weekly customer mail &amp; SMS</div>
      <div className="section-sub">
        Generates each customer&apos;s weekly + year-to-date purchase summary and flags the {threshold}-bag/week
        bonus (+{bonus} bags). Preview it here, then send it for real via Brevo (email) and BulkSMSNigeria (SMS) —
        each customer gets whichever of email/phone they have on file, through whichever channel is configured. SMS
        can also be sent on its own, independent of email.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-ghost no-print" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating…" : "✉️ Preview this week's customer mail"}
        </button>
        {entries && entries.length > 0 && (
          <>
            <button className="btn btn-primary no-print" onClick={handleSendBoth} disabled={sending !== null}>
              {sending === "both" ? "Sending…" : "📤 Send weekly mail + SMS now"}
            </button>
            <button className="btn btn-ghost no-print" onClick={handleSendSmsOnly} disabled={sending !== null}>
              {sending === "sms" ? "Sending…" : "📱 Send weekly SMS only"}
            </button>
          </>
        )}
      </div>
      {generateError && <div className="field-error" style={{ marginTop: 10 }}>{generateError}</div>}
      {sendResult && (
        <div className="calc-box" style={{ marginTop: 12, flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          {sendResult.error ? (
            <span className="field-error">{sendResult.error}</span>
          ) : (
            <>
              <span>
                Email — sent to <b>{sendResult.sent}</b> customer{sendResult.sent === 1 ? "" : "s"}
                {sendResult.failed ? `, ${sendResult.failed} failed` : ""}.
              </span>
              <span>
                SMS — sent to <b>{sendResult.smsSent}</b> customer{sendResult.smsSent === 1 ? "" : "s"}
                {sendResult.smsFailed ? `, ${sendResult.smsFailed} failed` : ""}.
              </span>
            </>
          )}
        </div>
      )}
      {smsResult && (
        <div className="calc-box" style={{ marginTop: 12 }}>
          {smsResult.error ? (
            <span className="field-error">{smsResult.error}</span>
          ) : (
            <span>
              SMS — sent to <b>{smsResult.smsSent}</b> customer{smsResult.smsSent === 1 ? "" : "s"}
              {smsResult.smsFailed ? `, ${smsResult.smsFailed} failed` : ""}.
            </span>
          )}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        {entries && entries.length === 0 && <div className="empty">No customers to mail yet.</div>}
        {entries &&
          entries.map((c) => (
            <div className="card" key={c.customerId} style={{ marginBottom: 10 }}>
              <b>{c.name}</b> — {c.email || "no email on file"} · {c.phone || "no phone on file"}
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
