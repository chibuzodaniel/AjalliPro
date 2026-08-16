"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { deleteDailyRecord } from "@/app/(app)/daily-record/actions";

export default function DeleteDailyRecordButton({
  id,
  date,
  status,
}: {
  id: string;
  date: string;
  status: string;
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
    router.refresh();
  }

  return (
    <>
      <button
        className="icon-btn no-print"
        title="Delete this record"
        onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title="Delete daily record?">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
            <p style={{ margin: 0 }}>
              This will <b>permanently delete</b> the daily record for <b>{date}</b> — production, sales, truck
              deliveries, expenses, and leakages logged for that day. This cannot be undone.
            </p>
            {status === "APPROVED" && (
              <p style={{ margin: 0 }}>
                This record is <b>approved</b>, so opening/closing stock (and the leakage balance) on every later
                approved record will be recalculated to skip it.
              </p>
            )}
            {error && <div className="field-error">{error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-sm btn-reject" style={{ padding: "10px 18px" }} onClick={handleDelete} disabled={loading}>
                {loading ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
