"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";

export default function DriverNameDetail({
  name,
  phone,
  pricePerBag,
  loadingFee,
  status,
  weeklyBags,
}: {
  name: string;
  phone: string | null;
  pricePerBag: number;
  loadingFee: number;
  status: string;
  weeklyBags: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, font: "inherit", textDecoration: "underline" }}
      >
        {name}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={name}>
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
        </div>
      </Modal>
    </>
  );
}
