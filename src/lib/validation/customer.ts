import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  email: z.email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  pricePerBag: z.number().int().min(1, "Price per bag is required"),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const customerPricingSchema = z.object({
  pricePerBag: z.number().int().min(0),
});

export type CustomerPricingInput = z.infer<typeof customerPricingSchema>;
