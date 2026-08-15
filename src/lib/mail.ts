import { BrevoClient } from "@getbrevo/brevo";
import type { EmailTemplateSettings } from "./settings";

let client: BrevoClient | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL);
}

function getClient(): BrevoClient {
  if (client) return client;
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not configured");
  client = new BrevoClient({ apiKey });
  return client;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

export interface WeeklyCustomerMailPayload {
  to: string;
  customerName: string;
  weeklyBags: number;
  yearlyBags: number;
  qualifies: boolean;
  threshold: number;
  bonus: number;
  weekKey: string;
  template: EmailTemplateSettings;
}

export async function sendWeeklyCustomerEmail(payload: WeeklyCustomerMailPayload): Promise<void> {
  const brevo = getClient();
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  if (!fromEmail) throw new Error("BREVO_FROM_EMAIL is not configured");
  const fromName = process.env.BREVO_FROM_NAME || "Cusica International";

  const subject = payload.template.subject.replace(/\{\{\s*week\s*\}\}/gi, payload.weekKey);

  const bonusLine = payload.qualifies
    ? `<p style="color:#3FDE9A;font-weight:700;">🎉 You've qualified for +${payload.bonus} bonus bags this week!</p>`
    : `<p style="color:#6F6693;">You're ${Math.max(0, payload.threshold - payload.weeklyBags)} bags away from this week's +${payload.bonus}-bag bonus.</p>`;

  await brevo.transactionalEmails.sendTransacEmail({
    sender: { email: fromEmail, name: fromName },
    to: [{ email: payload.to, name: payload.customerName }],
    subject,
    htmlContent: `
      <div style="font-family:sans-serif;color:#1a1a1a;">
        <p>Hi ${escapeHtml(payload.customerName)},</p>
        <p>${textToHtml(payload.template.introText)}</p>
        <ul>
          <li>This week: <b>${payload.weeklyBags} bags</b></li>
          <li>Year to date: <b>${payload.yearlyBags} bags</b></li>
        </ul>
        ${bonusLine}
        <p>${textToHtml(payload.template.signatureText)}</p>
      </div>
    `,
  });
}
