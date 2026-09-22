"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { sendAnnouncement, type AnnouncementResult } from "@/app/(app)/dashboard/actions";
import { timeOfDayGreeting } from "@/lib/greeting";

interface Person {
  id: string;
  name: string;
  phone: string | null;
}
interface SmsTemplateOption {
  id: string;
  name: string;
  body: string;
}

type Audience = "STAFF" | "DRIVERS" | "CUSTOMERS" | "PACKERS" | "INDIVIDUAL";
type IndividualType = "STAFF" | "DRIVER" | "CUSTOMER" | "PACKER";

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "STAFF", label: "All Staff" },
  { value: "DRIVERS", label: "All Drivers" },
  { value: "CUSTOMERS", label: "All Customers" },
  { value: "PACKERS", label: "All Packers" },
  { value: "INDIVIDUAL", label: "Individual message" },
];

const MAX_LENGTH = 1000;

export default function AnnouncementButton({
  staff,
  drivers,
  customers,
  packers,
  templates = [],
}: {
  staff: Person[];
  drivers: Person[];
  customers: Person[];
  packers: Person[];
  templates?: SmsTemplateOption[];
}) {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<Audience>("STAFF");
  const [individualType, setIndividualType] = useState<IndividualType>("STAFF");
  const [individualId, setIndividualId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnnouncementResult | null>(null);

  const listByType: Record<IndividualType, Person[]> = { STAFF: staff, DRIVER: drivers, CUSTOMER: customers, PACKER: packers };
  const individualList = listByType[individualType];

  // Order-specific templates ({{quantity}}/{{amount}}) don't make sense for a
  // broadcast — there's no single order behind an announcement to fill them
  // with, so they're left out of this picker entirely.
  const announcementTemplates = templates.filter((t) => !/\{\{\s*(quantity|amount)\s*\}\}/i.test(t.body));

  const audienceCounts: Record<Audience, number> = {
    STAFF: staff.length,
    DRIVERS: drivers.length,
    CUSTOMERS: customers.length,
    PACKERS: packers.length,
    INDIVIDUAL: 0,
  };

  function close() {
    setOpen(false);
    setAudience("STAFF");
    setIndividualType("STAFF");
    setIndividualId("");
    setTemplateId("");
    setMessage("");
    setError(null);
    setResult(null);
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = announcementTemplates.find((tpl) => tpl.id === id);
    if (t) setMessage(t.body.replace(/\{\{\s*greetings?\s*\}\}/gi, timeOfDayGreeting()).slice(0, MAX_LENGTH));
  }

  async function handleSend() {
    const targetLabel =
      audience === "INDIVIDUAL"
        ? (individualList.find((p) => p.id === individualId)?.name ?? "this person")
        : AUDIENCE_OPTIONS.find((a) => a.value === audience)?.label ?? audience;
    if (!window.confirm(`Send this announcement to ${targetLabel}?`)) return;

    setLoading(true);
    setError(null);
    setResult(null);
    const res = await sendAnnouncement({
      audience,
      individualType: audience === "INDIVIDUAL" ? individualType : undefined,
      individualId: audience === "INDIVIDUAL" ? individualId : undefined,
      message,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Could not send announcement");
      return;
    }
    setResult(res);
  }

  return (
    <>
      <button className="btn btn-ghost no-print" onClick={() => setOpen(true)}>
        📢 Announcement
      </button>
      <Modal open={open} onClose={close} title="Send Announcement" maxWidth={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Send to</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              {AUDIENCE_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                  {a.value !== "INDIVIDUAL" ? ` (${audienceCounts[a.value]})` : ""}
                </option>
              ))}
            </select>
          </div>

          {audience === "INDIVIDUAL" && (
            <>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Category</label>
                <select
                  value={individualType}
                  onChange={(e) => {
                    setIndividualType(e.target.value as IndividualType);
                    setIndividualId("");
                  }}
                >
                  <option value="STAFF">Staff</option>
                  <option value="DRIVER">Driver</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="PACKER">Packer</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Who</label>
                <select value={individualId} onChange={(e) => setIndividualId(e.target.value)}>
                  <option value="">Select…</option>
                  {individualList.map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.phone}>
                      {p.name}
                      {!p.phone ? " (no phone)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {announcementTemplates.length > 0 && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Template (optional)</label>
              <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">Write your own…</option>
                {announcementTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="Type your message…"
              rows={5}
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
            <div className="hint">
              Use {"{{name}}"} and {"{{greeting}}"} to personalize each message — they're filled in per recipient.
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)", textAlign: "right" }}>
            {message.length}/{MAX_LENGTH}
          </div>

          {error && <div className="field-error">{error}</div>}
          {result && (
            <div className="calc-box">
              <span>
                Sent to <b>{result.sent}</b> recipient{result.sent === 1 ? "" : "s"}
                {result.failed ? `, ${result.failed} failed` : ""}
                {result.skipped ? `, ${result.skipped} skipped (no phone)` : ""}.
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={close} disabled={loading}>
              Close
            </button>
            <button
              className="btn btn-sm btn-approve"
              style={{ padding: "10px 18px" }}
              onClick={handleSend}
              disabled={loading || message.trim().length === 0 || (audience === "INDIVIDUAL" && !individualId)}
            >
              {loading ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
