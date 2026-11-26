"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { deleteDailyRecord } from "@/app/(app)/daily-record/actions";

export default function DeleteDailyRecordButton({
  id,
  date,
  status,
  labelled,
  onDeleted,
}: {
  id: string;
  date: string;
  status: string;
  /** Show a "Delete" text button instead of just the bin icon. */
  labelled?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteDailyRecord(id);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not delete record");
      return;
    }
    setOpen(false);
    onDeleted?.();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className={labelled ? "btn btn-sm btn-ghost no-print" : "icon-btn no-print"}
        title="Delete — moves this record to the trash"
        onClick={() => setOpen(true)}
        style={
          labelled
            ? { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12.5, color: "var(--red)" }
            : { display: "inline-flex", alignItems: "center" }
        }
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        {labelled && "Delete"}
      </button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title="Delete this record?">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
            <p style={{ margin: 0 }}>
              The daily record for <b>{date}</b> — production, sales, truck deliveries, expenses and leakages — goes to
              the <b>Trash</b> tab first, and everything it did is reverted automatically: stock and leakage balance,
              its bank deposit, expenses and their payments, packer pay owed, customer/driver incentive totals, and any
              weekly bonuses deducted that day.
            </p>
            <p style={{ margin: 0 }}>
              From the Trash an admin can restore it, or the Super Admin can delete it permanently.
            </p>
            {status === "APPROVED" && (
              <p style={{ margin: 0 }}>
                This record is <b>approved</b>, so opening/closing stock (and the leakage balance) on every later
                approved record will be recalculated to skip it (and again if it’s restored).
              </p>
            )}
            {error && <div className="field-error">{error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-sm btn-reject" style={{ padding: "10px 18px" }} onClick={handleDelete} disabled={loading}>
                {loading ? "Deleting…" : "Delete (move to Trash)"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
