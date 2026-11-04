import { getApprovedRecordsSorted } from "./records";

export async function latestClosingStock(): Promise<number> {
  const approved = await getApprovedRecordsSorted();
  return approved.length ? approved[approved.length - 1].closingStock : 0;
}

export async function latestLeakageClosing(): Promise<number> {
  const approved = await getApprovedRecordsSorted();
  return approved.length ? approved[approved.length - 1].leakageClosing : 0;
}

export interface ClosingStockInput {
  opening: number;
  prodTotal: number;
  factoryBags: number;
  factoryBagsFromLeakage: number;
  driverBagsTotal: number;
  driverBonusBagsTotal: number;
  truckDeliveryBagsTotal: number;
  truckDeliveryBonusBagsTotal: number;
  /** Subset of driverBagsTotal + truckDeliveryBagsTotal rebagged from the leakage pile rather than fresh stock. */
  driverTruckBagsFromLeakage: number;
  leakageBagsNew: number;
  /** Approved weekly-incentive bonus bags deducted on this day — see IncentiveAward. Defaults to 0 for callers that don't track it. */
  incentiveBonusBags?: number;
}

/**
 * factoryBagsFromLeakage/driverTruckBagsFromLeakage are excluded here —
 * those bags already left "good" stock the day they leaked, so subtracting
 * them again here would double-count the loss. Bonus bags handed out as an
 * instant driver/customer incentive still leave the warehouse, so they count
 * the same as a regular sale for stock purposes. Weekly-threshold incentive
 * bags (incentiveBonusBags) leave the warehouse the same way, just approved
 * and deducted separately — see approveIncentiveAward.
 */
export function computeClosingStock(input: ClosingStockInput): number {
  return (
    input.opening +
    input.prodTotal -
    (input.factoryBags - input.factoryBagsFromLeakage) -
    (input.driverBagsTotal + input.truckDeliveryBagsTotal - input.driverTruckBagsFromLeakage) -
    input.driverBonusBagsTotal -
    input.truckDeliveryBonusBagsTotal -
    input.leakageBagsNew -
    (input.incentiveBonusBags ?? 0)
  );
}

export function computeLeakageClosing(
  leakageOpening: number,
  leakageBagsNew: number,
  factoryBagsFromLeakage: number,
  driverTruckBagsFromLeakage: number,
  leakageWasteBags: number
): number {
  return leakageOpening + leakageBagsNew - factoryBagsFromLeakage - driverTruckBagsFromLeakage - leakageWasteBags;
}
