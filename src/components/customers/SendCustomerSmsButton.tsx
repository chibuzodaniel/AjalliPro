"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { sendCustomerSms } from "@/app/(app)/customers/actions";
import { timeOfDayGreeting } from "@/lib/greeting";

const MAX_LENGTH = 1000;

export interface SmsTemplateOption {
  id: string;
  name: string;
  body: string;
}

export default function SendCustomerSmsButton({
  customerId,
  customerName,
  templates = [],
}: {
  customerId: string;
  customerName: string;
  templates?: SmsTemplateOption[];
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close() {
    setOpen(false);
    setMessage("");
    setTemplateId("");
    setError(null);
    setSent(false);
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      const filled = template.body
        .replace(/\{\{\s*name\s*\}\}/gi, customerName)
        .replace(/\{\{\s*greeting\s*\}\}/gi, timeOfDayGreeting());
      setMessage(filled.slice(0, MAX_LENGTH));
    }
  }

  async function handleSend() {
    setLoading(true);
    setError(null);
    const result = await sendCustomerSms(customerId, { message });
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
        <Modal open={open} onClose={close} title={`Send SMS — ${customerName}`} maxWidth={440}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
