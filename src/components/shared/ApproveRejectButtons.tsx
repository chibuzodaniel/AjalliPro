"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ApproveRejectButtons({
  id,
  onApprove,
  onReject,
  approveOnly,
}: {
  id: string;
  onApprove: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  approveOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: (id: string) => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <button className="btn btn-sm btn-approve" disabled={isPending} onClick={() => run(onApprove)}>
        Approve
      </button>
      {!approveOnly && onReject && (
        <button className="btn btn-sm btn-reject" disabled={isPending} onClick={() => run(onReject)}>
          Reject
        </button>
      )}
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
