"use client";

import { useEffect, useMemo, useState } from "react";
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
  loadingFeeWaived: boolean;
}
interface TruckDeliveryRow {
  key: number;
  customerId: string;
  bags: string;
  bonusBags: string;
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
function rekeyRows<T extends { key: number }>(rows: T[]): T[] {
  return rows.map((r) => ({ ...r, key: nextKey() }));
}

interface DraftState {
  date: string;
  openingValue: string;
  leakageOpeningValue: string;
  production: ProductionRow[];
  driverSales: DriverSaleRow[];
  truckDeliveries: TruckDeliveryRow[];
  factoryBags: string;
  factoryBagsFromLeakage: string;
  factoryPrice: string;
  factoryCustomerId: string;
  pumpWaterAmount: string;
  leakageBags: string;
  leakageWasteBags: string;
  expenses: ExpenseRow[];
}

function readDraft(key: string): DraftState | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DraftState) : null;
  } catch {
    return null;
  }
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
  driverSales: { driverId: string; bags: number; bonusBags: number; loadingFeeWaived: boolean }[];
  truckDeliveries: {
    customerId: string | null;
    bags: number;
    bonusBags: number;
    ownTruck: boolean;
    fuelCost: number;
    hiredCost: number;
  }[];
  leakageBags: number;
  leakageWasteBags: number;
  expenses: { description: string; amount: number; paid: boolean }[];
}

function toProductionRows(rows: DailyRecordFormInitial["production"]): ProductionRow[] {
  if (rows.length === 0) return [{ key: nextKey(), packerName: "", bags: "" }];
  return rows.map((r) => ({ key: nextKey(), packerName: r.packerName, bags: String(r.bags) }));
}
function toDriverSaleRows(rows: DailyRecordFormInitial["driverSales"], firstDriverId: string): DriverSaleRow[] {
  if (rows.length === 0)
    return [{ key: nextKey(), driverId: firstDriverId, bags: "", bonusBags: "", loadingFeeWaived: false }];
  return rows.map((r) => ({
    key: nextKey(),
    driverId: r.driverId,
    bags: String(r.bags),
    bonusBags: r.bonusBags ? String(r.bonusBags) : "",
    loadingFeeWaived: r.loadingFeeWaived,
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
    bonusBags: r.bonusBags ? String(r.bonusBags) : "",
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
  canEditLeakageOpening,
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
  canEditLeakageOpening?: boolean;
}) {
  const router = useRouter();
  const draftKey = mode === "create" ? "ajalli:daily-record-draft:create" : `ajalli:daily-record-draft:edit:${recordId}`;
  const draft = useMemo(() => readDraft(draftKey), [draftKey]);
  const [restoredDraft, setRestoredDraft] = useState(() => draft !== null);

  // In create mode, always start on today's date even if a draft is restored — the draft
  // key isn't scoped per-day, so a forgotten entry from days ago would otherwise silently
  // pre-fill an old date and make a fresh "New daily entry" collide with a date that
  // already has a real record.
  const [date, setDate] = useState(mode === "create" ? initial.date : (draft?.date ?? initial.date));
  const [openingValue, setOpeningValue] = useState(draft?.openingValue ?? String(initial.openingStock));
  const [leakageOpeningValue, setLeakageOpeningValue] = useState(draft?.leakageOpeningValue ?? String(leakageOpening));
  const [production, setProduction] = useState<ProductionRow[]>(() =>
    draft
      ? rekeyRows(draft.production).map((r) => ({ ...r, packerName: r.packerName ?? "" }))
      : toProductionRows(initial.production)
  );
  const [driverSales, setDriverSales] = useState<DriverSaleRow[]>(() =>
    draft
      ? rekeyRows(draft.driverSales).map((r) => ({ ...r, loadingFeeWaived: r.loadingFeeWaived ?? false }))
      : toDriverSaleRows(initial.driverSales, drivers[0]?.id ?? "")
  );
  const [truckDeliveries, setTruckDeliveries] = useState<TruckDeliveryRow[]>(() =>
    draft ? rekeyRows(draft.truckDeliveries) : toTruckDeliveryRows(initial.truckDeliveries, customers[0]?.id ?? "")
  );
  const [factoryBags, setFactoryBags] = useState(
    draft?.factoryBags ?? (initial.factoryBags ? String(initial.factoryBags) : "")
  );
  const [factoryBagsFromLeakage, setFactoryBagsFromLeakage] = useState(
    draft?.factoryBagsFromLeakage ?? (initial.factoryBagsFromLeakage ? String(initial.factoryBagsFromLeakage) : "")
  );
  const [factoryPrice, setFactoryPrice] = useState(draft?.factoryPrice ?? String(initial.factoryPricePerBag));
  const [factoryCustomerId, setFactoryCustomerId] = useState(draft?.factoryCustomerId ?? (initial.factoryCustomerId ?? ""));
  const [pumpWaterAmount, setPumpWaterAmount] = useState(
    draft?.pumpWaterAmount ?? (initial.pumpWaterAmount ? String(initial.pumpWaterAmount) : "")
  );
  const [leakageBags, setLeakageBags] = useState(draft?.leakageBags ?? (initial.leakageBags ? String(initial.leakageBags) : ""));
  const [leakageWasteBags, setLeakageWasteBags] = useState(
    draft?.leakageWasteBags ?? (initial.leakageWasteBags ? String(initial.leakageWasteBags) : "")
  );
  const [expenses, setExpenses] = useState<ExpenseRow[]>(() =>
    draft ? rekeyRows(draft.expenses) : toExpenseRows(initial.expenses)
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const toSave: DraftState = {
      date,
      openingValue,
      leakageOpeningValue,
      production,
      driverSales,
      truckDeliveries,
      factoryBags,
      factoryBagsFromLeakage,
      factoryPrice,
      factoryCustomerId,
      pumpWaterAmount,
      leakageBags,
      leakageWasteBags,
      expenses,
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(toSave));
    } catch {
      // localStorage unavailable (e.g. private browsing quota) — draft persistence is a convenience, not critical
    }
  }, [
    draftKey,
    date,
    openingValue,
    leakageOpeningValue,
    production,
    driverSales,
    truckDeliveries,
    factoryBags,
    factoryBagsFromLeakage,
    factoryPrice,
    factoryCustomerId,
    pumpWaterAmount,
    leakageBags,
    leakageWasteBags,
    expenses,
  ]);

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setRestoredDraft(false);
    setDate(initial.date);
    setOpeningValue(String(initial.openingStock));
    setLeakageOpeningValue(String(leakageOpening));
    setProduction(toProductionRows(initial.production));
    setDriverSales(toDriverSaleRows(initial.driverSales, drivers[0]?.id ?? ""));
    setTruckDeliveries(toTruckDeliveryRows(initial.truckDeliveries, customers[0]?.id ?? ""));
    setFactoryBags(initial.factoryBags ? String(initial.factoryBags) : "");
    setFactoryBagsFromLeakage(initial.factoryBagsFromLeakage ? String(initial.factoryBagsFromLeakage) : "");
    setFactoryPrice(String(initial.factoryPricePerBag));
    setFactoryCustomerId(initial.factoryCustomerId ?? "");
    setPumpWaterAmount(initial.pumpWaterAmount ? String(initial.pumpWaterAmount) : "");
    setLeakageBags(initial.leakageBags ? String(initial.leakageBags) : "");
    setLeakageWasteBags(initial.leakageWasteBags ? String(initial.leakageWasteBags) : "");
    setExpenses(toExpenseRows(initial.expenses));
  }

  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const closingPreview = useMemo(() => {
    const prodTotal = production.reduce((s, p) => s + (Number(p.bags) || 0), 0);
    const driverBagsTotal = driverSales.reduce((s, d) => s + (Number(d.bags) || 0), 0);
    const driverBonusTotal = driverSales.reduce((s, d) => s + (Number(d.bonusBags) || 0), 0);
    const truckBagsTotal = truckDeliveries.reduce((s, t) => s + (Number(t.bags) || 0), 0);
    const truckBonusTotal = truckDeliveries.reduce((s, t) => s + (Number(t.bonusBags) || 0), 0);
    const factoryBagsNet = (Number(factoryBags) || 0) - (Number(factoryBagsFromLeakage) || 0);
    return (
      (Number(openingValue) || 0) +
      prodTotal -
      factoryBagsNet -
      driverBagsTotal -
      driverBonusTotal -
      truckBagsTotal -
      truckBonusTotal -
      (Number(leakageBags) || 0)
    );
  }, [production, driverSales, truckDeliveries, factoryBags, factoryBagsFromLeakage, leakageBags, openingValue]);

  const leakageOpeningNum = Number(leakageOpeningValue) || 0;
  const leakageClosingPreview =
    leakageOpeningNum +
    (Number(leakageBags) || 0) -
    (Number(factoryBagsFromLeakage) || 0) -
    (Number(leakageWasteBags) || 0);
  const loadingFeeExpenseTotal = driverSales.reduce((s, d) => {
    if (d.loadingFeeWaived) return s;
    const driver = driverById.get(d.driverId);
    const bags = Number(d.bags) || 0;
    return s + bags * (driver?.loadingFee ?? 0);
  }, 0);
  const factoryTotal = (Number(factoryBags) || 0) * (Number(factoryPrice) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      date,
      openingStockOverride: canEditOpeningStock ? Number(openingValue) || 0 : null,
      leakageOpeningOverride: canEditLeakageOpening ? leakageOpeningNum : null,
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
          loadingFeeWaived: d.loadingFeeWaived,
        })),
      truckDeliveries: truckDeliveries
        .filter((t) => (Number(t.bags) || 0) > 0 && t.customerId)
        .map((t) => ({
          customerId: t.customerId,
          bags: Number(t.bags) || 0,
          bonusBags: Number(t.bonusBags) || 0,
          ownTruck: t.ownTruck,
          fuelCost: Number(t.fuelCost) || 0,
          hiredCost: Number(t.hiredCost) || 0,
        })),
      leakageBags: Number(leakageBags) || 0,
      leakageWasteBags: Number(leakageWasteBags) || 0,
      expenses: expenses
        .filter((e) => e.description.trim().length > 0 && (Number(e.amount) || 0) > 0)
        .map((e) => ({ description: e.description.trim(), amount: Number(e.amount) || 0, paid: e.paid })),
    };
    const result = mode === "create" ? await createDailyRecord(payload) : await updateDailyRecord(recordId!, payload);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save daily record");
      return;
    }
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    onClose();
    onSaved?.();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? "New Daily Record" : `Edit Daily Record — ${initial.date}`} maxWidth={720}>
      <form onSubmit={handleSubmit}>
        {restoredDraft && (
          <div className="calc-box" style={{ marginBottom: 14, alignItems: "center" }}>
            <span>Restored your unsaved entry from before you were logged out.</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={discardDraft}>
              Start fresh
            </button>
          </div>
        )}
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
        <div className="field">
          <label>Leakage from previous day (bags){canEditLeakageOpening ? " — editable (Super Admin)" : ""}</label>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={leakageOpeningValue}
            onChange={canEditLeakageOpening ? (e) => setLeakageOpeningValue(e.target.value) : undefined}
            readOnly={!canEditLeakageOpening}
          />
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
          <label>Of these, rebagged from leakage stock (bags — available: {leakageOpeningNum})</label>
          <input
            type="number"
            min={0}
            max={leakageOpeningNum}
            placeholder="0"
            value={factoryBagsFromLeakage}
            onChange={(e) => setFactoryBagsFromLeakage(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Wasted while rebagging (bags — lost, not sellable)</label>
          <input
            type="number"
            min={0}
            max={leakageOpeningNum}
            placeholder="0"
            value={leakageWasteBags}
            onChange={(e) => setLeakageWasteBags(e.target.value)}
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
          const total = bags * (driver?.pricePerBag ?? 0);
          const loadingFeeExpense = bags * (driver?.loadingFee ?? 0);
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
              <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: -6, marginBottom: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span>
                  Instant incentive: +{bonus} bags (manual) · Total: {formatMoney(total)}
                  {driver ? ` (₦${driver.pricePerBag}/bag)` : ""}
                  {driver && driver.loadingFee > 0 && !row.loadingFeeWaived && (
                    <> · Loading fee: {formatMoney(loadingFeeExpense)} (auto-added as an expense, not part of this total)</>
                  )}
                  {driver && driver.loadingFee > 0 && row.loadingFeeWaived && <> · Loading fee: not applicable</>}
                </span>
                {driver && driver.loadingFee > 0 && (
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={row.loadingFeeWaived}
                      onChange={(e) =>
                        setDriverSales((rows) =>
                          rows.map((r) => (r.key === row.key ? { ...r, loadingFeeWaived: e.target.checked } : r))
                        )
                      }
                    />
                    Loading fee not applicable
                  </label>
                )}
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
              { key: nextKey(), driverId: drivers[0]?.id ?? "", bags: "", bonusBags: "", loadingFeeWaived: false },
            ])
          }
        >
          + Add driver sale
        </button>

        <div className="subhead">Truck deliveries (our own dispatch)</div>
        {truckDeliveries.map((row) => (
          <div key={row.key}>
            <div className="repeater-row" style={{ gridTemplateColumns: "1.1fr .7fr .8fr .9fr .8fr auto" }}>
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
                <input
                  type="number"
                  placeholder="Instant incentive"
                  min={0}
                  value={row.bonusBags}
                  onChange={(e) =>
                    setTruckDeliveries((rows) =>
                      rows.map((r) => (r.key === row.key ? { ...r, bonusBags: e.target.value } : r))
                    )
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
              const bonus = Number(row.bonusBags) || 0;
              return (
                <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: -6, marginBottom: 10 }}>
                  Revenue: {formatMoney((Number(row.bags) || 0) * price)} (₦{price}/bag
                  {truckCustomer ? ` — ${truckCustomer.name}'s price` : ""})
                  {truckCustomer && price === 0 ? " — no price set for this customer yet" : ""}
                  {bonus > 0 && <> · Instant incentive: +{bonus} bags (manual, not part of revenue)</>}
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
              {
                key: nextKey(),
                customerId: customers[0]?.id ?? "",
                bags: "",
                bonusBags: "",
                ownTruck: true,
                fuelCost: "",
                hiredCost: "",
              },
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
        <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 6 }}>
          Opening {leakageOpeningNum} + New {Number(leakageBags) || 0} − Rebagged {Number(factoryBagsFromLeakage) || 0}
          {(Number(leakageWasteBags) || 0) > 0 ? ` − Wasted ${Number(leakageWasteBags) || 0}` : ""} = Closing{" "}
          {leakageClosingPreview}
        </div>
        <div className="calc-box" style={{ marginBottom: 14 }}>
          <span>Leakage balance to carry forward</span>
          <b>{leakageClosingPreview} bags</b>
        </div>

        <div className="subhead">Expenses</div>
        {loadingFeeExpenseTotal > 0 && (
          <div className="calc-box" style={{ marginBottom: 14 }}>
            <span>Loading fees (auto-added below)</span>
            <b>{formatMoney(loadingFeeExpenseTotal)}</b>
          </div>
        )}
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
          {loading ? (mode === "create" ? "Saving…" : "Updating…") : mode === "create" ? "Save daily record" : "Update record"}
        </button>
      </form>
    </Modal>
  );
}
