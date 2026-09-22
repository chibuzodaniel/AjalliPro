"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPackerPhone } from "@/app/(app)/packers/actions";

export default function PackerPhoneEditor({ packerId, phone }: { packerId: string; phone: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        {phone || "—"}
        <button className="btn btn-sm btn-ghost" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={() => setEditing(true)}>
          Edit
        </button>
      </span>
    );
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    const result = await setPackerPhone(packerId, { phone: value });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input
        type="tel"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 08012345678"
        style={{ width: 140 }}
      />
      <button className="btn btn-sm btn-approve" disabled={loading} onClick={handleSave}>
        Save
      </button>
      <button className="btn btn-sm btn-ghost" disabled={loading} onClick={() => setEditing(false)}>
        ✕
      </button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
