"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { archiveAllActiveRecords } from "@/app/(app)/daily-record/actions";

export default function ArchiveRecordsButton({ activeCount }: { activeCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmArchive() {
    setLoading(true);
    setError(null);
    const result = await archiveAllActiveRecords();
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (activeCount === 0) return null;

  return (
    <>
      <button className="btn btn-ghost no-print" onClick={() => setOpen(true)}>
        📦 Archive &amp; start new session
      </button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title="Archive all active records?">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
            <p style={{ margin: 0 }}>
              This moves all <b>{activeCount}</b> active daily record{activeCount === 1 ? "" : "s"} to the{" "}
              <b>Archived</b> tab — nothing is deleted, and they stay fully viewable there. The Daily Record table,
              Dashboard, and stock chain start fresh from nothing: the next record&apos;s opening stock will need to
              be entered manually rather than carrying over automatically.
            </p>
            <p style={{ margin: 0 }}>
              Customer/driver <b>year-to-date</b> incentive totals keep counting straight through — this only resets
              day-to-day recording, not what they&apos;ve actually bought this year.
            </p>
            {error && <div className="field-error">{error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-sm btn-approve" style={{ padding: "10px 18px" }} onClick={confirmArchive} disabled={loading}>
                {loading ? "Archiving…" : `Archive ${activeCount} record${activeCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
