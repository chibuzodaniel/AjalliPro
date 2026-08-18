"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";
import { roleLabel } from "@/lib/roles";
import type { DailyRecordFull } from "@/lib/records";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          color: "var(--text-faint)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: ".04em",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
      <span>{left}</span>
      <b>{right}</b>
    </div>
  );
}

export default function PendingRecordDetail({ record }: { record: DailyRecordFull }) {
  const [open, setOpen] = useState(false);
  const prodTotal = record.productionLines.reduce((s, p) => s + p.bags, 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: "none",
          color: "var(--accent)",
          cursor: "pointer",
          padding: 0,
          font: "inherit",
          textDecoration: "underline",
        }}
      >
        {record.date}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Daily Record — ${record.date}`} maxWidth={640}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 13.5 }}>
          <Section title="Submitted by">
            <div>
              {record.createdBy.name}
              {roleLabel(record.createdByRole) ? ` (${roleLabel(record.createdByRole)})` : ""}
            </div>
          </Section>

          <div className="calc-box">
            <span>Opening stock</span>
            <b>{record.openingStock} bags</b>
          </div>

          <Section title={`Production — ${prodTotal} bags`}>
            {record.productionLines.length === 0 ? (
              <div className="empty">None logged</div>
            ) : (
              record.productionLines.map((p) => <Row key={p.id} left={p.packerName} right={`${p.bags} bags`} />)
            )}
          </Section>

          <Section title="Factory sales (walk-in)">
            <Row
              left={`${record.factoryBags} bags @ ${formatMoney(record.factoryPricePerBag)}${
                record.factoryBagsFromLeakage > 0 ? ` (${record.factoryBagsFromLeakage} rebagged)` : ""
              }${record.factoryCustomer ? ` — ${record.factoryCustomer.name}` : ""}`}
              right={formatMoney(record.factoryBags * record.factoryPricePerBag)}
            />
          </Section>

          <Section title="Driver sales">
            {record.driverSales.length === 0 ? (
              <div className="empty">None</div>
            ) : (
              record.driverSales.map((d) => (
                <Row
                  key={d.id}
                  left={`${d.driver.name}${d.customer ? ` → ${d.customer.name}` : ""}`}
                  right={`${d.bags} bags${d.bonusBags > 0 ? ` +${d.bonusBags} bonus` : ""}`}
                />
              ))
            )}
          </Section>

          <Section title="Truck deliveries (own dispatch)">
            {record.truckDeliveries.length === 0 ? (
              <div className="empty">None</div>
            ) : (
              record.truckDeliveries.map((t) => (
                <div key={t.id} style={{ padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{t.customer?.name ?? "Unknown customer"}</span>
                    <b>
                      {t.bags} bags{t.bonusBags > 0 ? ` +${t.bonusBags} bonus` : ""}
                    </b>
                  </div>
                  <div style={{ color: "var(--text-dim)", fontSize: 12 }}>
                    {t.ownTruck ? `Own truck — fuel ${formatMoney(t.fuelCost)}` : `Hired truck — ${formatMoney(t.hiredCost)}`}
                  </div>
                </div>
              ))
            )}
          </Section>

          <div className="calc-box">
            <span>Pump water sales</span>
            <b>{formatMoney(record.pumpWaterAmount)}</b>
          </div>

          <Section title="Leakages">
            <div>
              Opening {record.leakageOpening} + New {record.leakageBags} − Rebagged {record.factoryBagsFromLeakage}
              {record.leakageWasteBags > 0 ? ` − Wasted ${record.leakageWasteBags}` : ""} = Closing{" "}
              {record.leakageClosing}
            </div>
          </Section>

          <Section title="Expenses">
            {record.expenseItems.length === 0 ? (
              <div className="empty">None</div>
            ) : (
              record.expenseItems.map((e) => (
                <Row key={e.id} left={`${e.description}${e.paid ? "" : " (unpaid)"}`} right={formatMoney(e.amount)} />
              ))
            )}
          </Section>

          <div className="calc-box">
            <span>Closing stock</span>
            <b>{record.closingStock} bags</b>
          </div>
        </div>
      </Modal>
    </>
  );
}
