"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { createCustomer } from "@/app/(app)/customers/actions";

export default function AddCustomerButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setPhone("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createCustomer({ name, email, phone: phone || undefined });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not add customer");
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-primary no-print" onClick={() => setOpen(true)}>
        + Add customer
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Customer">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Customer name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {error && <div className="field-error">{error}</div>}
          <button className="btn btn-primary" style={{ width: "100%" }} type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save customer"}
          </button>
        </form>
      </Modal>
    </>
  );
}
