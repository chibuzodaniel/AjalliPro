"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";
import { updateDriverDetails } from "@/app/(app)/drivers/actions";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 8,
  background: "var(--panel-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontSize: 13.5,
};

export default function DriverNameDetail({
  driverId,
  name,
  phone,
  pricePerBag,
  loadingFee,
  status,
  weeklyBags,
  canEdit,
}: {
  driverId: string;
  name: string;
  phone: string | null;
  pricePerBag: number;
  loadingFee: number;
  status: string;
  weeklyBags: number;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setNameValue(name);
    setPhoneValue(phone ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    const result = await updateDriverDetails(driverId, { name: nameValue, phone: phoneValue });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, font: "inherit", textDecoration: "underline" }}
      >
        {name}
      </button>
      <Modal open={open} onClose={() => { setOpen(false); setEditing(false); }} title={editing ? `Edit — ${name}` : name}>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Name</label>
              <input type="text" value={nameValue} onChange={(e) => setNameValue(e.target.value)} style={fieldStyle} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Phone</label>
              <input type="tel" value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} style={fieldStyle} />
            </div>
            {error && <div className="field-error">{error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-sm btn-approve" style={{ padding: "10px 18px" }} onClick={handleSave} disabled={loading}>
                {loading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
            <div>
              <div style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
                Phone
              </div>
              <div>{phone || "Not available"}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
                Status
              </div>
              <div>{status.toLowerCase()}</div>
            </div>
            <div className="calc-box">
              <span>Price / bag + loading fee / bag</span>
              <b>
                {formatMoney(pricePerBag)} + {formatMoney(loadingFee)}
              </b>
            </div>
            <div className="calc-box">
              <span>This week</span>
              <b>{weeklyBags} bags</b>
            </div>
            {canEdit && (
              <button className="btn btn-ghost" style={{ alignSelf: "flex-start" }} onClick={startEdit}>
                Edit details
              </button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
