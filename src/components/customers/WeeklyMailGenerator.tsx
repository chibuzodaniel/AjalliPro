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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<"both" | "sms" | null>(null);
  const [sendResult, setSendResult] = useState<SendWeeklyMailResult | null>(null);
  const [smsResult, setSmsResult] = useState<SendWeeklySmsResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const allSelected = entries !== null && entries.length > 0 && selected.size === entries.length;

  async function handleGenerate() {
    setLoading(true);
    setSendResult(null);
    setSmsResult(null);
    setGenerateError(null);
    try {
      const result = await generateWeeklyMailPreview();
      setEntries(result);
      setSelected(new Set(result.map((e) => e.customerId)));
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Could not generate preview");
    } finally {
      setLoading(false);
    }
  }

  function toggleOne(customerId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  }

  function toggleAll() {
    if (!entries) return;
    setSelected(allSelected ? new Set() : new Set(entries.map((e) => e.customerId)));
  }

  function selectQualifiersOnly() {
    if (!entries) return;
    setSelected(new Set(entries.filter((e) => e.qualifies).map((e) => e.customerId)));
  }

  async function handleSendBoth() {
    const count = selected.size;
    if (count === 0) return;
    if (!window.confirm(`Send this week's summary (email + SMS) to ${count} customer${count === 1 ? "" : "s"} now?`)) {
      return;
    }
    setSending("both");
    setSendResult(null);
    setSmsResult(null);
    const result = await sendWeeklyMailNow([...selected]);
    setSending(null);
    setSendResult(result);
  }

  async function handleSendSmsOnly() {
    const count = selected.size;
    if (count === 0) return;
    if (!window.confirm(`Send this week's SMS summary to ${count} customer${count === 1 ? "" : "s"} now?`)) {
      return;
    }
    setSending("sms");
    setSendResult(null);
    setSmsResult(null);
    const result = await sendWeeklySmsNow([...selected]);
    setSending(null);
    setSmsResult(result);
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="section-title">Weekly customer mail &amp; SMS</div>
      <div className="section-sub">
        Generates each customer&apos;s weekly + year-to-date purchase summary and flags the {threshold}-bag/week
        bonus (+{bonus} bags). Preview it here, pick who should get it, then send it for real via Brevo (email) and
        BulkSMSNigeria (SMS) — each selected customer gets whichever of email/phone they have on file, through
        whichever channel is configured. SMS can also be sent on its own, independent of email.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-ghost no-print" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating…" : "✉️ Preview this week's customer mail"}
        </button>
        {entries && entries.length > 0 && (
          <>
            <button className="btn btn-primary no-print" onClick={handleSendBoth} disabled={sending !== null || selected.size === 0}>
              {sending === "both" ? "Sending…" : `📤 Send weekly mail + SMS now (${selected.size})`}
            </button>
            <button className="btn btn-ghost no-print" onClick={handleSendSmsOnly} disabled={sending !== null || selected.size === 0}>
              {sending === "sms" ? "Sending…" : `📱 Send weekly SMS only (${selected.size})`}
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
        {entries && entries.length > 0 && (
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              Select all ({entries.length})
            </label>
            <button className="btn btn-sm btn-ghost no-print" style={{ padding: "4px 10px", fontSize: 12 }} onClick={selectQualifiersOnly}>
              Select only qualifying customers
            </button>
            <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{selected.size} selected</span>
          </div>
        )}
        {entries &&
          entries.map((c) => (
            <div className="card" key={c.customerId} style={{ marginBottom: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <input
                type="checkbox"
                checked={selected.has(c.customerId)}
                onChange={() => toggleOne(c.customerId)}
                style={{ marginTop: 4 }}
              />
              <div>
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
            </div>
          ))}
        {entries && entries.length > 0 && (
          <div className="hint">Preview generated for {currentWeekKey()}.</div>
        )}
      </div>
    </div>
  );
}
