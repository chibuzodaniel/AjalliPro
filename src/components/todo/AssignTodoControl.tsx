"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignTodoItem } from "@/app/(app)/todo/actions";

export interface StaffOption {
  id: string;
  name: string;
}

export default function AssignTodoControl({
  todoId,
  assignedToId,
  staff,
}: {
  todoId: string;
  assignedToId: string | null;
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || null;
    setLoading(true);
    setError(null);
    const result = await assignTodoItem(todoId, value);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not assign");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <select
        value={assignedToId ?? ""}
        onChange={handleChange}
        disabled={loading}
        style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
      >
        <option value="">Unassigned</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {error && <span className="field-error" style={{ fontSize: 11 }}>{error}</span>}
    </div>
  );
}
