"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revertIncentiveAward } from "@/app/(app)/daily-record/actions";

export default function RevertIncentiveAwardButton({ awardId }: { awardId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reverted, setReverted] = useState(false);

  async function handleRevert() {
    if (!window.confirm("Revert this bonus? The bags will be added back to stock on the day it was deducted.")) return;
    setLoading(true);
    setError(null);
    const result = await revertIncentiveAward(awardId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not revert");
      return;
    }
    setReverted(true);
    router.refresh();
  }

  if (reverted) return <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Reverted</span>;

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <button className="btn btn-sm btn-ghost" style={{ padding: "4px 8px", fontSize: 11.5 }} disabled={loading} onClick={handleRevert}>
        {loading ? "…" : "Revert"}
      </button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
