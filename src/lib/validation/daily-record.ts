import { z } from "zod";

export const productionLineSchema = z.object({
  packerName: z.string().trim().min(1),
  bags: z.number().int().min(0),
  paid: z.boolean().default(false),
});

export const driverSaleSchema = z.object({
  driverId: z.string().min(1),
  bags: z.number().int().min(0),
  bonusBags: z.number().int().min(0),
  loadingFeeWaived: z.boolean(),
});

export const truckDeliverySchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  bags: z.number().int().min(0),
  bonusBags: z.number().int().min(0),
  ownTruck: z.boolean(),
  fuelCost: z.number().int().min(0),
  hiredCost: z.number().int().min(0),
  loadingFeeWaived: z.boolean().default(false),
  offloadingFeeWaived: z.boolean().default(false),
});

export const expenseItemSchema = z.object({
  description: z.string().trim().min(1),
  amount: z.number().int().min(0),
  paid: z.boolean(),
});

export const dailyRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  openingStockOverride: z.number().int().min(0).nullable().optional(),
  leakageOpeningOverride: z.number().int().min(0).nullable().optional(),
  production: z.array(productionLineSchema),
  factoryBags: z.number().int().min(0),
  factoryBagsFromLeakage: z.number().int().min(0),
  factoryPricePerBag: z.number().int().min(0),
  factoryCustomerId: z.string().min(1).nullable().optional(),
  pumpWaterAmount: z.number().int().min(0),
  driverSales: z.array(driverSaleSchema),
  truckDeliveries: z.array(truckDeliverySchema),
  leakageBags: z.number().int().min(0),
  leakageWasteBags: z.number().int().min(0),
  expenses: z.array(expenseItemSchema),
});

export type DailyRecordInput = z.infer<typeof dailyRecordSchema>;

export const dailyRecordEditSchema = dailyRecordSchema;

export type DailyRecordEditInput = z.infer<typeof dailyRecordEditSchema>;
