import { getApprovedRecordsSorted } from "./records";

export async function latestClosingStock(): Promise<number> {
  const approved = await getApprovedRecordsSorted();
  return approved.length ? approved[approved.length - 1].closingStock : 0;
}

export function computeClosingStock(
  opening: number,
  prodTotal: number,
  factoryBags: number,
  driverBagsTotal: number,
  leakageBags: number
): number {
  return opening + prodTotal - factoryBags - driverBagsTotal - leakageBags;
}
