"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Pill from "@/components/ui/Pill";
import {
  restoreTrashedDailyRecord,
  purgeTrashedDailyRecord,
  getRestorePreview,
  type RestorePreview,
} from "@/app/(app)/daily-record/actions";
import { formatDay } from "@/lib/week";

export interface TrashedRecordRow {
  id: string;
  date: string;
  status: string;
  produced: number;
  sold: number;
  createdByName: string;
  deletedByName: string;
  deletedAt: string;
  /** What trashing reverted — the trace kept with the entry. */
  effects: string[];
}

function EffectList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((e, i) => (
        <li key={i}>{e}</li>
      ))}
    </ul>
  );
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Row({ row, canPurge }: { row: TrashedRecordRow; canPurge: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"restore" | "purge" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  async function openRestore() {
    setLoadingPreview(true);
    setError(null);
    const p = await getRestorePreview(row.id);
    setLoadingPreview(false);
    if (!p.ok) {
      setError(p.error ?? "Could not load what will be restored");
      return;
    }
    setPreview(p);
  }

  async function run(kind: "restore" | "purge") {
    setBusy(kind);
    setError(null);
    const result = kind === "restore" ? await restoreTrashedDailyRecord(row.id) : await purgeTrashedDailyRecord(row.id);
    setBusy(null);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }
    setConfirmPurge(false);
    setPreview(null);
    router.refresh();
  }

  return (
    <tr>
      <td>{formatDay(row.date)}</td>
      <td>{row.produced}</td>
      <td>{row.sold}</td>
      <td>
        <Pill status={row.status as "APPROVED" | "PENDING" | "REJECTED"}>{row.status.toLowerCase()}</Pill>
      </td>
      <td>{row.createdByName}</td>
      <td style={{ fontSize: 12.5 }}>
        {row.deletedByName}
        <br />
        <span style={{ color: "var(--text-faint)" }}>{fmtWhen(row.deletedAt)}</span>
      </td>
      <td>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-sm btn-approve" onClick={openRestore} disabled={busy !== null || loadingPreview}>
            {loadingPreview ? "Checking…" : "Restore"}
          </button>
          {row.effects.length > 0 && (
            <button className="btn btn-sm btn-ghost" onClick={() => setShowTrace((v) => !v)}>
              {showTrace ? "Hide" : "What was reverted"}
            </button>
          )}
          {canPurge && (
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirmPurge(true)} disabled={busy !== null}>
              Delete forever
            </button>
          )}
        </div>
        {showTrace && (
          <div style={{ marginTop: 8, fontSize: 12.5, maxWidth: 520 }}>
            <EffectList items={row.effects} />
          </div>
        )}
        {error && !confirmPurge && !preview && <div className="field-error" style={{ marginTop: 6 }}>{error}</div>}
        {preview && (
          <Modal open={!!preview} onClose={() => setPreview(null)} title={`Restore ${formatDay(row.date)}?`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
              {(preview.blockers ?? []).length > 0 ? (
                <div className="field-error" role="alert">
                  <b>This record can’t be restored right now:</b>
                  <EffectList items={preview.blockers ?? []} />
                </div>
              ) : (
                <p style={{ margin: 0 }}>
                  Everything that was reverted when this record was trashed will be put back:
                </p>
              )}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Will be restored</div>
                <EffectList items={preview.restores ?? []} />
              </div>
              {(preview.notes ?? []).length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Won’t be restored</div>
                  <EffectList items={preview.notes ?? []} />
                </div>
              )}
              {error && <div className="field-error">{error}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setPreview(null)} disabled={busy !== null}>
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-approve"
                  style={{ padding: "10px 18px" }}
                  onClick={() => run("restore")}
                  disabled={busy !== null || (preview.blockers ?? []).length > 0}
                >
                  {busy === "restore" ? "Restoring…" : "Restore everything"}
                </button>
              </div>
            </div>
          </Modal>
        )}
        {confirmPurge && (
          <Modal open={confirmPurge} onClose={() => setConfirmPurge(false)} title="Delete forever?">
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
              <p style={{ margin: 0 }}>
                The trashed record for <b>{formatDay(row.date)}</b> will be removed for good and can&apos;t be restored.
              </p>
              {error && <div className="field-error">{error}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setConfirmPurge(false)} disabled={busy !== null}>
                  Cancel
                </button>
                <button className="btn btn-sm btn-reject" style={{ padding: "10px 18px" }} onClick={() => run("purge")} disabled={busy !== null}>
                  {busy === "purge" ? "Deleting…" : "Delete forever"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </td>
    </tr>
  );
}

export interface RestoredRecordRow {
  id: string;
  date: string;
  deletedByName: string;
  deletedAt: string;
  restoredByName: string;
  restoredAt: string;
  restoredItems: string[];
  notRestoredItems: string[];
}

function RestoredRow({ row }: { row: RestoredRecordRow }) {
  const [open, setOpen] = useState(false);
  return (
    <tr>
      <td>{formatDay(row.date)}</td>
      <td style={{ fontSize: 12.5 }}>
        {row.deletedByName}
        <br />
        <span style={{ color: "var(--text-faint)" }}>{fmtWhen(row.deletedAt)}</span>
      </td>
      <td style={{ fontSize: 12.5 }}>
        {row.restoredByName}
        <br />
        <span style={{ color: "var(--text-faint)" }}>{fmtWhen(row.restoredAt)}</span>
      </td>
      <td>
        <button className="btn btn-sm btn-ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide" : "What was restored"}
        </button>
        {open && (
          <div style={{ marginTop: 8, fontSize: 12.5, maxWidth: 520, display: "flex", flexDirection: "column", gap: 8 }}>
            <EffectList items={row.restoredItems} />
            {row.notRestoredItems.length > 0 && (
              <>
                <b>Not restored</b>
                <EffectList items={row.notRestoredItems} />
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function TrashedRecordsList({
  rows,
  restored,
  canPurge,
}: {
  rows: TrashedRecordRow[];
  restored: RestoredRecordRow[];
  canPurge: boolean;
}) {
  return (
    <>
    <div className="card">
      <div className="hint" style={{ marginBottom: 10 }}>
        Deleted records stay here until restored{canPurge ? " or deleted forever" : ""}. Trashing reverted
        everything the record did (stock, bank, expenses, packer pay, incentives, weekly bonuses); restoring puts it all
        back after showing you the full list.
      </div>
      {rows.length === 0 ? (
        <div className="empty">The trash is empty.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Produced</th>
                <th>Sold</th>
                <th>Status</th>
                <th>By</th>
                <th>Deleted by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Row key={r.id} row={r} canPurge={canPurge} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    {restored.length > 0 && (
      <div className="card">
        <div className="subhead" style={{ marginTop: 0 }}>Restored</div>
        <div className="hint" style={{ marginBottom: 10 }}>Records brought back from the trash — when, by whom, and what came back with them.</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Trashed by</th>
                <th>Restored by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {restored.map((r) => (
                <RestoredRow key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
    </>
  );
}
