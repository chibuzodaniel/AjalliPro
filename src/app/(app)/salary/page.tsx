import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";
import { todayISO } from "@/lib/week";
import { formatMoney } from "@/lib/money";
import { isSmsConfigured } from "@/lib/sms";
import SalaryStaffTable, { type StaffSalaryRow } from "@/components/salary/SalaryStaffTable";

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

  // Super Admin is a hidden role — only another Super Admin viewing this
  // list can tell who holds it.
  const staffRows: StaffSalaryRow[] = staff.map((s) => ({
    id: s.id,
    name: s.name,
    roleLabel: s.role === "SUPER_ADMIN" ? (isSuperAdmin ? "Super Admin" : null) : roleLabel(s.role),
    salaryAmount: s.salaryAmount,
    phone: s.phone,
    paid: paidUserIds.has(s.id),
  }));

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
        <SalaryStaffTable staff={staffRows} period={period} />
      </div>
    </div>
  );
}
