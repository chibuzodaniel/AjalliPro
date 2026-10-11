"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import {
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setBankAccountActive,
  addBankAccountExpense,
  deleteBankAccountExpense,
  setDefaultExpenseAccount,
} from "@/app/(app)/settings/actions";

export interface BankAccountExpenseRow {
  id: string;
  description: string;
  amount: number;
  createdAt: Date;
  createdByName: string;
}

export interface BankAccountRow {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  startingBalance: number;
  active: boolean;
  balance: number;
  isDefaultExpenseAccount: boolean;
  pendingAmount: number;
  totalExpenses: number;
  expenses: BankAccountExpenseRow[];
  dailyExpensesDebited: number;
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
          From here on, every confirmed-received transfer logged against this account adds to this.
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

function ExpenseForm({ bankAccountId, onCancel }: { bankAccountId: string; onCancel: () => void }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const result = await addBankAccountExpense(bankAccountId, { description, amount: Number(amount) || 0 });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save");
      return;
    }
    router.refresh();
    onCancel();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="e.g. Bank charges"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          style={{ flex: 1 }}
        />
        <input
          type="number"
          min={1}
          placeholder="Amount ₦"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: 130 }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          className="btn btn-sm btn-ghost"
          style={{ padding: "6px 12px", fontSize: 12 }}
          onClick={handleSubmit}
          disabled={loading || !description.trim() || !amount}
        >
          {loading ? "Saving…" : "Add debit"}
        </button>
        <button className="btn btn-sm btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        {error && <span className="field-error">{error}</span>}
      </div>
    </div>
  );
}

function ExpenseEntry({ expense }: { expense: BankAccountExpenseRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Remove the "${expense.description}" debit of ${formatMoney(expense.amount)}?`)) return;
    setBusy(true);
    setError(null);
    const result = await deleteBankAccountExpense(expense.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not remove");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 13 }}>
          {expense.description}
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
            {new Date(expense.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })} ·{" "}
            {expense.createdByName}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b style={{ color: "var(--red)", fontSize: 13 }}>-{formatMoney(expense.amount)}</b>
          <button className="icon-btn" title="Remove this debit" onClick={handleDelete} disabled={busy}>
            ✕
          </button>
        </div>
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function AccountRow({
  account,
  canManage,
  canAddExpense,
}: {
  account: BankAccountRow;
  canManage: boolean;
  canAddExpense: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
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

  async function handleSetDefaultExpenseAccount() {
    setBusy(true);
    setError(null);
    const result = await setDefaultExpenseAccount(account.isDefaultExpenseAccount ? null : account.id);
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
            {account.isDefaultExpenseAccount && <span style={{ color: "var(--accent)" }}> · default expense account</span>}
          </div>
          <div style={{ fontSize: 14, marginTop: 6 }}>
            Balance: <b style={{ color: "var(--green)" }}>{formatMoney(account.balance)}</b>
          </div>
          {account.pendingAmount > 0 && (
            <div style={{ fontSize: 12.5, marginTop: 2, color: "var(--text-faint)" }}>
              {formatMoney(account.pendingAmount)} sent but not yet confirmed received
            </div>
          )}
          {account.totalExpenses > 0 && (
            <div style={{ fontSize: 12.5, marginTop: 2, color: "var(--text-faint)" }}>
              {formatMoney(account.totalExpenses)} debited in manual expenses
            </div>
          )}
          {account.isDefaultExpenseAccount && (
            <div style={{ fontSize: 12.5, marginTop: 2, color: "var(--text-faint)" }}>
              {formatMoney(account.dailyExpensesDebited)} auto-debited from daily record expenses since becoming the
              default — not the backlog from before
            </div>
          )}
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="btn btn-sm btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setEditing(true)} disabled={busy}>
              Edit
            </button>
            <button className="btn btn-sm btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleToggleActive} disabled={busy}>
              {account.active ? "Deactivate" : "Reactivate"}
            </button>
            <button className="btn btn-sm btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleSetDefaultExpenseAccount} disabled={busy}>
              {account.isDefaultExpenseAccount ? "Unset expense account" : "Set as expense account"}
            </button>
            <button className="btn btn-sm btn-reject" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleDelete} disabled={busy}>
              Delete
            </button>
          </div>
        )}
      </div>
      {error && <div className="field-error" style={{ marginTop: 6 }}>{error}</div>}

      {canAddExpense && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          {account.expenses.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              {account.expenses.map((e) => (
                <ExpenseEntry key={e.id} expense={e} />
              ))}
            </div>
          )}
          {addingExpense ? (
            <ExpenseForm bankAccountId={account.id} onCancel={() => setAddingExpense(false)} />
          ) : (
            <button className="btn btn-sm btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setAddingExpense(true)}>
              + Add expense
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function BankAccountsManager({
  accounts,
  canManage,
  canAddExpense,
}: {
  accounts: BankAccountRow[];
  canManage: boolean;
  canAddExpense: boolean;
}) {
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div>
      {accounts.length === 0 && !addingNew && <div className="empty">No company bank accounts yet.</div>}
      {accounts.map((a) => (
        <AccountRow key={a.id} account={a} canManage={canManage} canAddExpense={canAddExpense} />
      ))}
      {canManage &&
        (addingNew ? (
          <div className="card" style={{ marginBottom: 10 }}>
            <AccountForm submitLabel="Add account" onSubmit={createBankAccount} onCancel={() => setAddingNew(false)} />
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setAddingNew(true)}>
            + Add bank account
          </button>
        ))}
    </div>
  );
}
