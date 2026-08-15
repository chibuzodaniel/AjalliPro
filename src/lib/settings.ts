import { prisma } from "./prisma";

const SETTINGS_ID = "singleton";

export interface WeeklyIncentiveSettings {
  customerWeeklyThreshold: number;
  customerWeeklyBonus: number;
  driverWeeklyThreshold: number;
  driverWeeklyBonus: number;
}

export const DEFAULT_WEEKLY_INCENTIVE_SETTINGS: WeeklyIncentiveSettings = {
  customerWeeklyThreshold: 500,
  customerWeeklyBonus: 5,
  driverWeeklyThreshold: 1000,
  driverWeeklyBonus: 10,
};

export async function getWeeklyIncentiveSettings(): Promise<WeeklyIncentiveSettings> {
  const row = await prisma.weeklyIncentiveSetting.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return DEFAULT_WEEKLY_INCENTIVE_SETTINGS;
  return {
    customerWeeklyThreshold: row.customerWeeklyThreshold,
    customerWeeklyBonus: row.customerWeeklyBonus,
    driverWeeklyThreshold: row.driverWeeklyThreshold,
    driverWeeklyBonus: row.driverWeeklyBonus,
  };
}

export async function saveWeeklyIncentiveSettings(input: WeeklyIncentiveSettings): Promise<void> {
  await prisma.weeklyIncentiveSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...input },
    update: input,
  });
}
