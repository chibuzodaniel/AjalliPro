"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
      {children}
    </div>
  );
}

interface PendingDriverInfo {
  name: string;
  phone: string | null;
  pricePerBag: number;
  loadingFee: number;
  createdAt: Date;
  createdByName: string;
}

export default function PendingDriverDetail({ driver }: { driver: PendingDriverInfo }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: "none",
          color: "var(--accent)",
          cursor: "pointer",
          padding: 0,
          font: "inherit",
          textDecoration: "underline",
        }}
      >
        {driver.name}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={driver.name}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
          <div>
            <Label>Phone</Label>
            <div>{driver.phone || "Not available"}</div>
          </div>
          <div className="calc-box">
            <span>Price / bag + loading fee / bag</span>
            <b>
              {formatMoney(driver.pricePerBag)} + {formatMoney(driver.loadingFee)}
            </b>
          </div>
          <div>
            <Label>Submitted by</Label>
            <div>
              {driver.createdByName} — {fmtDate(driver.createdAt)}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
