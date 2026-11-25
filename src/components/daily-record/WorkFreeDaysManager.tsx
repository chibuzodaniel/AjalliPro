"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markWorkFreeDays, unmarkWorkFreeDay } from "@/app/(app)/daily-record/actions";
import { formatDay } from "@/lib/week";

export interface WorkFreeDayRow {
  id: string;
  date: string;
  reason: string | null;
  createdByName: string;
}

export default function WorkFreeDaysManager({ days }: { days: WorkFreeDayRow[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd() {
    setLoading(true);
    setError(null);
    const result = await markWorkFreeDays([date], reason);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    setDate("");
    setReason("");
    router.refresh();
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    setError(null);
    const result = await unmarkWorkFreeDay(id);
    setRemovingId(null);
    if (!result.ok) {
      setError(result.error ?? "Could not remove");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card">
      <div className="subhead" style={{ marginTop: 0 }}>Work-free days</div>
      <div className="hint" style={{ marginBottom: 10 }}>
        Days with no work (holidays, shutdowns). A new daily record can&apos;t skip a day unless that day is marked here.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0, flex: "1 1 180px" }}>
          <label>Reason (optional)</label>
          <input
            type="text"
            value={reason}
            maxLength={120}
            placeholder="e.g. Public holiday"
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost" onClick={handleAdd} disabled={loading || !date}>
          {loading ? "Saving…" : "Mark work-free"}
        </button>
      </div>
      {error && <div className="field-error" style={{ marginBottom: 10 }}>{error}</div>}
      {days.length === 0 ? (
        <div className="empty">No work-free days marked.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason</th>
                <th>Marked by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.id}>
                  <td>{formatDay(d.date)}</td>
                  <td>{d.reason ?? "—"}</td>
                  <td>{d.createdByName}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleRemove(d.id)}
                      disabled={removingId === d.id}
                    >
                      {removingId === d.id ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
