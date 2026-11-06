"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { approveIncentiveAward } from "@/app/(app)/daily-record/actions";

// Shared with IncentiveAwardToast — both are the same underlying
// "announcement", just rendered differently per role, so they share one
// once-a-day gate.
const LAST_SHOWN_KEY = "ajalli:incentive-notice-last-shown";

export interface PendingAward {
  entityType: "CUSTOMER" | "DRIVER";
  entityId: string;
  name: string;
  address?: string | null;
  weeklyBags: number;
  threshold: number;
  bonusBags: number;
  weekKey: string;
}

export default function IncentiveAwardNotice({ pending }: { pending: PendingAward[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [approved, setApproved] = useState<Set<string>>(new Set());

  // Pops up at most once a day — after that, anything still pending stays
  // visible in the notification bell (which always reflects live data) until
  // it's approved, rather than interrupting every single dashboard visit.
  useEffect(() => {
    if (pending.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(LAST_SHOWN_KEY) === today) return;
      localStorage.setItem(LAST_SHOWN_KEY, today);
    } catch {
      // localStorage unavailable — show anyway, just can't remember for next time
    }
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.length]);

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
                {item.entityType === "CUSTOMER" && item.address && (
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{item.address}</div>
                )}
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
