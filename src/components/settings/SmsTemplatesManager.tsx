"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSmsTemplate, updateSmsTemplate, deleteSmsTemplate } from "@/app/(app)/settings/actions";

export interface SmsTemplateRow {
  id: string;
  name: string;
  body: string;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 10,
  background: "var(--panel-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontSize: 14,
  resize: "vertical",
};

function TemplateForm({
  initialName = "",
  initialBody = "",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialBody?: string;
  submitLabel: string;
  onSubmit: (name: string, body: string) => Promise<{ ok: boolean; error?: string }>;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const result = await onSubmit(name, body);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    router.refresh();
    onCancel?.();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Template name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Delivery Successful" />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Message</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1000} style={fieldStyle} />
        <div className="hint">Use {"{{name}}"} to insert the customer's name. Sent manually — pick this template when texting a customer.</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-ghost" onClick={handleSubmit} disabled={loading || !name.trim() || !body.trim()}>
          {loading ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        )}
        {error && <span className="field-error">{error}</span>}
      </div>
    </div>
  );
}

function TemplateRow({ template }: { template: SmsTemplateRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Delete the "${template.name}" template?`)) return;
    setDeleting(true);
    setError(null);
    const result = await deleteSmsTemplate(template.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not delete");
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <div className="card" style={{ marginBottom: 10 }}>
        <TemplateForm
          initialName={template.name}
          initialBody={template.body}
          submitLabel="Save changes"
          onSubmit={(name, body) => updateSmsTemplate(template.id, { name, body })}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <b>{template.name}</b>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4, whiteSpace: "pre-wrap" }}>{template.body}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button className="btn btn-sm btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            className="btn btn-sm btn-reject"
            style={{ padding: "6px 10px", fontSize: 12 }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      {error && <div className="field-error" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}

export default function SmsTemplatesManager({ templates }: { templates: SmsTemplateRow[] }) {
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div>
      {templates.length === 0 && !addingNew && <div className="empty">No SMS templates yet.</div>}
      {templates.map((t) => (
        <TemplateRow key={t.id} template={t} />
      ))}
      {addingNew ? (
        <div className="card" style={{ marginBottom: 10 }}>
          <TemplateForm submitLabel="Add template" onSubmit={(name, body) => createSmsTemplate({ name, body })} onCancel={() => setAddingNew(false)} />
        </div>
      ) : (
        <button className="btn btn-ghost" onClick={() => setAddingNew(true)}>
          + Add template
        </button>
      )}
    </div>
  );
}
