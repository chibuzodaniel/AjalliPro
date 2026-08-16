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
  leakageBagsNew: number;
}

/**
 * factoryBagsFromLeakage is excluded here — those bags already left "good"
 * stock the day they leaked, so subtracting them again here would double-count
 * the loss. Bonus bags handed out as an instant driver/customer incentive
 * still leave the warehouse, so they count the same as a regular sale for
 * stock purposes.
 */
export function computeClosingStock(input: ClosingStockInput): number {
  return (
    input.opening +
    input.prodTotal -
    (input.factoryBags - input.factoryBagsFromLeakage) -
    input.driverBagsTotal -
    input.driverBonusBagsTotal -
    input.truckDeliveryBagsTotal -
    input.truckDeliveryBonusBagsTotal -
    input.leakageBagsNew
  );
}

export function computeLeakageClosing(
  leakageOpening: number,
  leakageBagsNew: number,
  factoryBagsFromLeakage: number
): number {
  return leakageOpening + leakageBagsNew - factoryBagsFromLeakage;
}
