"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveIncentiveAward } from "@/app/(app)/daily-record/actions";

export default function ApproveIncentiveAwardButton({
  entityType,
  entityId,
  weekKey,
  bonusBags,
}: {
  entityType: "CUSTOMER" | "DRIVER";
  entityId: string;
  weekKey: string;
  bonusBags: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    const result = await approveIncentiveAward(entityType, entityId, weekKey);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not approve");
      return;
    }
    router.refresh();
  }

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <button className="btn btn-sm btn-approve" style={{ padding: "4px 10px", fontSize: 11.5 }} disabled={loading} onClick={handleApprove}>
        {loading ? "…" : `Approve (−${bonusBags})`}
      </button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
