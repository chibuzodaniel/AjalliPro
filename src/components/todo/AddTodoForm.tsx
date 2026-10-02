"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTodoItem } from "@/app/(app)/todo/actions";

export default function AddTodoForm() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createTodoItem({ description });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not add to-do");
      return;
    }
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 }}>
      <input
        type="text"
        placeholder="e.g. Fix leaking pipe by the washing bay"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ flex: 1, minWidth: 240 }}
        required
      />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Adding…" : "+ Add to-do"}
      </button>
      {error && <div className="field-error" style={{ width: "100%" }}>{error}</div>}
    </form>
  );
}
