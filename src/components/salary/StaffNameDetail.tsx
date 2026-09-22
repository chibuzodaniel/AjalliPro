"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";

export default function StaffNameDetail({
  name,
  roleLabel,
  phone,
  salaryAmount,
  payrollEnabled,
  paid,
}: {
  name: string;
  roleLabel: string | null;
  phone: string | null;
  salaryAmount: number;
  payrollEnabled: boolean;
  paid: boolean;
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
              Role
            </div>
            <div>{roleLabel || "Not available"}</div>
          </div>
          <div>
            <div style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
              Phone
            </div>
            <div>{phone || "Not available"}</div>
          </div>
          {payrollEnabled ? (
            <>
              <div className="calc-box">
                <span>Salary / month</span>
                <b>{formatMoney(salaryAmount)}</b>
              </div>
              <div className="calc-box">
                <span>This month</span>
                <b style={{ color: paid ? "var(--green)" : "var(--red)" }}>{paid ? "Paid" : "Not paid yet"}</b>
              </div>
            </>
          ) : (
            <div className="calc-box">
              <span>Payroll</span>
              <b style={{ color: "var(--text-faint)" }}>Not on payroll</b>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
