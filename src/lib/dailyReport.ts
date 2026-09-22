import type { DailyRecordFull } from "./records";
import {
  recordProdTotal,
  recordDriverBagsTotal,
  recordTruckDeliveryBagsTotal,
  recordExpenseTotal,
  recordPackerPayTotal,
} from "./records";
import { computeRevenue } from "./revenue";
import { formatMoney } from "./money";

/** Cap so one unusually busy day can't blow up SMS cost/segment count. */
const MAX_LENGTH = 3000;

/**
 * Full day report, in the same shape as the Reports page's per-record detail
 * row but with every line item spelled out — sent by SMS the moment the
 * record is approved (see approvals/actions.ts).
 */
export function buildDailyReportSmsText(r: DailyRecordFull): string {
  const lines: string[] = [];
  lines.push(`Daily Report — ${r.date}`);
  lines.push("");
  lines.push(`Produced: ${recordProdTotal(r)} bags`);
  lines.push(`Opening stock: ${r.openingStock} | Closing stock: ${r.closingStock}`);

  if (r.productionLines.length > 0) {
    lines.push("");
    lines.push(`Packer pay (${formatMoney(recordPackerPayTotal(r))}):`);
    for (const p of r.productionLines) {
      lines.push(`- ${p.packer.name}: ${p.bags} @ ${formatMoney(p.pricePerBag)} = ${formatMoney(p.bags * p.pricePerBag)}`);
    }
  }

  if (r.factoryBags > 0) {
    const suffix = r.factoryBagsFromLeakage > 0 ? ` (${r.factoryBagsFromLeakage} rebagged)` : "";
    lines.push(
      `Factory sales: ${r.factoryBags} @ ${formatMoney(r.factoryPricePerBag)}${suffix} = ${formatMoney(r.factoryBags * r.factoryPricePerBag)}`
    );
  }

  if (r.driverSales.length > 0) {
    lines.push("");
    lines.push(`Driver sales (${recordDriverBagsTotal(r)} bags):`);
    for (const d of r.driverSales) {
      const who = d.customer ? `${d.driver.name} -> ${d.customer.name}` : d.driver.name;
      const bonus = d.bonusBags > 0 ? ` +${d.bonusBags} bonus` : "";
      lines.push(`- ${who}: ${d.bags} @ ${formatMoney(d.pricePerBag)} = ${formatMoney(d.bags * d.pricePerBag)}${bonus}`);
    }
  }

  if (r.truckDeliveries.length > 0) {
    lines.push("");
    lines.push(`Truck deliveries (${recordTruckDeliveryBagsTotal(r)} bags):`);
    for (const t of r.truckDeliveries) {
      const who = t.customer?.name ?? "Unknown customer";
      const bonus = t.bonusBags > 0 ? ` +${t.bonusBags} bonus` : "";
      lines.push(`- ${who}: ${t.bags} @ ${formatMoney(t.pricePerBag)} = ${formatMoney(t.bags * t.pricePerBag)}${bonus}`);
    }
  }

  if (r.pumpWaterAmount > 0) {
    lines.push("");
    lines.push(`Pump water: ${formatMoney(r.pumpWaterAmount)}`);
  }

  if (r.leakageBags > 0 || r.leakageWasteBags > 0) {
    lines.push("");
    lines.push(`Leakages: +${r.leakageBags} bags, waste ${r.leakageWasteBags} — pile now ${r.leakageClosing}`);
  }

  if (r.expenseItems.length > 0) {
    lines.push("");
    lines.push(`Expenses (${formatMoney(recordExpenseTotal(r))}):`);
    for (const e of r.expenseItems) {
      const suffix = e.paid ? "" : e.amountPaid > 0 ? " (partially paid)" : " (unpaid)";
      lines.push(`- ${e.description}: ${formatMoney(e.amount)}${suffix}`);
    }
  }

  const revenue = computeRevenue([r]);
  lines.push("");
  lines.push(`Net revenue: ${formatMoney(revenue.net)}`);
  lines.push("");
  lines.push("— Cusica International — Ajalli Table Water");

  const text = lines.join("\n");
  return text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH - 15) + "\n…(truncated)" : text;
}
