"use client";

import { useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";

export interface BankBalanceAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  active: boolean;
  isDefaultExpenseAccount: boolean;
  balance: number;
  pendingAmount: number;
  totalExpenses: number;
  totalCredits: number;
  dailyExpensesDebited: number;
}

export default function BankBalanceCard({ accounts }: { accounts: BankBalanceAccount[] }) {
  const [open, setOpen] = useState(false);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalPending = accounts.reduce((s, a) => s + a.pendingAmount, 0);

  return (
    <>
      <KpiCard
        label="Bank Balance"
        value={formatMoney(totalBalance)}
        icon="🏦"
        iconBg="rgba(47,215,196,.15)"
        iconColor="var(--teal)"
        delta={accounts.length > 0 ? "Across all accounts — view breakdown →" : "No accounts yet"}
        onClick={() => setOpen(true)}
      />
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title="Company Bank Accounts" maxWidth={560}>
          <div style={{ fontSize: 13, marginBottom: 14 }}>
            Total balance: <b style={{ color: "var(--green)" }}>{formatMoney(totalBalance)}</b>
            {totalPending > 0 && (
              <span style={{ fontSize: 12, color: "var(--text-faint)" }}> · {formatMoney(totalPending)} sent but not yet confirmed received</span>
            )}
          </div>
          {accounts.length === 0 ? (
            <div className="empty">No company bank accounts yet.</div>
          ) : (
            accounts.map((a) => (
              <div key={a.id} className="card" style={{ marginBottom: 10, opacity: a.active ? 1 : 0.6 }}>
                <b>{a.bankName}</b>
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
                  {a.accountName} · {a.accountNumber}
                  {!a.active && <span style={{ color: "var(--text-faint)" }}> · deactivated</span>}
                  {a.isDefaultExpenseAccount && <span style={{ color: "var(--accent)" }}> · default expense account</span>}
                </div>
                <div style={{ fontSize: 14, marginTop: 6 }}>
                  Balance: <b style={{ color: "var(--green)" }}>{formatMoney(a.balance)}</b>
                </div>
                {a.pendingAmount > 0 && (
                  <div style={{ fontSize: 12.5, marginTop: 2, color: "var(--text-faint)" }}>
                    {formatMoney(a.pendingAmount)} sent but not yet confirmed received
                  </div>
                )}
                {a.totalExpenses > 0 && (
                  <div style={{ fontSize: 12.5, marginTop: 2, color: "var(--text-faint)" }}>
                    {formatMoney(a.totalExpenses)} debited in manual expenses
                  </div>
                )}
                {a.totalCredits > 0 && (
                  <div style={{ fontSize: 12.5, marginTop: 2, color: "var(--text-faint)" }}>
                    {formatMoney(a.totalCredits)} added in manual credits
                  </div>
                )}
                {a.isDefaultExpenseAccount && (
                  <div style={{ fontSize: 12.5, marginTop: 2, color: "var(--text-faint)" }}>
                    {formatMoney(a.dailyExpensesDebited)} auto-debited from daily record expenses actually paid since
                    becoming the default
                  </div>
                )}
              </div>
            ))
          )}
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
            Manage accounts, debit, or credit them on the Settings page.
          </div>
        </Modal>
      )}
    </>
  );
}
