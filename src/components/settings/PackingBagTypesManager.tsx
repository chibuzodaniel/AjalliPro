"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPackingBagType, updatePackingBagType, deletePackingBagType } from "@/app/(app)/settings/actions";

export interface PackingBagTypeRow {
  id: string;
  name: string;
  pricePerBundle: number;
}

function TypeForm({
  initialName = "",
  initialPrice = "",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialPrice?: string;
  submitLabel: string;
  onSubmit: (name: string, pricePerBundle: number) => Promise<{ ok: boolean; error?: string }>;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [price, setPrice] = useState(initialPrice);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const result = await onSubmit(name, Number(price) || 0);
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
        <label>Type name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Woven sack" />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Price (₦/bundle)</label>
        <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-ghost" onClick={handleSubmit} disabled={loading || !name.trim()}>
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

function TypeRow({ type }: { type: PackingBagTypeRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Delete the "${type.name}" packing bag type?`)) return;
    setDeleting(true);
    setError(null);
    const result = await deletePackingBagType(type.id);
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
        <TypeForm
          initialName={type.name}
          initialPrice={String(type.pricePerBundle)}
          submitLabel="Save changes"
          onSubmit={(name, pricePerBundle) => updatePackingBagType(type.id, { name, pricePerBundle })}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <b>{type.name}</b>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>₦{type.pricePerBundle}/bundle</div>
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

export default function PackingBagTypesManager({ types }: { types: PackingBagTypeRow[] }) {
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div>
      {types.length === 0 && !addingNew && <div className="empty">No packing bag types yet.</div>}
      {types.map((t) => (
        <TypeRow key={t.id} type={t} />
      ))}
      {addingNew ? (
        <div className="card" style={{ marginBottom: 10 }}>
          <TypeForm
            submitLabel="Add type"
            onSubmit={(name, pricePerBundle) => createPackingBagType({ name, pricePerBundle })}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      ) : (
        <button className="btn btn-ghost" onClick={() => setAddingNew(true)}>
          + Add packing bag type
        </button>
      )}
    </div>
  );
}
