import type { DailyRecordFull } from "./records";
import { recordExpenseTotal } from "./records";

export interface RevenueSummary {
  gross: number;
  pumpWaterTotal: number;
  sachetTotal: number; // factory + driver + truck deliveries combined
  expenses: number;
  net: number;
}

export function computeRevenue(records: DailyRecordFull[]): RevenueSummary {
  let pumpWaterTotal = 0;
  let sachetTotal = 0;
  let exp = 0;
  for (const r of records) {
    sachetTotal += r.factoryBags * r.factoryPricePerBag;
    pumpWaterTotal += r.pumpWaterAmount;
    for (const d of r.driverSales) {
      sachetTotal += d.bags * d.pricePerBag;
    }
    for (const t of r.truckDeliveries) {
      sachetTotal += t.bags * t.pricePerBag;
    }
    // Truck fuel/hired cost is now its own "Truck fuel — X" / "Hired truck — X"
    // expense line (see buildTruckCostExpenses), so it's already counted via
    // recordExpenseTotal below — adding it again here would double-count it.
    exp += recordExpenseTotal(r);
  }
  const rev = pumpWaterTotal + sachetTotal;
  return { gross: rev, pumpWaterTotal, sachetTotal, expenses: exp, net: rev - exp };
}
