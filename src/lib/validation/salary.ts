import { z } from "zod";

export const staffSalarySettingsSchema = z.object({
  salaryAmount: z.number().int().min(0),
  phone: z.string().trim().max(20).optional(),
});

export type StaffSalarySettingsInput = z.infer<typeof staffSalarySettingsSchema>;
