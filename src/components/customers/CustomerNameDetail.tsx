"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";

export default function CustomerNameDetail({
  name,
  email,
  phone,
  address,
  pricePerBag,
  weeklyBags,
  yearlyBags,
}: {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  pricePerBag: number;
  weeklyBags: number;
  yearlyBags: number;
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
              Address
            </div>
            <div>{address || "Not available"}</div>
          </div>
          <div>
            <div style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
              Email
            </div>
            <div>{email || "Not available"}</div>
          </div>
          <div className="calc-box">
            <span>Price / bag (truck deliveries)</span>
            <b>{pricePerBag > 0 ? formatMoney(pricePerBag) : "Not set — uses factory price"}</b>
          </div>
          <div className="calc-box">
            <span>This week / year-to-date</span>
            <b>
              {weeklyBags} / {yearlyBags} bags
            </b>
          </div>
        </div>
      </Modal>
    </>
  );
}
