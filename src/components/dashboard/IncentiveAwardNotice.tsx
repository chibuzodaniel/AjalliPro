"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { approveIncentiveAward } from "@/app/(app)/daily-record/actions";

export interface PendingAward {
  entityType: "CUSTOMER" | "DRIVER";
  entityId: string;
  name: string;
  weeklyBags: number;
  threshold: number;
  bonusBags: number;
  weekKey: string;
}

export default function IncentiveAwardNotice({ pending }: { pending: PendingAward[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(pending.length > 0);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [approved, setApproved] = useState<Set<string>>(new Set());

  if (pending.length === 0) return null;

  async function handleApprove(item: PendingAward) {
    const key = `${item.entityType}:${item.entityId}`;
    setLoadingKey(key);
    setErrors((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    const result = await approveIncentiveAward(item.entityType, item.entityId, item.weekKey);
    setLoadingKey(null);
    if (!result.ok) {
      setErrors((prev) => new Map(prev).set(key, result.error ?? "Could not approve"));
      return;
    }
    setApproved((prev) => new Set(prev).add(key));
    router.refresh();
  }

  const remaining = pending.filter((item) => !approved.has(`${item.entityType}:${item.entityId}`));

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="🎁 Weekly incentive bonus reached" maxWidth={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
        <div className="section-sub" style={{ margin: 0 }}>
          {remaining.length === 0
            ? "All caught up — every bonus below has been approved."
            : "These have crossed the weekly bag threshold. Approving deducts the bonus bags from today's stock and records who approved it."}
        </div>
        {pending.map((item) => {
          const key = `${item.entityType}:${item.entityId}`;
          const isApproved = approved.has(key);
          const error = errors.get(key);
          return (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--border)",
                paddingBottom: 10,
              }}
            >
              <div>
                <b>{item.name}</b>{" "}
                <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
                  ({item.entityType === "CUSTOMER" ? "customer" : "driver"})
                </span>
                <br />
                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                  {item.weeklyBags}/{item.threshold} bags — qualifies for +{item.bonusBags} bonus bags
                </span>
                {error && <div className="field-error">{error}</div>}
              </div>
              {isApproved ? (
                <span style={{ fontSize: 12.5, color: "var(--green)" }}>Approved</span>
              ) : (
                <button
                  className="btn btn-sm btn-approve"
                  disabled={loadingKey === key}
                  onClick={() => handleApprove(item)}
                >
                  {loadingKey === key ? "…" : `Approve (−${item.bonusBags})`}
                </button>
              )}
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
