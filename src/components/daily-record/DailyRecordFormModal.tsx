"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { createDailyRecord, updateDailyRecord } from "@/app/(app)/daily-record/actions";
import { formatMoney } from "@/lib/money";

interface DriverOption {
  id: string;
  name: string;
  pricePerBag: number;
  loadingFee: number;
}
interface CustomerOption {
  id: string;
  name: string;
  pricePerBag: number;
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
  bonusBags: string;
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

export interface DailyRecordFormInitial {
  date: string;
  openingStock: number;
  production: { packerName: string; bags: number }[];
  factoryBags: number;
  factoryBagsFromLeakage: number;
  factoryPricePerBag: number;
  factoryCustomerId: string | null;
  pumpWaterAmount: number;
  driverSales: { driverId: string; bags: number; bonusBags: number }[];
  truckDeliveries: {
    customerId: string | null;
    bags: number;
    ownTruck: boolean;
    fuelCost: number;
    hiredCost: number;
  }[];
  leakageBags: number;
  expenses: { description: string; amount: number; paid: boolean }[];
}

function toProductionRows(rows: DailyRecordFormInitial["production"]): ProductionRow[] {
  if (rows.length === 0) return [{ key: nextKey(), packerName: "", bags: "" }];
  return rows.map((r) => ({ key: nextKey(), packerName: r.packerName, bags: String(r.bags) }));
}
function toDriverSaleRows(rows: DailyRecordFormInitial["driverSales"], firstDriverId: string): DriverSaleRow[] {
  if (rows.length === 0) return [{ key: nextKey(), driverId: firstDriverId, bags: "", bonusBags: "" }];
  return rows.map((r) => ({
    key: nextKey(),
    driverId: r.driverId,
    bags: String(r.bags),
    bonusBags: r.bonusBags ? String(r.bonusBags) : "",
  }));
}
function toTruckDeliveryRows(
  rows: DailyRecordFormInitial["truckDeliveries"],
  firstCustomerId: string
): TruckDeliveryRow[] {
  return rows.map((r) => ({
    key: nextKey(),
    customerId: r.customerId ?? firstCustomerId,
    bags: String(r.bags),
    ownTruck: r.ownTruck,
    fuelCost: String(r.fuelCost),
    hiredCost: String(r.hiredCost),
  }));
}
function toExpenseRows(rows: DailyRecordFormInitial["expenses"]): ExpenseRow[] {
  if (rows.length === 0) {
    return ["Rolls", "Packing bags", "Gas", "Other"].map((description) => ({
      key: nextKey(),
      description,
      amount: "",
      paid: false,
    }));
  }
  return rows.map((r) => ({ key: nextKey(), description: r.description, amount: String(r.amount), paid: r.paid }));
}

export default function DailyRecordFormModal({
  mode,
  recordId,
  open,
  onClose,
  onSaved,
  initial,
  leakageOpening,
  drivers,
  customers,
  canEditOpeningStock,
  canEditFactoryPrice,
}: {
  mode: "create" | "edit";
  recordId?: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initial: DailyRecordFormInitial;
  leakageOpening: number;
  drivers: DriverOption[];
  customers: CustomerOption[];
  canEditOpeningStock?: boolean;
  canEditFactoryPrice?: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initial.date);
  const [openingValue, setOpeningValue] = useState(String(initial.openingStock));
  const [production, setProduction] = useState<ProductionRow[]>(() => toProductionRows(initial.production));
  const [driverSales, setDriverSales] = useState<DriverSaleRow[]>(() =>
    toDriverSaleRows(initial.driverSales, drivers[0]?.id ?? "")
  );
  const [truckDeliveries, setTruckDeliveries] = useState<TruckDeliveryRow[]>(() =>
    toTruckDeliveryRows(initial.truckDeliveries, customers[0]?.id ?? "")
  );
  const [factoryBags, setFactoryBags] = useState(initial.factoryBags ? String(initial.factoryBags) : "");
  const [factoryBagsFromLeakage, setFactoryBagsFromLeakage] = useState(
    initial.factoryBagsFromLeakage ? String(initial.factoryBagsFromLeakage) : ""
  );
  const [factoryPrice, setFactoryPrice] = useState(String(initial.factoryPricePerBag));
  const [factoryCustomerId, setFactoryCustomerId] = useState(initial.factoryCustomerId ?? "");
  const [pumpWaterAmount, setPumpWaterAmount] = useState(initial.pumpWaterAmount ? String(initial.pumpWaterAmount) : "");
  const [leakageBags, setLeakageBags] = useState(initial.leakageBags ? String(initial.leakageBags) : "");
  const [expenses, setExpenses] = useState<ExpenseRow[]>(() => toExpenseRows(initial.expenses));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const closingPreview = useMemo(() => {
    const prodTotal = production.reduce((s, p) => s + (Number(p.bags) || 0), 0);
    const driverBagsTotal = driverSales.reduce((s, d) => s + (Number(d.bags) || 0), 0);
    const driverBonusTotal = driverSales.reduce((s, d) => s + (Number(d.bonusBags) || 0), 0);
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
  }, [production, driverSales, truckDeliveries, factoryBags, factoryBagsFromLeakage, leakageBags, openingValue]);

  const leakageClosingPreview = leakageOpening + (Number(leakageBags) || 0) - (Number(factoryBagsFromLeakage) || 0);
  const factoryTotal = (Number(factoryBags) || 0) * (Number(factoryPrice) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
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
          bonusBags: Number(d.bonusBags) || 0,
        })),
      truckDeliveries: truckDeliveries
        .filter((t) => (Number(t.bags) || 0) > 0 && t.customerId)
        .map((t) => ({
          customerId: t.customerId,
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
    const result =
      mode === "create"
        ? await createDailyRecord({ date, ...payload })
        : await updateDailyRecord(recordId!, payload);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save daily record");
      return;
    }
    onClose();
    onSaved?.();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? "New Daily Record" : `Edit Daily Record — ${initial.date}`} maxWidth={720}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Date{mode === "edit" ? " — not editable" : ""}</label>
            <input
              type="date"
              value={date}
              onChange={mode === "create" ? (e) => setDate(e.target.value) : undefined}
              readOnly={mode === "edit"}
              disabled={mode === "edit"}
              required
            />
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
          const bonus = Number(row.bonusBags) || 0;
          const total = bags * (driver?.pricePerBag ?? 0) + bags * (driver?.loadingFee ?? 0);
          return (
            <div key={row.key}>
              <div className="repeater-row dr" style={{ gridTemplateColumns: "1.3fr .9fr .9fr auto" }}>
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
                  <input
                    type="number"
                    placeholder="Instant incentive"
                    min={0}
                    value={row.bonusBags}
                    onChange={(e) =>
                      setDriverSales((rows) => rows.map((r) => (r.key === row.key ? { ...r, bonusBags: e.target.value } : r)))
                    }
                  />
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
                Instant incentive: +{bonus} bags (manual) · Total: {formatMoney(total)}
                {driver ? ` (₦${driver.pricePerBag}/bag + ₦${driver.loadingFee}/bag loading)` : ""}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className="add-row-btn"
          onClick={() =>
            setDriverSales((rows) => [
              ...rows,
              { key: nextKey(), driverId: drivers[0]?.id ?? "", bags: "", bonusBags: "" },
            ])
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
                  {customers.length === 0 && <option value="">No customers yet</option>}
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
            {(() => {
              const truckCustomer = row.customerId ? customerById.get(row.customerId) : undefined;
              const price = truckCustomer?.pricePerBag ?? 0;
              return (
                <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: -6, marginBottom: 10 }}>
                  Revenue: {formatMoney((Number(row.bags) || 0) * price)} (₦{price}/bag
                  {truckCustomer ? ` — ${truckCustomer.name}'s price` : ""})
                  {truckCustomer && price === 0 ? " — no price set for this customer yet" : ""}
                </div>
              );
            })()}
          </div>
        ))}
        <button
          type="button"
          className="add-row-btn"
          onClick={() =>
            setTruckDeliveries((rows) => [
              ...rows,
              { key: nextKey(), customerId: customers[0]?.id ?? "", bags: "", ownTruck: true, fuelCost: "", hiredCost: "" },
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
          {loading ? "Saving…" : mode === "create" ? "Save daily record" : "Save changes"}
        </button>
      </form>
    </Modal>
  );
}
