"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import {
  getPackerProductionBreakdown,
  setPackerBalanceAdjustment,
  type PackerProductionDay,
} from "@/app/(app)/packers/actions";
import { formatMoney } from "@/lib/money";

export default function PackerNameDetail({
  packerId,
  name,
  phone,
  bagsPacked,
  owing,
  paid,
  balanceAdjustment,
  canAdjust,
}: {
  packerId: string;
  name: string;
  phone: string | null;
  bagsPacked: number;
  owing: number;
  paid: number;
  balanceAdjustment: number;
  canAdjust?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<PackerProductionDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState(false);
  const [adjustmentValue, setAdjustmentValue] = useState(String(balanceAdjustment));
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  async function handleSaveAdjustment() {
    setAdjustLoading(true);
    setAdjustError(null);
    const result = await setPackerBalanceAdjustment(packerId, Number(adjustmentValue) || 0);
    setAdjustLoading(false);
    if (!result.ok) {
      setAdjustError(result.error ?? "Could not save");
      return;
    }
    setEditingAdjustment(false);
    router.refresh();
  }

  async function handleOpen() {
    setOpen(true);
    if (days !== null) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getPackerProductionBreakdown(packerId);
      setDays(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load production history");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, font: "inherit", textDecoration: "underline" }}
      >
        {name}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={name} maxWidth={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
          <div>
            <div style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
              Phone
            </div>
            <div>{phone || "Not available"}</div>
          </div>
          <div className="calc-box">
            <span>Bags packed</span>
            <b>{bagsPacked}</b>
          </div>
          <div className="calc-box">
            <span>Amount owing</span>
            <b style={{ color: owing > 0 ? "var(--red)" : undefined }}>{formatMoney(owing)}</b>
          </div>
          <div className="calc-box">
            <span>Amount paid</span>
            <b>{formatMoney(paid)}</b>
          </div>

          {(balanceAdjustment !== 0 || canAdjust) && (
            <div className="calc-box" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              {editingAdjustment ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <span>Balance adjustment (₦)</span>
                    <input
                      type="number"
                      value={adjustmentValue}
                      onChange={(e) => setAdjustmentValue(e.target.value)}
                      style={{ width: 120, textAlign: "right" }}
                    />
                  </div>
                  <div className="hint">Positive adds to what's owing, negative reduces it — e.g. fixing a past error.</div>
                  {adjustError && <div className="field-error">{adjustError}</div>}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditingAdjustment(false)} disabled={adjustLoading}>
                      Cancel
                    </button>
                    <button className="btn btn-sm btn-approve" onClick={handleSaveAdjustment} disabled={adjustLoading}>
                      {adjustLoading ? "Saving…" : "Save"}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Balance adjustment</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b>{formatMoney(balanceAdjustment)}</b>
                    {canAdjust && (
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ padding: "4px 8px", fontSize: 11.5 }}
                        onClick={() => {
                          setAdjustmentValue(String(balanceAdjustment));
                          setAdjustError(null);
                          setEditingAdjustment(true);
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
              Production by day
            </div>
            {loading && <div className="empty">Loading…</div>}
            {error && <div className="field-error">{error}</div>}
            {days && days.length === 0 && <div className="empty">No production recorded yet.</div>}
            {days && days.length > 0 && (
              <div className="table-wrap" style={{ maxHeight: 260, overflowY: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Bags</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((d, i) => (
                      <tr key={i}>
                        <td>{d.date}</td>
                        <td>{d.bags}</td>
                        <td>{formatMoney(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
