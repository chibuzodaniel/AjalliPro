"use client";

import { useState } from "react";
import type { PendingAward } from "./IncentiveAwardNotice";

/**
 * Read-only heads-up for Sales Staff / Admin Staff — they can't approve a
 * weekly incentive bonus (that's Admin/Super Admin, via IncentiveAwardNotice),
 * but should still know one's pending and that it'll come out of stock once
 * approved.
 */
export default function IncentiveAwardToast({ pending }: { pending: PendingAward[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = pending.filter((item) => !dismissed.has(`${item.entityType}:${item.entityId}`));
  if (visible.length === 0) return null;

  function dismiss(key: string) {
    setDismissed((prev) => new Set(prev).add(key));
  }

  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 340,
        width: "calc(100% - 32px)",
      }}
    >
      {visible.map((item) => {
        const key = `${item.entityType}:${item.entityId}`;
        return (
          <div key={key} className="card" role="alert" style={{ padding: 14, boxShadow: "0 12px 34px rgba(0,0,0,.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <b style={{ fontSize: 13.5 }}>🎁 Weekly incentive reached</b>
              <button
                onClick={() => dismiss(key)}
                aria-label="Dismiss"
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 4 }}>
              <b>{item.name}</b> ({item.entityType === "CUSTOMER" ? "customer" : "driver"}) hit {item.weeklyBags}/
              {item.threshold} bags this week — the {item.bonusBags} bonus bags will be deducted from stock once an
              Admin approves it.
            </div>
          </div>
        );
      })}
    </div>
  );
}
