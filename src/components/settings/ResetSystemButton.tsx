"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { resetSelectedData, type ResetPreviewCounts, type ResetSelection } from "@/app/(app)/settings/actions";

const CONFIRM_PHRASE = "RESET ALL DATA";

const ALL_SELECTED: ResetSelection = {
  dailyRecords: true,
  expenses: true,
  drivers: true,
  customers: true,
  packers: true,
  settings: true,
  activityLog: true,
};

const NONE_SELECTED: ResetSelection = {
  dailyRecords: false,
  expenses: false,
  drivers: false,
  customers: false,
  packers: false,
  settings: false,
  activityLog: false,
};

export default function ResetSystemButton({ counts }: { counts: ResetPreviewCounts }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"everything" | "choose">("everything");
  const [selection, setSelection] = useState<ResetSelection>(NONE_SELECTED);
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function close() {
    setOpen(false);
    setMode("everything");
    setSelection(NONE_SELECTED);
    setTyped("");
    setError(null);
  }

  function toggle(key: keyof ResetSelection) {
    setSelection((s) => ({ ...s, [key]: !s[key] }));
  }

  async function handleReset() {
    setLoading(true);
    setError(null);
    const effective = mode === "everything" ? ALL_SELECTED : selection;
    const result = await resetSelectedData(effective, typed);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not reset the system");
      return;
    }
    setDone(true);
    router.refresh();
  }

  const total = counts.dailyRecords + counts.drivers + counts.customers + counts.packers + counts.expenses;
  const anyChosen = mode === "everything" || Object.values(selection).some(Boolean);

  const categories: { key: keyof ResetSelection; label: string; count?: number }[] = [
    { key: "dailyRecords", label: "Daily records (production, sales, deliveries, leakages)", count: counts.dailyRecords },
    { key: "expenses", label: "Expense line items", count: counts.expenses },
    { key: "drivers", label: "Drivers", count: counts.drivers },
    { key: "customers", label: "Customers", count: counts.customers },
    { key: "packers", label: "Packers", count: counts.packers },
    { key: "settings", label: "Settings (pricing, incentive thresholds, email template) — resets to defaults" },
    { key: "activityLog", label: "Activity log", count: counts.activityLogs },
  ];

  return (
    <>
      <button className="btn btn-sm btn-reject" onClick={() => setOpen(true)}>
        Reset system data
      </button>
      <Modal open={open} onClose={close} title="Reset system data?" maxWidth={520}>
        {done ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
            <p style={{ margin: 0 }}>The reset is complete.</p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={close}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
            <p style={{ margin: 0 }}>
              This <b>permanently deletes</b> whatever you select below. There is no undo, and no backup is taken
              first. User accounts, including yours, are never touched.
            </p>

            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="radio" checked={mode === "everything"} onChange={() => setMode("everything")} />
                Reset everything
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="radio" checked={mode === "choose"} onChange={() => setMode("choose")} />
                Choose what to reset
              </label>
            </div>

            {mode === "everything" ? (
              <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-dim)" }}>
                {categories.map((c) => (
                  <li key={c.key}>
                    {c.label}
                    {c.count !== undefined ? ` (${c.count})` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {categories.map((c) => (
                  <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={selection[c.key]} onChange={() => toggle(c.key)} />
                    <span>
                      {c.label}
                      {c.count !== undefined ? ` (${c.count})` : ""}
                    </span>
                  </label>
                ))}
                <p style={{ margin: "4px 0 0", color: "var(--text-faint)", fontSize: 12 }}>
                  Drivers, customers, and packers can only be reset on their own if nothing still references
                  them — otherwise reset daily records too.
                </p>
              </div>
            )}

            {total === 0 && mode === "everything" && (
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
                disabled={loading || typed !== CONFIRM_PHRASE || !anyChosen}
              >
                {loading ? "Resetting…" : "Reset selected"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
