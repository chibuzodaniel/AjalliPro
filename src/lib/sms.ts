import { timeOfDayGreeting } from "./greeting";
import { formatMoney } from "./money";

const BULKSMS_API_URL = "https://www.bulksmsnigeria.com/api/v2/sms";

export function isSmsConfigured(): boolean {
  return Boolean(process.env.BULKSMSNIGERIA_API_TOKEN && process.env.BULKSMSNIGERIA_SENDER_ID);
}

/**
 * Numbers are stored however staff typed them on the Customer form (often
 * local format, e.g. "08012345678"). BulkSMSNigeria expects international
 * format with no leading "+" (e.g. "2348012345678"). Returns null if the
 * number doesn't look like a valid Nigerian mobile number.
 */
function normalizeNigerianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("234")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `234${digits.slice(1)}`;
  if (digits.length === 10) return `234${digits}`;
  return null;
}

/** Low-level send — one free-text message to one Nigerian phone number. */
export async function sendSms(to: string, body: string): Promise<void> {
  const token = process.env.BULKSMSNIGERIA_API_TOKEN;
  const senderId = process.env.BULKSMSNIGERIA_SENDER_ID;
  if (!token || !senderId) throw new Error("BulkSMSNigeria is not configured");

  const normalizedTo = normalizeNigerianPhone(to);
  if (!normalizedTo) throw new Error(`"${to}" doesn't look like a valid Nigerian phone number`);

  const res = await fetch(BULKSMS_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ from: senderId, to: normalizedTo, body }),
  });

  const rawText = await res.text();
  let data: { status?: string; message?: string } | null = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    // non-JSON response — fall through, rawText is used in the error below
  }

  if (!res.ok || (data?.status && data.status !== "success")) {
    throw new Error(`BulkSMSNigeria request failed (${res.status}): ${data?.message ?? rawText.slice(0, 300)}`);
  }
}

export interface WeeklyCustomerSmsPayload {
  to: string;
  customerName: string;
  weeklyBags: number;
  yearlyBags: number;
  qualifies: boolean;
  threshold: number;
  bonus: number;
}

export async function sendWeeklyCustomerSms(payload: WeeklyCustomerSmsPayload): Promise<void> {
  const bonusLine = payload.qualifies
    ? `You've qualified for +${payload.bonus} bonus bags this week!`
    : `${Math.max(0, payload.threshold - payload.weeklyBags)} bags away from this week's +${payload.bonus}-bag bonus.`;
  const body = `${timeOfDayGreeting()} ${payload.customerName}, this week: ${payload.weeklyBags} bags. YTD: ${payload.yearlyBags} bags. ${bonusLine} - Cusica Intl`;
  await sendSms(payload.to, body);
}

export interface PackerOwingSmsPayload {
  to: string;
  packerName: string;
  owing: number;
}

export async function sendPackerOwingSms(payload: PackerOwingSmsPayload): Promise<void> {
  const body = `${timeOfDayGreeting()} ${payload.packerName}, you're currently owed ${formatMoney(payload.owing)} for packing at Ajalli Table Water. Thank you for your hard work! - Cusica Intl`;
  await sendSms(payload.to, body);
}

export interface PackerPaidSmsPayload {
  to: string;
  packerName: string;
  amount: number;
}

export async function sendPackerPaidSms(payload: PackerPaidSmsPayload): Promise<void> {
  const body = `${timeOfDayGreeting()} ${payload.packerName}, you've been paid ${formatMoney(payload.amount)} for packing at Ajalli Table Water. Thank you for your hard work! - Cusica Intl`;
  await sendSms(payload.to, body);
}
