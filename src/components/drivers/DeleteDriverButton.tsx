"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { deleteDriver } from "@/app/(app)/drivers/actions";

export default function DeleteDriverButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteDriver(id);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not delete driver");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        className="icon-btn no-print"
        title="Delete this driver"
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
        <Modal open={open} onClose={() => setOpen(false)} title="Delete driver?">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
            <p style={{ margin: 0 }}>
              This will <b>permanently delete</b> <b>{name}</b>. This cannot be undone. Drivers with any recorded
              sale can't be deleted — remove those daily records first.
            </p>
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
