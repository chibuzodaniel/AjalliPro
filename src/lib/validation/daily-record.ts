import { z } from "zod";

export const productionLineSchema = z.object({
  packerName: z.string().trim().min(1),
  bags: z.number().int().min(0),
});

export const driverSaleSchema = z.object({
  driverId: z.string().min(1),
  bags: z.number().int().min(0),
  pricePerBag: z.number().int().min(0),
  loadingFee: z.number().int().min(0),
  customerId: z.string().min(1).nullable().optional(),
});

export const expenseItemSchema = z.object({
  description: z.string().trim().min(1),
  amount: z.number().int().min(0),
  paid: z.boolean(),
});

export const dailyRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  openingStockOverride: z.number().int().min(0).nullable().optional(),
  production: z.array(productionLineSchema),
  factoryBags: z.number().int().min(0),
  factoryPricePerBag: z.number().int().min(0),
  factoryCustomerId: z.string().min(1).nullable().optional(),
  pumpWaterAmount: z.number().int().min(0),
  driverSales: z.array(driverSaleSchema),
  leakageBags: z.number().int().min(0),
  expenses: z.array(expenseItemSchema),
});

export type DailyRecordInput = z.infer<typeof dailyRecordSchema>;
