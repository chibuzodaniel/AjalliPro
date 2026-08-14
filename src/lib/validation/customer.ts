import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
