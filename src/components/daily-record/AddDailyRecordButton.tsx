"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { createDailyRecord } from "@/app/(app)/daily-record/actions";
import { todayISO } from "@/lib/week";
import { formatMoney } from "@/lib/money";
import { bonusForBags, type IncentiveTierLike } from "@/lib/incentives";

interface DriverOption {
  id: string;
  name: string;
  pricePerBag: number;
  loadingFee: number;
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
  customerId: string;
}
interface TruckDeliveryRow {
  key: number;
  customerId: string;
  bags: string;
  ownTruck: boolean;
  fuelCost: string;
  hiredCost: string;
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
    amount: "",
    paid: false,
  }));
}

export default function AddDailyRecordButton({
  openingStock,
  leakageOpening,
  drivers,
  customers,
  incentiveTiers,
  canEditOpeningStock,
  factoryPricePerBag,
  canEditFactoryPrice,
}: {
  openingStock: number;
  leakageOpening: number;
  drivers: DriverOption[];
  customers: CustomerOption[];
  incentiveTiers: IncentiveTierLike[];
  canEditOpeningStock?: boolean;
  factoryPricePerBag: number;
  canEditFactoryPrice?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [openingValue, setOpeningValue] = useState(String(openingStock));
  const [production, setProduction] = useState<ProductionRow[]>([{ key: nextKey(), packerName: "", bags: "" }]);
  const [driverSales, setDriverSales] = useState<DriverSaleRow[]>([
    { key: nextKey(), driverId: drivers[0]?.id ?? "", bags: "", customerId: "" },
  ]);
  const [truckDeliveries, setTruckDeliveries] = useState<TruckDeliveryRow[]>([]);
  const [factoryBags, setFactoryBags] = useState("");
  const [factoryBagsFromLeakage, setFactoryBagsFromLeakage] = useState("");
  const [factoryPrice, setFactoryPrice] = useState(String(factoryPricePerBag));
  const [factoryCustomerId, setFactoryCustomerId] = useState("");
  const [pumpWaterAmount, setPumpWaterAmount] = useState("");
  const [leakageBags, setLeakageBags] = useState("");
  const [expenses, setExpenses] = useState<ExpenseRow[]>(defaultExpenseRows());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  const closingPreview = useMemo(() => {
    const prodTotal = production.reduce((s, p) => s + (Number(p.bags) || 0), 0);
    const driverBagsTotal = driverSales.reduce((s, d) => s + (Number(d.bags) || 0), 0);
    const driverBonusTotal = driverSales.reduce((s, d) => s + bonusForBags(Number(d.bags) || 0, incentiveTiers), 0);
    const truckBagsTotal = truckDeliveries.reduce((s, t) => s + (Number(t.bags) || 0), 0);
    const factoryBagsNet = (Number(factoryBags) || 0) - (Number(factoryBagsFromLeakage) || 0);
    return (
      (Number(openingValue) || 0) +
      prodTotal -
      factoryBagsNet -
      driverBagsTotal -
      driverBonusTotal -
      truckBagsTotal -
      (Number(leakageBags) || 0)
    );
  }, [production, driverSales, truckDeliveries, factoryBags, factoryBagsFromLeakage, leakageBags, openingValue, incentiveTiers]);

  const leakageClosingPreview = leakageOpening + (Number(leakageBags) || 0) - (Number(factoryBagsFromLeakage) || 0);
  const factoryTotal = (Number(factoryBags) || 0) * (Number(factoryPrice) || 0);

  function resetForm() {
    setDate(todayISO());
    setOpeningValue(String(openingStock));
    setProduction([{ key: nextKey(), packerName: "", bags: "" }]);
    setDriverSales([{ key: nextKey(), driverId: drivers[0]?.id ?? "", bags: "", customerId: "" }]);
    setTruckDeliveries([]);
    setFactoryBags("");
    setFactoryBagsFromLeakage("");
    setFactoryPrice(String(factoryPricePerBag));
    setFactoryCustomerId("");
    setPumpWaterAmount("");
    setLeakageBags("");
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
      factoryBagsFromLeakage: Number(factoryBagsFromLeakage) || 0,
      factoryPricePerBag: Number(factoryPrice) || 0,
      factoryCustomerId: factoryCustomerId || null,
      pumpWaterAmount: Number(pumpWaterAmount) || 0,
      driverSales: driverSales
        .filter((d) => (Number(d.bags) || 0) > 0 && d.driverId)
        .map((d) => ({
          driverId: d.driverId,
          bags: Number(d.bags) || 0,
          customerId: d.customerId || null,
        })),
      truckDeliveries: truckDeliveries
        .filter((t) => (Number(t.bags) || 0) > 0)
        .map((t) => ({
          customerId: t.customerId || null,
          bags: Number(t.bags) || 0,
          ownTruck: t.ownTruck,
          fuelCost: Number(t.fuelCost) || 0,
          hiredCost: Number(t.hiredCost) || 0,
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
      <Modal open={open} onClose={() => setOpen(false)} title="New Daily Record" maxWidth={720}>
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
                placeholder="0"
                value={openingValue}
                onChange={canEditOpeningStock ? (e) => setOpeningValue(e.target.value) : undefined}
                readOnly={!canEditOpeningStock}
              />
            </div>
          </div>
          <div className="calc-box" style={{ marginBottom: 14 }}>
            <span>Leakage balance carried forward</span>
            <b>{leakageOpening} bags</b>
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
            onClick={() => setProduction((rows) => [...rows, { key: nextKey(), packerName: "", bags: "" }])}
          >
            + Add packer
          </button>

          <div className="subhead">Factory sales (walk-in, no driver)</div>
          <div className="form-grid">
            <div className="field">
              <label>Bags sold</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={factoryBags}
                onChange={(e) => setFactoryBags(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Price per bag (₦){canEditFactoryPrice ? " — editable (Admin+)" : " — fixed"}</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={factoryPrice}
                onChange={canEditFactoryPrice ? (e) => setFactoryPrice(e.target.value) : undefined}
                readOnly={!canEditFactoryPrice}
              />
            </div>
          </div>
          <div className="field">
            <label>Of these, rebagged from leakage stock (bags — available: {leakageOpening})</label>
            <input
              type="number"
              min={0}
              max={leakageOpening}
              placeholder="0"
              value={factoryBagsFromLeakage}
              onChange={(e) => setFactoryBagsFromLeakage(e.target.value)}
            />
          </div>
          <div className="calc-box" style={{ marginTop: -4, marginBottom: 14 }}>
            <span>Factory sale total</span>
            <b>{formatMoney(factoryTotal)}</b>
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
            <input
              type="number"
              min={0}
              placeholder="0"
              value={pumpWaterAmount}
              onChange={(e) => setPumpWaterAmount(e.target.value)}
            />
          </div>

          <div className="subhead">Driver sales</div>
          {driverSales.map((row) => {
            const driver = driverById.get(row.driverId);
            const bags = Number(row.bags) || 0;
            const bonus = bonusForBags(bags, incentiveTiers);
            const total = bags * (driver?.pricePerBag ?? 0) + (driver ? driver.loadingFee : 0);
            return (
              <div key={row.key}>
                <div className="repeater-row dr" style={{ gridTemplateColumns: "1.2fr .8fr 1.2fr auto" }}>
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
                      placeholder="Bags purchased"
                      min={0}
                      value={row.bags}
                      onChange={(e) =>
                        setDriverSales((rows) => rows.map((r) => (r.key === row.key ? { ...r, bags: e.target.value } : r)))
                      }
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <select
                      value={row.customerId}
                      onChange={(e) =>
                        setDriverSales((rows) =>
                          rows.map((r) => (r.key === row.key ? { ...r, customerId: e.target.value } : r))
                        )
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
                <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: -6, marginBottom: 10 }}>
                  Instant incentive: +{bonus} bags · Total: {formatMoney(total)}
                  {driver ? ` (₦${driver.pricePerBag}/bag + ₦${driver.loadingFee} loading)` : ""}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="add-row-btn"
            onClick={() =>
              setDriverSales((rows) => [...rows, { key: nextKey(), driverId: drivers[0]?.id ?? "", bags: "", customerId: "" }])
            }
          >
            + Add driver sale
          </button>

          <div className="subhead">Truck deliveries (our own dispatch, not a hired driver)</div>
          {truckDeliveries.map((row) => (
            <div key={row.key}>
              <div className="repeater-row" style={{ gridTemplateColumns: "1.2fr .8fr 1fr .8fr auto" }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <select
                    value={row.customerId}
                    onChange={(e) =>
                      setTruckDeliveries((rows) =>
                        rows.map((r) => (r.key === row.key ? { ...r, customerId: e.target.value } : r))
                      )
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
                <div className="field" style={{ marginBottom: 0 }}>
                  <input
                    type="number"
                    placeholder="Bags"
                    min={0}
                    value={row.bags}
                    onChange={(e) =>
                      setTruckDeliveries((rows) => rows.map((r) => (r.key === row.key ? { ...r, bags: e.target.value } : r)))
                    }
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <select
                    value={row.ownTruck ? "own" : "hired"}
                    onChange={(e) =>
                      setTruckDeliveries((rows) =>
                        rows.map((r) => (r.key === row.key ? { ...r, ownTruck: e.target.value === "own" } : r))
                      )
                    }
                  >
                    <option value="own">Our truck</option>
                    <option value="hired">Hired truck</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  {row.ownTruck ? (
                    <input
                      type="number"
                      placeholder="Fuel ₦"
                      min={0}
                      value={row.fuelCost}
                      onChange={(e) =>
                        setTruckDeliveries((rows) =>
                          rows.map((r) => (r.key === row.key ? { ...r, fuelCost: e.target.value } : r))
                        )
                      }
                    />
                  ) : (
                    <input
                      type="number"
                      placeholder="Hired ₦"
                      min={0}
                      value={row.hiredCost}
                      onChange={(e) =>
                        setTruckDeliveries((rows) =>
                          rows.map((r) => (r.key === row.key ? { ...r, hiredCost: e.target.value } : r))
                        )
                      }
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setTruckDeliveries((rows) => rows.filter((r) => r.key !== row.key))}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: -6, marginBottom: 10 }}>
                Revenue: {formatMoney((Number(row.bags) || 0) * (Number(factoryPrice) || 0))} (at factory price)
              </div>
            </div>
          ))}
          <button
            type="button"
            className="add-row-btn"
            onClick={() =>
              setTruckDeliveries((rows) => [
                ...rows,
                { key: nextKey(), customerId: "", bags: "", ownTruck: true, fuelCost: "", hiredCost: "" },
              ])
            }
          >
            + Add truck delivery
          </button>

          <div className="subhead">Leakages</div>
          <div className="field">
            <label>New leakages today (bags)</label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={leakageBags}
              onChange={(e) => setLeakageBags(e.target.value)}
            />
          </div>
          <div className="calc-box" style={{ marginBottom: 14 }}>
            <span>Leakage balance to carry forward</span>
            <b>{leakageClosingPreview} bags</b>
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
            onClick={() => setExpenses((rows) => [...rows, { key: nextKey(), description: "", amount: "", paid: false }])}
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
