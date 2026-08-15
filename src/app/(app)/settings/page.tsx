import { prisma } from "@/lib/prisma";
import { latestClosingStock } from "@/lib/stock";
import { getWeeklyIncentiveSettings } from "@/lib/settings";
import IncentiveTierEditor from "@/components/settings/IncentiveTierEditor";
import WeeklyIncentiveEditor from "@/components/settings/WeeklyIncentiveEditor";
import ProductionCalculator from "@/components/settings/ProductionCalculator";

export default async function SettingsPage() {
  const [tiers, stock, weeklySettings] = await Promise.all([
    prisma.incentiveTier.findMany({ orderBy: { min: "asc" } }),
    latestClosingStock(),
    getWeeklyIncentiveSettings(),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Settings</h1>
          <div className="sub">Incentive tiers &amp; production requirement — Super Admin only editing</div>
        </div>
      </div>
      <div className="card">
        <div className="section-title">Weekly incentive thresholds</div>
        <div className="section-sub">
          Customers reaching the threshold bags in a week qualify for the bonus bags shown on Incentive Tracking;
          same for drivers, with their own threshold/bonus.
        </div>
        <WeeklyIncentiveEditor initial={weeklySettings} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">Customer incentive tiers</div>
        <div className="section-sub">Bonus bags awarded based on bags bought in a single sale.</div>
        <IncentiveTierEditor initialTiers={tiers.map((t) => ({ min: t.min, max: t.max, bonus: t.bonus }))} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">Production requirement (today)</div>
        <div className="section-sub">
          Suggested bags to produce today to cover expected demand and keep a safety buffer.
        </div>
        <ProductionCalculator currentStock={stock} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">About this system</div>
        <div className="section-sub" style={{ lineHeight: 1.6 }}>
          Sign-in uses real hashed-password accounts and a SQLite database behind this app (via Prisma), replacing
          the original prototype&apos;s browser-only storage. Weekly customer emails are still composed in-app only —
          actually delivering them each week would need a scheduled job wired to a real email provider (e.g.
          SendGrid), which isn&apos;t part of this build.
        </div>
      </div>
    </div>
  );
}
