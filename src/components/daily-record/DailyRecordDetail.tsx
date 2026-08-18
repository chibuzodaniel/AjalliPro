"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Pill from "@/components/ui/Pill";
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

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function printDailyRecordPdf(record: DailyRecordFull) {
  const prodTotal = record.productionLines.reduce((s, p) => s + p.bags, 0);

  const productionRows = record.productionLines.length
    ? record.productionLines.map((p) => `<tr><td>${esc(p.packer.name)}</td><td class="num">${p.bags} bags</td></tr>`).join("")
    : `<tr><td colspan="2" class="empty">None logged</td></tr>`;

  const driverRows = record.driverSales.length
    ? record.driverSales
        .map(
          (d) =>
            `<tr><td>${esc(d.driver.name)}${d.customer ? ` → ${esc(d.customer.name)}` : ""}${
              d.loadingFeeWaived ? `<div class="sub">Loading fee: not applicable</div>` : ""
            }</td><td class="num">${d.bags} bags${d.bonusBags > 0 ? ` +${d.bonusBags} bonus` : ""}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="2" class="empty">None</td></tr>`;

  const truckRows = record.truckDeliveries.length
    ? record.truckDeliveries
        .map(
          (t) =>
            `<tr><td>${esc(t.customer?.name ?? "Unknown customer")}<div class="sub">${
              t.ownTruck ? `Own truck — fuel ${formatMoney(t.fuelCost)}` : `Hired truck — ${formatMoney(t.hiredCost)}`
            }</div></td><td class="num">${t.bags} bags${t.bonusBags > 0 ? ` +${t.bonusBags} bonus` : ""}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="2" class="empty">None</td></tr>`;

  const expenseRows = record.expenseItems.length
    ? record.expenseItems
        .map(
          (e) =>
            `<tr><td>${esc(e.description)}${e.paid ? "" : " (unpaid)"}</td><td class="num">${formatMoney(e.amount)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="2" class="empty">None</td></tr>`;

  const submittedBy = `${esc(record.createdBy.name)}${
    roleLabel(record.createdByRole) ? ` (${esc(roleLabel(record.createdByRole))})` : ""
  }`;
  const statusLine = `${record.status}${record.approvedBy ? ` by ${esc(record.approvedBy.name)}` : ""}`;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Daily Record — ${esc(record.date)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; color: #111; margin: 28px; font-size: 13px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub-heading { color: #555; font-size: 12px; margin-bottom: 20px; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #555; margin: 18px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  td { padding: 5px 4px; border-bottom: 1px solid #ddd; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; font-weight: 600; }
  td.empty { color: #999; font-style: italic; }
  .sub { color: #777; font-size: 11px; margin-top: 2px; }
  .totals { display: flex; justify-content: space-between; padding: 8px 10px; background: #f3f3f3; border-radius: 6px; margin: 6px 0 4px; font-weight: 700; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <h1>Cusica International — Ajalli Table Water</h1>
  <div class="sub-heading">Daily Record — ${esc(record.date)} · Submitted by ${submittedBy} · Status: ${esc(statusLine)}</div>

  <div class="totals"><span>Opening stock</span><span>${record.openingStock} bags</span></div>

  <h2>Production — ${prodTotal} bags</h2>
  <table><tbody>${productionRows}</tbody></table>

  <h2>Factory sales (walk-in)</h2>
  <table><tbody>
    <tr><td>${record.factoryBags} bags @ ${formatMoney(record.factoryPricePerBag)}${
      record.factoryBagsFromLeakage > 0 ? ` (${record.factoryBagsFromLeakage} rebagged)` : ""
    }${record.factoryCustomer ? ` — ${esc(record.factoryCustomer.name)}` : ""}</td><td class="num">${formatMoney(
      record.factoryBags * record.factoryPricePerBag
    )}</td></tr>
  </tbody></table>

  <h2>Driver sales</h2>
  <table><tbody>${driverRows}</tbody></table>

  <h2>Truck deliveries (own dispatch)</h2>
  <table><tbody>${truckRows}</tbody></table>

  <div class="totals"><span>Pump water sales</span><span>${formatMoney(record.pumpWaterAmount)}</span></div>

  <div class="totals"><span>Leakage balance carried forward</span><span>${record.leakageClosing} bags</span></div>

  <h2>Expenses</h2>
  <table><tbody>${expenseRows}</tbody></table>

  <div class="totals"><span>Closing stock</span><span>${record.closingStock} bags</span></div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=850,height=1000");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    win.focus();
    win.print();
  };
  win.onload = triggerPrint;
  // Fallback in case onload doesn't fire (already-loaded blank document in some browsers).
  setTimeout(triggerPrint, 300);
}

export default function DailyRecordDetail({ record }: { record: DailyRecordFull }) {
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
          <button
            type="button"
            className="btn btn-ghost no-print"
            style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: 12.5 }}
            onClick={() => printDailyRecordPdf(record)}
          >
            🖨️ Print / Save as PDF
          </button>

          <Section title="Status">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Pill status={record.status}>{record.status.toLowerCase()}</Pill>
              {record.approvedBy && <span style={{ color: "var(--text-dim)" }}>by {record.approvedBy.name}</span>}
            </div>
          </Section>

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
              record.productionLines.map((p) => <Row key={p.id} left={p.packer.name} right={`${p.bags} bags`} />)
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
                  left={`${d.driver.name}${d.customer ? ` → ${d.customer.name}` : ""}${
                    d.loadingFeeWaived ? " · loading fee N/A" : ""
                  }`}
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

          <div className="calc-box">
            <span>Leakage balance carried forward</span>
            <b>{record.leakageClosing} bags</b>
          </div>

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
