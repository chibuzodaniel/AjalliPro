import { z } from "zod";

export const staffSalarySettingsSchema = z.object({
  salaryAmount: z.number().int().min(0),
  phone: z.string().trim().max(20).optional(),
});

export type StaffSalarySettingsInput = z.infer<typeof staffSalarySettingsSchema>;

export const staffSmsSchema = z.object({
  message: z.string().trim().min(1, "Enter a message").max(1000, "Message is too long (max 1000 characters)"),
});

export type StaffSmsInput = z.infer<typeof staffSmsSchema>;
