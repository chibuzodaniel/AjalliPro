import { z } from "zod";

export const driverSchema = z.object({
  name: z.string().trim().min(1, "Driver name is required"),
  phone: z.string().trim().optional(),
  pricePerBag: z.number().int().min(0),
});

export type DriverInput = z.infer<typeof driverSchema>;
