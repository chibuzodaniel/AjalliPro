import { z } from "zod";

export const pricingSettingsSchema = z.object({
  factoryPricePerBag: z.number().int().min(0),
});

export type PricingSettingsInput = z.infer<typeof pricingSettingsSchema>;
