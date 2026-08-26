import type { DailyRecordFull } from "./records";
import { recordExpenseTotal } from "./records";

export interface RevenueSummary {
  gross: number;
  expenses: number;
  net: number;
}

export function computeRevenue(records: DailyRecordFull[]): RevenueSummary {
  let rev = 0;
  let exp = 0;
  for (const r of records) {
    rev += r.factoryBags * r.factoryPricePerBag;
    rev += r.pumpWaterAmount;
    for (const d of r.driverSales) {
      rev += d.bags * d.pricePerBag;
    }
    for (const t of r.truckDeliveries) {
      rev += t.bags * t.pricePerBag;
    }
    // Truck fuel/hired cost is now its own "Truck fuel — X" / "Hired truck — X"
    // expense line (see buildTruckCostExpenses), so it's already counted via
    // recordExpenseTotal below — adding it again here would double-count it.
    exp += recordExpenseTotal(r);
  }
  return { gross: rev, expenses: exp, net: rev - exp };
}
