import { z } from "zod";

export const packerPricingSchema = z.object({
  pricePerBag: z.number().int().min(0),
});

export type PackerPricingInput = z.infer<typeof packerPricingSchema>;
