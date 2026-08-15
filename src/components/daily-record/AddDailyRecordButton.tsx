"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { createDailyRecord } from "@/app/(app)/daily-record/actions";
import { todayISO } from "@/lib/week";

interface DriverOption {
  id: string;
  name: string;
}
interface CustomerOption {
  id: string;
  name: string;
}

interface ProductionRow {
  key: number;
  packerName: string;
  bags: string;
}
interface DriverSaleRow {
  key: number;
  driverId: string;
  bags: string;
  pricePerBag: string;
  loadingFee: string;
  customerId: string;
}
interface ExpenseRow {
  key: number;
  description: string;
  amount: string;
  paid: boolean;
}

let rowKeySeq = 0;
function nextKey() {
  rowKeySeq += 1;
  return rowKeySeq;
}

function defaultExpenseRows(): ExpenseRow[] {
  return ["Rolls", "Packing bags", "Gas", "Other"].map((description) => ({
    key: nextKey(),
    description,
    amount: "0",
    paid: false,
  }));
}

export default function AddDailyRecordButton({
  openingStock,
  drivers,
  customers,
  canEditOpeningStock,
}: {
  openingStock: number;
  drivers: DriverOption[];
  customers: CustomerOption[];
  canEditOpeningStock?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [openingValue, setOpeningValue] = useState(String(openingStock));
  const [production, setProduction] = useState<ProductionRow[]>([{ key: nextKey(), packerName: "", bags: "0" }]);
  const [driverSales, setDriverSales] = useState<DriverSaleRow[]>([
    { key: nextKey(), driverId: drivers[0]?.id ?? "", bags: "0", pricePerBag: "0", loadingFee: "0", customerId: "" },
  ]);
  const [factoryBags, setFactoryBags] = useState("0");
  const [factoryPrice, setFactoryPrice] = useState("0");
  const [factoryCustomerId, setFactoryCustomerId] = useState("");
  const [pumpWaterAmount, setPumpWaterAmount] = useState("0");
  const [leakageBags, setLeakageBags] = useState("0");
  const [expenses, setExpenses] = useState<ExpenseRow[]>(defaultExpenseRows());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const closingPreview = useMemo(() => {
    const prodTotal = production.reduce((s, p) => s + (Number(p.bags) || 0), 0);
    const driverBagsTotal = driverSales.reduce((s, d) => s + (Number(d.bags) || 0), 0);
    return (
      (Number(openingValue) || 0) +
      prodTotal -
      (Number(factoryBags) || 0) -
      driverBagsTotal -
      (Number(leakageBags) || 0)
    );
  }, [production, driverSales, factoryBags, leakageBags, openingValue]);

  function resetForm() {
    setDate(todayISO());
    setOpeningValue(String(openingStock));
    setProduction([{ key: nextKey(), packerName: "", bags: "0" }]);
    setDriverSales([
      { key: nextKey(), driverId: drivers[0]?.id ?? "", bags: "0", pricePerBag: "0", loadingFee: "0", customerId: "" },
    ]);
    setFactoryBags("0");
    setFactoryPrice("0");
    setFactoryCustomerId("");
    setPumpWaterAmount("0");
    setLeakageBags("0");
    setExpenses(defaultExpenseRows());
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      date,
      openingStockOverride: canEditOpeningStock ? Number(openingValue) || 0 : null,
      production: production
        .filter((p) => (Number(p.bags) || 0) > 0)
        .map((p) => ({ packerName: p.packerName || "Unnamed", bags: Number(p.bags) || 0 })),
      factoryBags: Number(factoryBags) || 0,
      factoryPricePerBag: Number(factoryPrice) || 0,
      factoryCustomerId: factoryCustomerId || null,
      pumpWaterAmount: Number(pumpWaterAmount) || 0,
      driverSales: driverSales
        .filter((d) => (Number(d.bags) || 0) > 0 && d.driverId)
        .map((d) => ({
          driverId: d.driverId,
          bags: Number(d.bags) || 0,
          pricePerBag: Number(d.pricePerBag) || 0,
          loadingFee: Number(d.loadingFee) || 0,
          customerId: d.customerId || null,
        })),
      leakageBags: Number(leakageBags) || 0,
      expenses: expenses
        .filter((e) => e.description.trim().length > 0 && (Number(e.amount) || 0) > 0)
        .map((e) => ({ description: e.description.trim(), amount: Number(e.amount) || 0, paid: e.paid })),
    };
    const result = await createDailyRecord(payload);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save daily record");
      return;
    }
    setOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-primary no-print" onClick={() => setOpen(true)}>
        + New daily entry
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Daily Record" maxWidth={680}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="field">
              <label>Opening stock (bags){canEditOpeningStock ? " — editable (Super Admin)" : ""}</label>
              <input
                type="number"
                min={0}
                value={openingValue}
                onChange={canEditOpeningStock ? (e) => setOpeningValue(e.target.value) : undefined}
                readOnly={!canEditOpeningStock}
              />
            </div>
          </div>

          <div className="subhead">Production</div>
          {production.map((row) => (
            <div className="repeater-row" key={row.key}>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  placeholder="Packer name"
                  value={row.packerName}
                  onChange={(e) =>
                    setProduction((rows) => rows.map((r) => (r.key === row.key ? { ...r, packerName: e.target.value } : r)))
                  }
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="number"
                  placeholder="Bags packed"
                  min={0}
                  value={row.bags}
                  onChange={(e) =>
                    setProduction((rows) => rows.map((r) => (r.key === row.key ? { ...r, bags: e.target.value } : r)))
                  }
                />
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setProduction((rows) => rows.filter((r) => r.key !== row.key))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-row-btn"
            onClick={() => setProduction((rows) => [...rows, { key: nextKey(), packerName: "", bags: "0" }])}
          >
            + Add packer
          </button>

          <div className="subhead">Factory sales (walk-in, no driver)</div>
          <div className="form-grid">
            <div className="field">
              <label>Bags sold</label>
              <input type="number" min={0} value={factoryBags} onChange={(e) => setFactoryBags(e.target.value)} />
            </div>
            <div className="field">
              <label>Price per bag (₦)</label>
              <input type="number" min={0} value={factoryPrice} onChange={(e) => setFactoryPrice(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Customer (optional — links these bags to a customer&apos;s incentive total)</label>
            <select value={factoryCustomerId} onChange={(e) => setFactoryCustomerId(e.target.value)}>
              <option value="">No customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="subhead">Pump water sales</div>
          <div className="field">
            <label>Amount from pump water sales (₦)</label>
            <input type="number" min={0} value={pumpWaterAmount} onChange={(e) => setPumpWaterAmount(e.target.value)} />
          </div>

          <div className="subhead">Driver sales</div>
          {driverSales.map((row) => (
            <div className="repeater-row dr" key={row.key}>
              <div className="field" style={{ marginBottom: 0 }}>
                <select
                  value={row.driverId}
                  onChange={(e) =>
                    setDriverSales((rows) => rows.map((r) => (r.key === row.key ? { ...r, driverId: e.target.value } : r)))
                  }
                >
                  {drivers.length === 0 && <option value="">No approved drivers yet</option>}
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="number"
                  placeholder="Bags"
                  min={0}
                  value={row.bags}
                  onChange={(e) =>
                    setDriverSales((rows) => rows.map((r) => (r.key === row.key ? { ...r, bags: e.target.value } : r)))
                  }
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="number"
                  placeholder="Price/bag"
                  min={0}
                  value={row.pricePerBag}
                  onChange={(e) =>
                    setDriverSales((rows) => rows.map((r) => (r.key === row.key ? { ...r, pricePerBag: e.target.value } : r)))
                  }
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="number"
                  placeholder="Loading ₦"
                  min={0}
                  value={row.loadingFee}
                  onChange={(e) =>
                    setDriverSales((rows) => rows.map((r) => (r.key === row.key ? { ...r, loadingFee: e.target.value } : r)))
                  }
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <select
                  value={row.customerId}
                  onChange={(e) =>
                    setDriverSales((rows) => rows.map((r) => (r.key === row.key ? { ...r, customerId: e.target.value } : r)))
                  }
                >
                  <option value="">No customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setDriverSales((rows) => rows.filter((r) => r.key !== row.key))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-row-btn"
            onClick={() =>
              setDriverSales((rows) => [
                ...rows,
                { key: nextKey(), driverId: drivers[0]?.id ?? "", bags: "0", pricePerBag: "0", loadingFee: "0", customerId: "" },
              ])
            }
          >
            + Add driver sale
          </button>

          <div className="subhead">Leakages</div>
          <div className="field">
            <label>Leakages (bags)</label>
            <input type="number" min={0} value={leakageBags} onChange={(e) => setLeakageBags(e.target.value)} />
          </div>

          <div className="subhead">Expenses</div>
          {expenses.map((row) => (
            <div
              className="repeater-row"
              key={row.key}
              style={{ gridTemplateColumns: "1.4fr .8fr auto auto", alignItems: "center" }}
            >
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  placeholder="Description (e.g. Diesel)"
                  value={row.description}
                  onChange={(e) =>
                    setExpenses((rows) => rows.map((r) => (r.key === row.key ? { ...r, description: e.target.value } : r)))
                  }
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="number"
                  placeholder="Amount ₦"
                  min={0}
                  value={row.amount}
                  onChange={(e) =>
                    setExpenses((rows) => rows.map((r) => (r.key === row.key ? { ...r, amount: e.target.value } : r)))
                  }
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                <input
                  type="checkbox"
                  checked={row.paid}
                  onChange={(e) =>
                    setExpenses((rows) => rows.map((r) => (r.key === row.key ? { ...r, paid: e.target.checked } : r)))
                  }
                />
                Paid
              </label>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setExpenses((rows) => rows.filter((r) => r.key !== row.key))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-row-btn"
            onClick={() => setExpenses((rows) => [...rows, { key: nextKey(), description: "", amount: "0", paid: false }])}
          >
            + Add expense
          </button>

          <div className="calc-box">
            <span>Projected closing stock</span>
            <b>{closingPreview} bags</b>
          </div>

          {error && <div className="field-error">{error}</div>}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save daily record"}
          </button>
        </form>
      </Modal>
    </>
  );
}
