"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import {
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setBankAccountActive,
} from "@/app/(app)/settings/actions";

export interface BankAccountRow {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  startingBalance: number;
  active: boolean;
  balance: number;
}

function AccountForm({
  initialBankName = "",
  initialAccountName = "",
  initialAccountNumber = "",
  initialStartingBalance = 0,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialBankName?: string;
  initialAccountName?: string;
  initialAccountNumber?: string;
  initialStartingBalance?: number;
  submitLabel: string;
  onSubmit: (data: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    startingBalance: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [bankName, setBankName] = useState(initialBankName);
  const [accountName, setAccountName] = useState(initialAccountName);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [startingBalance, setStartingBalance] = useState(initialStartingBalance ? String(initialStartingBalance) : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const result = await onSubmit({ bankName, accountName, accountNumber, startingBalance: Number(startingBalance) || 0 });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    router.refresh();
    onCancel?.();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Bank name</label>
        <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={100} placeholder="e.g. GTBank" />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Account name</label>
        <input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          maxLength={150}
          placeholder="e.g. Cusica International Ltd"
        />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Account number</label>
        <input
          type="text"
          inputMode="numeric"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          maxLength={30}
          placeholder="e.g. 0123456789"
        />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Starting balance (₦) — what&apos;s in the account right now</label>
        <input
          type="number"
          min={0}
          value={startingBalance}
          onChange={(e) => setStartingBalance(e.target.value)}
          placeholder="0"
        />
        <div className="hint">
          From here on, every approved daily record sent to this account adds its income on top of this.
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="btn btn-ghost"
          onClick={handleSubmit}
          disabled={loading || !bankName.trim() || !accountName.trim() || !accountNumber.trim()}
        >
          {loading ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        )}
        {error && <span className="field-error">{error}</span>}
      </div>
    </div>
  );
}

function AccountRow({ account }: { account: BankAccountRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Delete "${account.bankName} — ${account.accountName}" permanently?`)) return;
    setBusy(true);
    setError(null);
    const result = await deleteBankAccount(account.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not delete");
      return;
    }
    router.refresh();
  }

  async function handleToggleActive() {
    setBusy(true);
    setError(null);
    const result = await setBankAccountActive(account.id, !account.active);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not update");
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <div className="card" style={{ marginBottom: 10 }}>
        <AccountForm
          initialBankName={account.bankName}
          initialAccountName={account.accountName}
          initialAccountNumber={account.accountNumber}
          initialStartingBalance={account.startingBalance}
          submitLabel="Save changes"
          onSubmit={(data) => updateBankAccount(account.id, data)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 10, opacity: account.active ? 1 : 0.6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <b>{account.bankName}</b>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
            {account.accountName} · {account.accountNumber}
            {!account.active && <span style={{ color: "var(--text-faint)" }}> · deactivated</span>}
          </div>
          <div style={{ fontSize: 14, marginTop: 6 }}>
            Balance: <b style={{ color: "var(--green)" }}>{formatMoney(account.balance)}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button className="btn btn-sm btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setEditing(true)} disabled={busy}>
            Edit
          </button>
          <button className="btn btn-sm btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleToggleActive} disabled={busy}>
            {account.active ? "Deactivate" : "Reactivate"}
          </button>
          <button className="btn btn-sm btn-reject" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleDelete} disabled={busy}>
            Delete
          </button>
        </div>
      </div>
      {error && <div className="field-error" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}

export default function BankAccountsManager({ accounts }: { accounts: BankAccountRow[] }) {
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div>
      {accounts.length === 0 && !addingNew && <div className="empty">No company bank accounts yet.</div>}
      {accounts.map((a) => (
        <AccountRow key={a.id} account={a} />
      ))}
      {addingNew ? (
        <div className="card" style={{ marginBottom: 10 }}>
          <AccountForm submitLabel="Add account" onSubmit={createBankAccount} onCancel={() => setAddingNew(false)} />
        </div>
      ) : (
        <button className="btn btn-ghost" onClick={() => setAddingNew(true)}>
          + Add bank account
        </button>
      )}
    </div>
  );
}
