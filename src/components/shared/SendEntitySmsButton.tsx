"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { timeOfDayGreeting } from "@/lib/greeting";
import { formatMoney } from "@/lib/money";

const MAX_LENGTH = 1000;

export interface SmsTemplateOption {
  id: string;
  name: string;
  body: string;
}

export default function SendEntitySmsButton({
  entityId,
  entityName,
  templates = [],
  sendAction,
  pricePerBag,
}: {
  entityId: string;
  entityName: string;
  templates?: SmsTemplateOption[];
  sendAction: (id: string, input: unknown) => Promise<{ ok: boolean; error?: string }>;
  /** When set (customers), shows a "Bags" field and lets templates use {{quantity}}/{{amount}} — amount = bags × this rate. */
  pricePerBag?: number;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [bags, setBags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const amount = (Number(bags) || 0) * (pricePerBag ?? 0);

  function close() {
    setOpen(false);
    setMessage("");
    setTemplateId("");
    setBags("");
    setError(null);
    setSent(false);
  }

  function fillFromTemplate(id: string, bagsValue: string) {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    const filled = template.body
      .replace(/\{\{\s*name\s*\}\}/gi, entityName)
      .replace(/\{\{\s*greeting\s*\}\}/gi, timeOfDayGreeting())
      .replace(/\{\{\s*quantity\s*\}\}/gi, bagsValue || "0")
      .replace(/\{\{\s*amount\s*\}\}/gi, formatMoney((Number(bagsValue) || 0) * (pricePerBag ?? 0)));
    setMessage(filled.slice(0, MAX_LENGTH));
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    fillFromTemplate(id, bags);
  }

  function handleBagsChange(value: string) {
    setBags(value);
    // Keep an already-applied template's {{quantity}}/{{amount}} in sync as bags changes.
    if (templateId) fillFromTemplate(templateId, value);
  }

  async function handleSend() {
    setLoading(true);
    setError(null);
    const result = await sendAction(entityId, { message });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not send SMS");
      return;
    }
    setSent(true);
    setMessage("");
  }

  return (
    <>
      <button
        className="btn btn-sm btn-ghost"
        style={{ padding: "4px 8px", fontSize: 11.5 }}
        onClick={() => setOpen(true)}
      >
        📱 SMS
      </button>
      {open && (
        <Modal open={open} onClose={close} title={`Send SMS — ${entityName}`} maxWidth={440}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pricePerBag !== undefined && (
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Order quantity (bags)</label>
                <input
                  type="number"
                  min={0}
                  value={bags}
                  onChange={(e) => handleBagsChange(e.target.value)}
                  placeholder="0"
                />
                {Number(bags) > 0 && (
                  <div className="hint">
                    {bags} bags × {formatMoney(pricePerBag)}/bag = <b>{formatMoney(amount)}</b> payable
                  </div>
                )}
              </div>
            )}
            {templates.length > 0 && (
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Template (optional)</label>
                <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">Write your own…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="Type your message…"
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 10,
                color: "var(--text)",
                fontFamily: "inherit",
                fontSize: 13.5,
              }}
            />
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", textAlign: "right" }}>
              {message.length}/{MAX_LENGTH}
            </div>
            {error && <div className="field-error">{error}</div>}
            {sent && <div style={{ color: "var(--green)", fontSize: 13 }}>Sent.</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={close} disabled={loading}>
                Close
              </button>
              <button
                className="btn btn-sm btn-approve"
                style={{ padding: "10px 18px" }}
                onClick={handleSend}
                disabled={loading || message.trim().length === 0}
              >
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
