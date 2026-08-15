"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setExpensePaid } from "@/app/(app)/expenses/actions";

export default function ExpensePaidToggle({ id, paid }: { id: string; paid: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        await setExpensePaid(id, !paid);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <button className={`btn btn-sm ${paid ? "btn-ghost" : "btn-approve"}`} disabled={isPending} onClick={toggle}>
        {isPending ? "…" : paid ? "Mark unpaid" : "Mark as paid"}
      </button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
