"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEmailTemplate } from "@/app/(app)/settings/actions";
import type { EmailTemplateSettings } from "@/lib/settings";

export default function EmailTemplateEditor({ initial }: { initial: EmailTemplateSettings }) {
  const router = useRouter();
  const [subject, setSubject] = useState(initial.subject);
  const [introText, setIntroText] = useState(initial.introText);
  const [signatureText, setSignatureText] = useState(initial.signatureText);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const result = await updateEmailTemplate({ subject, introText, signatureText });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <div className="field">
        <label>Subject line</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
        <div className="hint">Use {"{{week}}"} to insert the week label (e.g. 2026-W33).</div>
      </div>
      <div className="field">
        <label>Intro message</label>
        <textarea
          value={introText}
          onChange={(e) => setIntroText(e.target.value)}
          rows={2}
          maxLength={1000}
          style={{
            width: "100%",
            padding: "11px 13px",
            borderRadius: 10,
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 14,
            resize: "vertical",
          }}
        />
        <div className="hint">Shown after the greeting, before the weekly/year-to-date bag totals.</div>
      </div>
      <div className="field">
        <label>Signature / closing message</label>
        <textarea
          value={signatureText}
          onChange={(e) => setSignatureText(e.target.value)}
          rows={2}
          maxLength={1000}
          style={{
            width: "100%",
            padding: "11px 13px",
            borderRadius: 10,
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 14,
            resize: "vertical",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-ghost" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save template"}
        </button>
        {saved && <span style={{ fontSize: 12.5, color: "var(--green)" }}>Saved.</span>}
        {error && <span className="field-error">{error}</span>}
      </div>
    </div>
  );
}
