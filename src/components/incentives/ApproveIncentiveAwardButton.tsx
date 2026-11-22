"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveIncentiveAward, type IncentiveStockSource } from "@/app/(app)/daily-record/actions";

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ApproveIncentiveAwardButton({
  entityType,
  entityId,
  weekKey,
  bonusBags,
  isPastWeek = false,
}: {
  entityType: "CUSTOMER" | "DRIVER";
  entityId: string;
  weekKey: string;
  bonusBags: number;
  /** A past week's bonus — asks for the date it was actually given before approving. */
  isPastWeek?: boolean;
}) {
  const router = useRouter();
  const [source, setSource] = useState<IncentiveStockSource>("FRESH");
  const [givenOn, setGivenOn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (isPastWeek && !givenOn) {
      setError("Pick the date this bonus was given.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await approveIncentiveAward(entityType, entityId, weekKey, source, isPastWeek ? givenOn : undefined);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not approve");
      return;
    }
    router.refresh();
  }

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {isPastWeek && (
        <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11, color: "var(--text-faint)" }}>
          Date given
          <input
            type="date"
            value={givenOn}
            max={localToday()}
            onChange={(e) => setGivenOn(e.target.value)}
            disabled={loading}
            style={{ fontSize: 11.5, padding: "3px 6px" }}
          />
        </label>
      )}
      <select
        value={source}
        onChange={(e) => setSource(e.target.value as IncentiveStockSource)}
        disabled={loading}
        aria-label="Take bonus bags from"
        style={{ fontSize: 11.5, padding: "3px 6px" }}
      >
        <option value="FRESH">From available stock</option>
        <option value="LEAKAGE">From leakage pile</option>
      </select>
      <button
        className="btn btn-sm btn-approve"
        style={{ padding: "4px 10px", fontSize: 11.5 }}
        disabled={loading}
        onClick={handleApprove}
      >
        {loading ? "…" : `Approve (−${bonusBags})`}
      </button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
