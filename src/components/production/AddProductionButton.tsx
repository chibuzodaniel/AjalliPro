"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { addProductionForDate } from "@/app/(app)/daily-record/actions";
import { todayISO } from "@/lib/week";

interface Row {
  key: number;
  packerName: string;
  bags: string;
}

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return keySeq;
}

export default function AddProductionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState<Row[]>([{ key: nextKey(), packerName: "", bags: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setDate(todayISO());
    setRows([{ key: nextKey(), packerName: "", bags: "" }]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const production = rows
      .filter((r) => r.packerName.trim() && (Number(r.bags) || 0) > 0)
      .map((r) => ({ packerName: r.packerName.trim(), bags: Number(r.bags) || 0 }));
    const result = await addProductionForDate(date, production);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not add production");
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-primary no-print" onClick={() => setOpen(true)}>
        + Add production
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Production">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="hint" style={{ marginBottom: 10 }}>
            If this date already has a daily record, these bags are added to its existing production — everything
            else on that record stays as it is.
          </div>

          {rows.map((row) => (
            <div className="repeater-row" key={row.key}>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  placeholder="Packer name"
                  value={row.packerName}
                  onChange={(e) =>
                    setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, packerName: e.target.value } : r)))
                  }
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="number"
                  placeholder="Bags packed"
                  min={0}
                  value={row.bags}
                  onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, bags: e.target.value } : r)))}
                />
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-row-btn"
            onClick={() => setRows((rs) => [...rs, { key: nextKey(), packerName: "", bags: "" }])}
          >
            + Add packer
          </button>

          {error && <div className="field-error">{error}</div>}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save production"}
          </button>
        </form>
      </Modal>
    </>
  );
}
