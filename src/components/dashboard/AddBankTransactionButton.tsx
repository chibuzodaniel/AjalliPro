"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { addBankAccountExpense, addBankAccountCredit } from "@/app/(app)/settings/actions";

interface BankAccountOption {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

type TransactionType = "DEBIT" | "CREDIT";

export default function AddBankTransactionButton({ accounts }: { accounts: BankAccountOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("DEBIT");
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setType("DEBIT");
    setBankAccountId(accounts[0]?.id ?? "");
    setDescription("");
    setAmount("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const action = type === "DEBIT" ? addBankAccountExpense : addBankAccountCredit;
    const result = await action(bankAccountId, { description, amount: Number(amount) || 0 });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? `Could not add ${type === "DEBIT" ? "debit" : "credit"}`);
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  if (accounts.length === 0) return null;

  return (
    <>
      <button className="btn btn-ghost no-print" onClick={() => setOpen(true)}>
        🏦 Debit / credit account
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Debit or credit a bank account">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Type</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${type === "DEBIT" ? "btn-reject" : "btn-ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setType("DEBIT")}
              >
                Debit (−)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${type === "CREDIT" ? "btn-approve" : "btn-ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setType("CREDIT")}
              >
                Credit (+)
              </button>
            </div>
          </div>
          <div className="field">
            <label>Account to {type === "DEBIT" ? "debit" : "credit"}</label>
            <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bankName} — {a.accountName} · {a.accountNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Description</label>
            <input
              type="text"
              placeholder={type === "DEBIT" ? "e.g. Bank charges" : "e.g. Cash deposit"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="field">
            <label>Amount (₦)</label>
            <input type="number" min={1} placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          {error && <div className="field-error">{error}</div>}
          <button className="btn btn-primary" style={{ width: "100%" }} type="submit" disabled={loading}>
            {loading ? "Saving…" : type === "DEBIT" ? "Add debit" : "Add credit"}
          </button>
        </form>
      </Modal>
    </>
  );
}
