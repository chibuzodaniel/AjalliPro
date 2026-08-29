import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isApprover } from "@/lib/roles";
import { SUPER_ADMIN_EMAIL } from "@/lib/auth";
import { latestClosingStock } from "@/lib/stock";
import { getWeeklyIncentiveSettings, getEmailTemplateSettings, getPricingSettings } from "@/lib/settings";
import WeeklyIncentiveEditor from "@/components/settings/WeeklyIncentiveEditor";
import EmailTemplateEditor from "@/components/settings/EmailTemplateEditor";
import FactoryPriceEditor from "@/components/settings/FactoryPriceEditor";
import PackerPriceEditor from "@/components/settings/PackerPriceEditor";
import TruckFeeEditor from "@/components/settings/TruckFeeEditor";
import ProductionCalculator from "@/components/settings/ProductionCalculator";
import UsersList from "@/components/settings/UsersList";
import ResetSystemButton from "@/components/settings/ResetSystemButton";
import { getResetPreviewCounts } from "./actions";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isSeniorAdmin = (user?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
  const canSeeUsers = user ? isApprover(user.role) : false;

  const [stock, weeklySettings, emailTemplate, pricing, usersRaw, resetCounts] = await Promise.all([
    latestClosingStock(),
    getWeeklyIncentiveSettings(),
    getEmailTemplateSettings(),
    getPricingSettings(),
    canSeeUsers
      ? prisma.user.findMany({
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            dailyRecordApprover: true,
            canEdit: true,
            stayLoggedIn: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    isSeniorAdmin ? getResetPreviewCounts() : Promise.resolve(null),
  ]);
  const allUsers = usersRaw.map((u) => ({ ...u, isPrimary: u.email.toLowerCase() === SUPER_ADMIN_EMAIL }));

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

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">Packer pay rate</div>
        <div className="section-sub">
          One ₦/bag rate applied to every packer, wherever their name is typed on the Daily Record form. Changing it
          only affects production logged from now on — past entries keep the rate that applied at the time.
        </div>
        <PackerPriceEditor initial={pricing.packerPricePerBag} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">Truck delivery fees</div>
        <div className="section-sub">
          ₦/bag rates for truck deliveries. Loading and offloading apply either way (own truck or hired); hired
          truck cost only applies to hired deliveries, replacing manual entry — it's calculated automatically once
          bags are entered. All three are waivable per delivery on the Daily Record form. Changing a rate only
          affects deliveries logged from now on.
        </div>
        <TruckFeeEditor
          initialLoading={pricing.truckLoadingFeePerBag}
          initialOffloading={pricing.truckOffloadingFeePerBag}
          initialHiredCost={pricing.truckHiredCostPerBag}
        />
      </div>

      {canSeeUsers && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-title">Users</div>
          <div className="section-sub">
            Everyone with an account. Super Admin always sees and approves daily records; an Admin only sees and
            approves them once Super Admin assigns them here — unassigned Admins won&apos;t see that section at all
            on the Approvals page.
          </div>
          <UsersList users={allUsers} canAssign={isSuperAdmin} isSeniorAdmin={isSeniorAdmin} currentUserId={user?.id ?? ""} />
        </div>
      )}

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

      {isSeniorAdmin && resetCounts && (
        <div className="card" style={{ marginTop: 16, borderColor: "var(--red)" }}>
          <div className="section-title" style={{ color: "var(--red)" }}>
            Danger zone
          </div>
          <div className="section-sub">
            Permanently clears all daily records, drivers, customers, packers, expenses, and settings back to a
            blank slate. Only visible to you, the primary Super Admin — no one else can do this. User accounts are
            never affected.
          </div>
          <ResetSystemButton counts={resetCounts} />
        </div>
      )}
    </div>
  );
}
