import { NextRequest, NextResponse } from "next/server";
import { runWeeklyPackerPaySms } from "@/lib/packerPaySms";

/**
 * Triggered by Vercel Cron (see vercel.json) every Saturday evening — texts
 * each packer with a phone on file their current amount owing. Vercel signs
 * cron requests with `Authorization: Bearer $CRON_SECRET`; anything else is
 * rejected so this endpoint can't be used to spam packers on demand.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWeeklyPackerPaySms();
  return NextResponse.json({ ok: true, ...result });
}
