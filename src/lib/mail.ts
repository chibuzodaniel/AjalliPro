import sgMail from "@sendgrid/mail";

let initialized = false;

export function isSendGridConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);
}

function ensureInitialized() {
  if (initialized) return;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error("SENDGRID_API_KEY is not configured");
  sgMail.setApiKey(key);
  initialized = true;
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
}

export async function sendWeeklyCustomerEmail(payload: WeeklyCustomerMailPayload): Promise<void> {
  ensureInitialized();
  const from = process.env.SENDGRID_FROM_EMAIL;
  if (!from) throw new Error("SENDGRID_FROM_EMAIL is not configured");

  const bonusLine = payload.qualifies
    ? `<p style="color:#3FDE9A;font-weight:700;">🎉 You've qualified for +${payload.bonus} bonus bags this week!</p>`
    : `<p style="color:#6F6693;">You're ${Math.max(0, payload.threshold - payload.weeklyBags)} bags away from this week's +${payload.bonus}-bag bonus.</p>`;

  await sgMail.send({
    to: payload.to,
    from,
    subject: `Your Ajalli Table Water summary — week ${payload.weekKey}`,
    html: `
      <div style="font-family:sans-serif;color:#1a1a1a;">
        <p>Hi ${payload.customerName},</p>
        <p>Here's your purchase summary for this week:</p>
        <ul>
          <li>This week: <b>${payload.weeklyBags} bags</b></li>
          <li>Year to date: <b>${payload.yearlyBags} bags</b></li>
        </ul>
        ${bonusLine}
        <p>Thank you for your business.<br/>Cusica International — Ajalli Table Water</p>
      </div>
    `,
  });
}
