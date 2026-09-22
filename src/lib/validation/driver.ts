import { z } from "zod";

export const driverSchema = z.object({
  name: z.string().trim().min(1, "Driver name is required"),
  phone: z.string().trim().optional(),
  pricePerBag: z.number().int().min(1, "Price per bag is required"),
  loadingFee: z.number().int().min(0),
});

export type DriverInput = z.infer<typeof driverSchema>;

export const driverPricingSchema = z.object({
  pricePerBag: z.number().int().min(0),
  loadingFee: z.number().int().min(0),
});

export type DriverPricingInput = z.infer<typeof driverPricingSchema>;

export const driverDetailsSchema = z.object({
  name: z.string().trim().min(1, "Driver name is required"),
  phone: z.string().trim().optional(),
});

export type DriverDetailsInput = z.infer<typeof driverDetailsSchema>;

export const driverSmsSchema = z.object({
  message: z.string().trim().min(1, "Enter a message").max(1000, "Message is too long (max 1000 characters)"),
});

export type DriverSmsInput = z.infer<typeof driverSmsSchema>;
