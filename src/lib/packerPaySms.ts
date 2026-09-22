import { prisma } from "./prisma";
import { isSmsConfigured, sendPackerOwingSms } from "./sms";
import { getPackerTotalsMap } from "./packerPay";

export interface WeeklyPackerPaySmsResult {
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Texts every packer with a phone on file and a positive outstanding
 * balance their current amount owing — run both by the Saturday-evening
 * Vercel Cron job and by the manual "Send now" button on the Packers page.
 */
export async function runWeeklyPackerPaySms(): Promise<WeeklyPackerPaySmsResult> {
  if (!isSmsConfigured()) return { sent: 0, failed: 0, skipped: 0 };

  const [packers, totalsMap] = await Promise.all([
    prisma.packer.findMany({ where: { phone: { not: null } } }),
    getPackerTotalsMap(),
  ]);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const packer of packers) {
    const owing = totalsMap.get(packer.id)?.owing ?? 0;
    if (!packer.phone || owing <= 0) {
      skipped++;
      continue;
    }
    try {
      await sendPackerOwingSms({ to: packer.phone, packerName: packer.name, owing });
      sent++;
    } catch (err) {
      console.error(`Failed to send weekly pay SMS to packer ${packer.name}:`, err);
      failed++;
    }
  }
  return { sent, failed, skipped };
}
