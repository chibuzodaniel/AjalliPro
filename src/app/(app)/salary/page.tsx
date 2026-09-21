import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";
import { todayISO } from "@/lib/week";
import { formatMoney } from "@/lib/money";
import { isSmsConfigured } from "@/lib/sms";
import StaffSalarySettingsEditor from "@/components/salary/StaffSalarySettingsEditor";
import SalaryPaymentControl from "@/components/salary/SalaryPaymentControl";
import SalaryPaymentHistory from "@/components/salary/SalaryPaymentHistory";

export default async function SalaryPage() {
  const user = await getCurrentUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const period = todayISO().slice(0, 7);

  const [staff, paymentsThisPeriod] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.salaryPayment.findMany({ where: { period } }),
  ]);
  const paidUserIds = new Set(paymentsThisPeriod.map((p) => p.userId));
  const totalMonthly = staff.reduce((s, u) => s + u.salaryAmount, 0);
  const paidThisMonth = staff
    .filter((u) => paidUserIds.has(u.id))
    .reduce((s, u) => s + (paymentsThisPeriod.find((p) => p.userId === u.id)?.amount ?? 0), 0);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Salary</h1>
          <div className="sub">
            Set each staff member&apos;s monthly salary and phone, then mark it paid once it&apos;s handled — they get
            an SMS the moment you do.
          </div>
        </div>
      </div>

      {!isSmsConfigured() && (
        <div className="calc-box" style={{ marginBottom: 18 }}>
          <span>
            SMS isn&apos;t configured yet — payments can still be marked paid, but staff won&apos;t be texted until
            BULKSMSNIGERIA_API_TOKEN and BULKSMSNIGERIA_SENDER_ID are set.
          </span>
        </div>
      )}

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card kpi">
          <div className="top">Period</div>
          <div className="val">{period}</div>
        </div>
        <div className="card kpi">
          <div className="top">Total monthly payroll</div>
          <div className="val">{formatMoney(totalMonthly)}</div>
        </div>
        <div className="card kpi">
          <div className="top">Paid this month</div>
          <div className="val">{formatMoney(paidThisMonth)}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Salary / phone</th>
                <th>This month ({period})</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    {s.role === "SUPER_ADMIN" ? (
                      // Super Admin is a hidden role — only another Super Admin viewing
                      // this list can tell who holds it.
                      isSuperAdmin && <span className="badge-role">Super Admin</span>
                    ) : (
                      <span className="badge-role">{roleLabel(s.role)}</span>
                    )}
                  </td>
                  <td>
                    <StaffSalarySettingsEditor userId={s.id} initialAmount={s.salaryAmount} initialPhone={s.phone} />
                  </td>
                  <td>
                    <SalaryPaymentControl
                      userId={s.id}
                      period={period}
                      initialPaid={paidUserIds.has(s.id)}
                      salaryAmount={s.salaryAmount}
                    />
                  </td>
                  <td>
                    <SalaryPaymentHistory userId={s.id} name={s.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {staff.length === 0 && <div className="empty">No staff accounts yet.</div>}
      </div>
    </div>
  );
}
