import { getCurrentUser } from "@/lib/auth-helpers";
import { canManagePackers } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getPricingSettings } from "@/lib/settings";
import { getPackerTotalsMap } from "@/lib/packerPay";
import { formatMoney } from "@/lib/money";
import DeletePackerButton from "@/components/packers/DeletePackerButton";
import PackerPhoneEditor from "@/components/packers/PackerPhoneEditor";
import PackerNameDetail from "@/components/packers/PackerNameDetail";
import PackerPaymentControl from "@/components/packers/PackerPaymentControl";
import PackerPaymentHistory from "@/components/packers/PackerPaymentHistory";
import WeeklyPackerPaySmsButton from "@/components/packers/WeeklyPackerPaySmsButton";
import SendEntitySmsButton from "@/components/shared/SendEntitySmsButton";
import ViewAllModal from "@/components/ui/ViewAllModal";
import { sendPackerSms } from "./actions";

export default async function PackersPage() {
  const user = await getCurrentUser();
  const [packers, pricing, totalsMap, smsTemplates] = await Promise.all([
    prisma.packer.findMany({ orderBy: { createdAt: "desc" } }),
    getPricingSettings(),
    getPackerTotalsMap(),
    prisma.smsTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  const canManage = user ? canManagePackers(user.role) : false;
  const canRecordPayment = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canDelete = user?.role === "SUPER_ADMIN";

  const packersTable = (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Bags packed</th>
          <th>Amount owing</th>
          <th>Amount paid</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {packers.map((p) => {
          const totals = totalsMap.get(p.id) ?? { bags: 0, earned: 0, paid: 0, owing: 0 };
          return (
            <tr key={p.id}>
              <td>
                <PackerNameDetail
                  packerId={p.id}
                  name={p.name}
                  phone={p.phone}
                  bagsPacked={totals.bags}
                  owing={totals.owing}
                  paid={totals.paid}
                />
              </td>
              <td>
                {canManage ? (
                  <PackerPhoneEditor packerId={p.id} phone={p.phone} />
                ) : (
                  p.phone || "—"
                )}
              </td>
              <td>{totals.bags}</td>
              <td>
                <span style={{ color: totals.owing > 0 ? "var(--red)" : "var(--text-faint)" }}>
                  {formatMoney(totals.owing)}
                </span>
              </td>
              <td>{formatMoney(totals.paid)}</td>
              <td style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {canRecordPayment && <PackerPaymentControl packerId={p.id} owing={totals.owing} paid={totals.paid} />}
                {canManage && <PackerPaymentHistory packerId={p.id} name={p.name} />}
                {canManage && p.phone && (
                  <SendEntitySmsButton entityId={p.id} entityName={p.name} templates={smsTemplates} sendAction={sendPackerSms} />
                )}
                {canDelete && <DeletePackerButton id={p.id} name={p.name} />}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Packers</h1>
          <div className="sub">
            Recognized automatically from names entered on daily records. Everyone is paid{" "}
            {formatMoney(pricing.packerPricePerBag)}/bag — change it on the Settings page. Pay accumulates into a
            running balance (click a name to see the day-by-day breakdown); packers with a phone on file are
            automatically texted their outstanding balance every Saturday evening, and texted again the moment
            they're paid.
          </div>
        </div>
      </div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          {canManage ? <WeeklyPackerPaySmsButton /> : <span />}
          <ViewAllModal title="All Packers">{packersTable}</ViewAllModal>
        </div>
        <div className="table-wrap">{packersTable}</div>
        {packers.length === 0 && (
          <div className="empty">No packers yet — they appear here the first time their name is used on a daily record.</div>
        )}
      </div>
    </div>
  );
}
