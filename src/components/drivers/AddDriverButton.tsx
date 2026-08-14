"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { createDriver } from "@/app/(app)/drivers/actions";

export default function AddDriverButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setPhone("");
    setPrice("0");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createDriver({
      name,
      phone: phone || undefined,
      pricePerBag: Number(price) || 0,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not add driver");
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-primary no-print" onClick={() => setOpen(true)}>
        + Add driver
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Driver">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Driver name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Standard price to driver (₦/bag)</label>
            <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          {error && <div className="field-error">{error}</div>}
          <button className="btn btn-primary" style={{ width: "100%" }} type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Submit driver"}
          </button>
        </form>
      </Modal>
    </>
  );
}
