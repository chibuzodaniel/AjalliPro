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
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createCustomer({
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
    });
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
            <input type="text" placeholder="e.g. Acme Stores" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input type="text" placeholder="e.g. 0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Address (optional)</label>
            <input type="text" placeholder="e.g. 12 Market Road, Onitsha" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="field">
            <label>Email (optional)</label>
            <input type="email" placeholder="you@customer.com" value={email} onChange={(e) => setEmail(e.target.value)} />
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
