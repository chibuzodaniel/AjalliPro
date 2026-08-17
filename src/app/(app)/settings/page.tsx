import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { latestClosingStock } from "@/lib/stock";
import { getWeeklyIncentiveSettings, getEmailTemplateSettings, getPricingSettings } from "@/lib/settings";
import WeeklyIncentiveEditor from "@/components/settings/WeeklyIncentiveEditor";
import EmailTemplateEditor from "@/components/settings/EmailTemplateEditor";
import FactoryPriceEditor from "@/components/settings/FactoryPriceEditor";
import ProductionCalculator from "@/components/settings/ProductionCalculator";
import DailyRecordApproverEditor from "@/components/settings/DailyRecordApproverEditor";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [stock, weeklySettings, emailTemplate, pricing, admins] = await Promise.all([
    latestClosingStock(),
    getWeeklyIncentiveSettings(),
    getEmailTemplateSettings(),
    getPricingSettings(),
    isSuperAdmin
      ? prisma.user.findMany({
          where: { role: "ADMIN" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true, dailyRecordApprover: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Settings</h1>
          <div className="sub">
            {isSuperAdmin
              ? "Weekly incentives & production requirement — Super Admin only editing"
              : "Factory sale pricing — Admin editing"}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Factory sale price</div>
        <div className="section-sub">
          The fixed ₦/bag price used for factory (walk-in) sales on the Daily Record form. Regular staff see this
          price read-only when logging a sale; only Admin/Super Admin can change it here.
        </div>
        <FactoryPriceEditor initial={pricing.factoryPricePerBag} />
      </div>

      {isSuperAdmin && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="section-title">Weekly incentive thresholds</div>
            <div className="section-sub">
              Customers reaching the threshold bags in a week qualify for the bonus bags shown on Incentive Tracking;
              same for drivers, with their own threshold/bonus.
            </div>
            <WeeklyIncentiveEditor initial={weeklySettings} />
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="section-title">Daily record approval notifications</div>
            <div className="section-sub">
              Super Admin always gets notified when a daily record needs approval. Choose which Admin(s) should also
              be notified — other Admins won&apos;t be pinged, though any Admin can still approve from the Approvals
              page.
            </div>
            <DailyRecordApproverEditor admins={admins} />
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="section-title">Weekly mail email template</div>
            <div className="section-sub">
              Customize the subject line, intro, and signature used when the weekly customer mail is sent from the
              Customers page. The bag totals and bonus line stay computed automatically.
            </div>
            <EmailTemplateEditor initial={emailTemplate} />
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
              Sign-in uses real hashed-password accounts and a database behind this app (via Prisma), replacing the
              original prototype&apos;s browser-only storage. Weekly customer mail sends for real via Brevo from the
              Customers page (once <code>BREVO_API_KEY</code> and <code>BREVO_FROM_EMAIL</code> are set) — it&apos;s
              triggered manually by an Admin/Admin Staff, not on an automatic schedule.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
