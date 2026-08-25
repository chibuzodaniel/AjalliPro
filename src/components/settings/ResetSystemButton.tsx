"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { resetAllData, type ResetPreviewCounts } from "@/app/(app)/settings/actions";

const CONFIRM_PHRASE = "RESET ALL DATA";

export default function ResetSystemButton({ counts }: { counts: ResetPreviewCounts }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function close() {
    setOpen(false);
    setTyped("");
    setError(null);
  }

  async function handleReset() {
    setLoading(true);
    setError(null);
    const result = await resetAllData(typed);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not reset the system");
      return;
    }
    setDone(true);
    router.refresh();
  }

  const total = counts.dailyRecords + counts.drivers + counts.customers + counts.packers + counts.expenses;

  return (
    <>
      <button className="btn btn-sm btn-reject" onClick={() => setOpen(true)}>
        Reset entire system
      </button>
      <Modal open={open} onClose={close} title="Reset entire system?" maxWidth={480}>
        {done ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
            <p style={{ margin: 0 }}>The system has been reset. Every page now starts from a clean slate.</p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={close}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
            <p style={{ margin: 0 }}>
              This <b>permanently deletes</b> everything below. There is no undo, and no backup is taken first.
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-dim)" }}>
              <li>{counts.dailyRecords} daily record{counts.dailyRecords === 1 ? "" : "s"} (production, sales, leakages)</li>
              <li>{counts.expenses} expense{counts.expenses === 1 ? "" : "s"}</li>
              <li>{counts.drivers} driver{counts.drivers === 1 ? "" : "s"}</li>
              <li>{counts.customers} customer{counts.customers === 1 ? "" : "s"}</li>
              <li>{counts.packers} packer{counts.packers === 1 ? "" : "s"}</li>
              <li>All settings (pricing, incentive thresholds, email template) — reset to defaults</li>
              <li>The full activity log</li>
            </ul>
            <p style={{ margin: 0, color: "var(--text-faint)", fontSize: 12 }}>
              User accounts, including yours, are never touched.
            </p>
            {total === 0 && (
              <p style={{ margin: 0, color: "var(--text-faint)", fontSize: 12 }}>
                There&apos;s currently nothing recorded to lose, but settings will still reset to defaults.
              </p>
            )}
            <div className="field" style={{ marginTop: 4 }}>
              <label>
                Type <code>{CONFIRM_PHRASE}</code> to confirm
              </label>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                autoComplete="off"
              />
            </div>
            {error && <div className="field-error">{error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={close} disabled={loading}>
                Cancel
              </button>
              <button
                className="btn btn-sm btn-reject"
                style={{ padding: "10px 18px" }}
                onClick={handleReset}
                disabled={loading || typed !== CONFIRM_PHRASE}
              >
                {loading ? "Resetting…" : "Reset everything"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
