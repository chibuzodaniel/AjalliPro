"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleTodoItem } from "@/app/(app)/todo/actions";

export default function TodoCheckbox({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const result = await toggleTodoItem(id);
    setLoading(false);
    if (result.ok) router.refresh();
  }

  return <input type="checkbox" checked={done} disabled={loading} onChange={handleToggle} style={{ width: 18, height: 18, cursor: "pointer" }} />;
}
