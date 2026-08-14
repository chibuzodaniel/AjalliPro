import { z } from "zod";

export const incentiveTierSchema = z.object({
  min: z.number().int().min(0),
  max: z.number().int().min(0),
  bonus: z.number().int().min(0),
});

export const incentiveTiersSchema = z.array(incentiveTierSchema).min(1);

export type IncentiveTierInput = z.infer<typeof incentiveTierSchema>;
