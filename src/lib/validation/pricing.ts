import { z } from "zod";

export const pricingSettingsSchema = z.object({
  factoryPricePerBag: z.number().int().min(0),
});

export type PricingSettingsInput = z.infer<typeof pricingSettingsSchema>;

export const packerPriceSettingSchema = z.object({
  packerPricePerBag: z.number().int().min(0),
});

export type PackerPriceSettingInput = z.infer<typeof packerPriceSettingSchema>;

export const truckFeeSettingsSchema = z.object({
  truckLoadingFeePerBag: z.number().int().min(0),
  truckOffloadingFeePerBag: z.number().int().min(0),
  truckHiredCostPerBag: z.number().int().min(0),
});

export type TruckFeeSettingsInput = z.infer<typeof truckFeeSettingsSchema>;
