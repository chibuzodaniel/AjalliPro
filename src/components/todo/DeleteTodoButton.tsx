"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTodoItem } from "@/app/(app)/todo/actions";

export default function DeleteTodoButton({ id, description }: { id: string; description: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${description}" permanently?`)) return;
    setLoading(true);
    const result = await deleteTodoItem(id);
    setLoading(false);
    if (result.ok) router.refresh();
  }

  return (
    <button className="icon-btn no-print" title="Delete this to-do" onClick={handleDelete} disabled={loading} style={{ display: "inline-flex", alignItems: "center" }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    </button>
  );
}
