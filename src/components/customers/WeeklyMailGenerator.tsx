"use client";

import { useState } from "react";
import { generateWeeklyMailPreview, type MailPreviewEntry } from "@/app/(app)/customers/actions";
import { currentWeekKey } from "@/lib/week";

export default function WeeklyMailGenerator({ threshold, bonus }: { threshold: number; bonus: number }) {
  const [entries, setEntries] = useState<MailPreviewEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const result = await generateWeeklyMailPreview();
    setEntries(result);
    setLoading(false);
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="section-title">Weekly customer mail</div>
      <div className="section-sub">
        Generates each customer&apos;s weekly + year-to-date purchase summary and flags the {threshold}-bag/week
        bonus (+{bonus} bags). This composes the mail content in-app only — actually delivering it needs an email
        service (e.g. SendGrid) wired to a backend, which this prototype doesn&apos;t have.
      </div>
      <button className="btn btn-ghost no-print" onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating…" : "✉️ Generate this week's customer mail"}
      </button>
      <div style={{ marginTop: 14 }}>
        {entries && entries.length === 0 && <div className="empty">No customers to mail yet.</div>}
        {entries &&
          entries.map((c) => (
            <div className="card" key={c.customerId} style={{ marginBottom: 10 }}>
              <b>{c.name}</b> — {c.email}
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
          <div className="hint">Preview generated for {currentWeekKey()}. Delivering these automatically each week would need a scheduled backend job connected to a real email provider.</div>
        )}
      </div>
    </div>
  );
}
