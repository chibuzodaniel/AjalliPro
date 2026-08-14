import type { DailyRecordFull } from "./records";

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
      rev += d.bags * d.pricePerBag + d.loadingFee;
    }
    exp += r.expenseRolls + r.expensePackingBags + r.expenseGas + r.expenseOther;
  }
  return { gross: rev, expenses: exp, net: rev - exp };
}
