import { z } from "zod";

export const weeklyIncentiveSettingsSchema = z.object({
  customerWeeklyThreshold: z.number().int().min(1),
  customerWeeklyBonus: z.number().int().min(0),
  driverWeeklyThreshold: z.number().int().min(1),
  driverWeeklyBonus: z.number().int().min(0),
});

export type WeeklyIncentiveSettingsInput = z.infer<typeof weeklyIncentiveSettingsSchema>;
