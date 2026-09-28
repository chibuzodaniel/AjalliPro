import type { DailyRecordFull } from "./records";
import { recordProdTotal, recordTotalCosts } from "./records";
import { computeRevenue } from "./revenue";
import { formatMoney } from "./money";

/**
 * Short daily summary — sent by SMS the moment the record is approved (see
 * approvals/actions.ts). Deliberately just these seven lines, not an
 * itemized breakdown (see the Reports page or the Daily Record detail view
 * for that).
 */
export function buildDailyReportSmsText(r: DailyRecordFull): string {
  const factorySale = r.factoryBags * r.factoryPricePerBag;
  const driverSalesTotal = r.driverSales.reduce((s, d) => s + d.bags * d.pricePerBag, 0);
  const truckDeliveriesTotal = r.truckDeliveries.reduce((s, t) => s + t.bags * t.pricePerBag, 0);
  const totalExpenses = recordTotalCosts(r);
  const totalIncome = computeRevenue([r]).net;

  const lines = [
    `Daily Report — ${r.date}`,
    "",
    `Produced: ${recordProdTotal(r)} bags`,
    `Factory sale: ${formatMoney(factorySale)}`,
    `Total Drivers sales: ${formatMoney(driverSalesTotal)}`,
    `Total Deliveries: ${formatMoney(truckDeliveriesTotal)}`,
    `Pump water: ${formatMoney(r.pumpWaterAmount)}`,
    `Total expenses: ${formatMoney(totalExpenses)}`,
    `Total income for the day: ${formatMoney(totalIncome)}`,
    "",
    "— Cusica International — Ajalli Table Water",
  ];

  return lines.join("\n");
}
