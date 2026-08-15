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

export interface EmailTemplateSettings {
  subject: string;
  introText: string;
  signatureText: string;
}

export const DEFAULT_EMAIL_TEMPLATE_SETTINGS: EmailTemplateSettings = {
  subject: "Your Ajalli Table Water summary — week {{week}}",
  introText: "Here's your purchase summary for this week:",
  signatureText: "Thank you for your business.\nCusica International — Ajalli Table Water",
};

export async function getEmailTemplateSettings(): Promise<EmailTemplateSettings> {
  const row = await prisma.emailTemplateSetting.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return DEFAULT_EMAIL_TEMPLATE_SETTINGS;
  return {
    subject: row.subject,
    introText: row.introText,
    signatureText: row.signatureText,
  };
}

export async function saveEmailTemplateSettings(input: EmailTemplateSettings): Promise<void> {
  await prisma.emailTemplateSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...input },
    update: input,
  });
}

export interface PricingSettings {
  factoryPricePerBag: number;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  factoryPricePerBag: 0,
};

export async function getPricingSettings(): Promise<PricingSettings> {
  const row = await prisma.pricingSetting.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return DEFAULT_PRICING_SETTINGS;
  return { factoryPricePerBag: row.factoryPricePerBag };
}

export async function savePricingSettings(input: PricingSettings): Promise<void> {
  await prisma.pricingSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...input },
    update: input,
  });
}
