"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { addBankAccountExpense } from "@/app/(app)/settings/actions";

interface BankAccountOption {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export default function AddBankExpenseButton({ accounts }: { accounts: BankAccountOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setBankAccountId(accounts[0]?.id ?? "");
    setDescription("");
    setAmount("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await addBankAccountExpense(bankAccountId, { description, amount: Number(amount) || 0 });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not add expense");
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
        💸 Add bank expense
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Debit a bank account">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Account to debit</label>
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
              placeholder="e.g. Bank charges"
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
            {loading ? "Saving…" : "Add debit"}
          </button>
        </form>
      </Modal>
    </>
  );
}
