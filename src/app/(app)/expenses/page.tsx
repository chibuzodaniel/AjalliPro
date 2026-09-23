import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canViewExpenses } from "@/lib/roles";
import { formatMoney } from "@/lib/money";
import { currentWeekKey, weekKeyOf, MONTH_NAMES, todayISO } from "@/lib/week";
import { getPackerTotalsMap } from "@/lib/packerPay";
import KpiCard from "@/components/ui/KpiCard";
import RangeTabs from "@/components/ui/RangeTabs";
import Pill from "@/components/ui/Pill";
import ViewAllModal from "@/components/ui/ViewAllModal";
import ExpensePaymentControl from "@/components/expenses/ExpensePaymentControl";
import ExpensePaymentHistory from "@/components/expenses/ExpensePaymentHistory";
import DeleteExpenseButton from "@/components/expenses/DeleteExpenseButton";
import MaterialUsageCard, { type MaterialQtyRow } from "@/components/expenses/MaterialUsageCard";
import PackerPaymentControl from "@/components/packers/PackerPaymentControl";
import PackerPaymentHistory from "@/components/packers/PackerPaymentHistory";
import SalaryPaymentControl from "@/components/salary/SalaryPaymentControl";
import SalaryPaymentHistory from "@/components/salary/SalaryPaymentHistory";

function groupQtyByPeriod(
  entries: { date: string; qty: number }[],
  keyFn: (date: string) => string,
  labelFn: (key: string) => string,
  limit: number
): MaterialQtyRow[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    const key = keyFn(e.date);
    totals.set(key, (totals.get(key) ?? 0) + e.qty);
  }
  // localeCompare with numeric:true so "...-W9" sorts before "...-W10" —
  // plain string sort would put W10 before W9 lexicographically.
  const keys = [...totals.keys()].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).slice(0, limit);
  return keys.map((key) => ({ label: labelFn(key), qty: totals.get(key)! }));
}

function materialHistory(entries: { date: string; qty: number }[]) {
  const wk = currentWeekKey();
  return {
    weekQty: entries.filter((e) => weekKeyOf(e.date) === wk).reduce((s, e) => s + e.qty, 0),
    // Only the current (still-ongoing) week is shown at week granularity —
    // once a week is over, its totals live on in "By month" instead of also
    // lingering here as a separate historical row.
    weeklyHistory: groupQtyByPeriod(entries, (d) => weekKeyOf(d), (k) => k, 1),
    monthlyHistory: groupQtyByPeriod(
      entries,
      (d) => d.slice(0, 7),
      (k) => `${MONTH_NAMES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`,
      12
    ),
    yearlyHistory: groupQtyByPeriod(entries, (d) => d.slice(0, 4), (k) => k, 10),
  };
}

type StatusFilter = "unpaid" | "paid" | "all";

function parseStatus(value: string | undefined): StatusFilter {
  return value === "paid" || value === "all" ? value : "unpaid";
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const user = await getCurrentUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canRecordPayment = user ? canViewExpenses(user.role) : false;
  const canRecordPackerPayment = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  // Salary is more sensitive than routine expenses — Admin Staff can see
  // everything else on this page, but salary stays Admin/Super Admin only.
  const canSeeSalary = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const period = todayISO().slice(0, 7);

  const [items, allTotals, unpaidCount, rollsEntriesRaw, packingBagsEntriesRaw, packers, packerTotalsMap, staff, paymentsThisPeriod] =
    await Promise.all([
      prisma.expenseItem.findMany({
        where: status === "all" ? {} : { paid: status === "paid" },
        include: { dailyRecord: true, paidBy: true, _count: { select: { payments: true } } },
        orderBy: { dailyRecord: { date: "desc" } },
      }),
      prisma.expenseItem.findMany({ select: { amount: true, amountPaid: true } }),
      prisma.expenseItem.count({ where: { paid: false } }),
      prisma.expenseItem.findMany({
        where: { rollsKg: { not: null } },
        select: { rollsKg: true, dailyRecord: { select: { date: true } } },
      }),
      prisma.expenseItem.findMany({
        where: { packingBagsBundles: { not: null } },
        select: { packingBagsBundles: true, dailyRecord: { select: { date: true } } },
      }),
      prisma.packer.findMany(),
      getPackerTotalsMap(),
      canSeeSalary ? prisma.user.findMany({ where: { payrollEnabled: true, salaryAmount: { gt: 0 } } }) : Promise.resolve([]),
      canSeeSalary ? prisma.salaryPayment.findMany({ where: { period } }) : Promise.resolve([]),
    ]);

  // Packer pay isn't per-day expense lines any more (see PackerPayment) — it's
  // folded into this page as one consolidated row per packer, filtered by the
  // same paid/unpaid/all tabs as everything else, so it shows up here without
  // being counted twice against any real ExpenseItem.
  const packerRows = packers
    .map((p) => ({ packer: p, totals: packerTotalsMap.get(p.id) ?? { bags: 0, earned: 0, paid: 0, owing: 0 } }))
    .filter(({ totals }) => totals.earned > 0)
    .filter(({ totals }) => (status === "all" ? true : status === "paid" ? totals.owing <= 0 : totals.owing > 0));

  // Same idea for this month's salary — Super Admin is a hidden role, so
  // their own salary line only shows to another Super Admin viewing this.
  const paymentByUserId = new Map(paymentsThisPeriod.map((p) => [p.userId, p]));
  const salaryRows = staff
    .filter((s) => s.role !== "SUPER_ADMIN" || isSuperAdmin)
    .map((s) => ({ staffUser: s, payment: paymentByUserId.get(s.id) ?? null }))
    .filter(({ payment }) => (status === "all" ? true : status === "paid" ? payment !== null : payment === null));

  const packerAmount = [...packerTotalsMap.values()].reduce((s, t) => s + t.earned, 0);
  const packerPaid = [...packerTotalsMap.values()].reduce((s, t) => s + t.paid, 0);
  const salaryAmountTotal = staff
    .filter((s) => s.role !== "SUPER_ADMIN" || isSuperAdmin)
    .reduce((s, u) => s + u.salaryAmount, 0);
  const salaryPaidTotal = staff
    .filter((s) => s.role !== "SUPER_ADMIN" || isSuperAdmin)
    .reduce((s, u) => s + (paymentByUserId.get(u.id)?.amount ?? 0), 0);

  const totalAmount = allTotals.reduce((s, e) => s + e.amount, 0) + packerAmount + salaryAmountTotal;
  const totalPaid = allTotals.reduce((s, e) => s + e.amountPaid, 0) + packerPaid + salaryPaidTotal;
  const totalOutstanding = totalAmount - totalPaid;
  const unpaidTotalCount =
    unpaidCount +
    [...packerTotalsMap.values()].filter((t) => t.owing > 0).length +
    staff.filter((s) => (s.role !== "SUPER_ADMIN" || isSuperAdmin) && !paymentByUserId.has(s.id)).length;

  const rolls = materialHistory(rollsEntriesRaw.map((e) => ({ date: e.dailyRecord.date, qty: e.rollsKg ?? 0 })));
  const packingBags = materialHistory(
    packingBagsEntriesRaw.map((e) => ({ date: e.dailyRecord.date, qty: e.packingBagsBundles ?? 0 }))
  );

  const expensesTable = (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Qty</th>
          <th>Paid</th>
          <th>Remaining</th>
          <th>Status</th>
          <th>Last paid by</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {packerRows.map(({ packer, totals }) => {
          const pillStatus = totals.owing <= 0 ? "APPROVED" : totals.paid > 0 ? "PENDING" : "REJECTED";
          const label = totals.owing <= 0 ? "paid" : totals.paid > 0 ? "partial" : "unpaid";
          return (
            <tr key={`packer-${packer.id}`}>
              <td>Ongoing</td>
              <td>Packer pay — {packer.name}</td>
              <td>{formatMoney(totals.earned)}</td>
              <td>{totals.bags} bags</td>
              <td>{formatMoney(totals.paid)}</td>
              <td>{formatMoney(Math.max(0, totals.owing))}</td>
              <td>
                <Pill status={pillStatus}>{label}</Pill>
              </td>
              <td>—</td>
              <td style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {canRecordPackerPayment ? (
                  <PackerPaymentControl packerId={packer.id} owing={totals.owing} paid={totals.paid} />
                ) : totals.owing <= 0 ? (
                  <span style={{ fontSize: 12.5, color: "var(--green)" }}>Paid in full</span>
                ) : (
                  <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>{formatMoney(totals.owing)} owing</span>
                )}
                <PackerPaymentHistory packerId={packer.id} name={packer.name} />
              </td>
            </tr>
          );
        })}
        {salaryRows.map(({ staffUser, payment }) => {
          const paid = payment !== null;
          const amountPaid = payment?.amount ?? 0;
          const remaining = staffUser.salaryAmount - amountPaid;
          const pillStatus = paid ? "APPROVED" : "REJECTED";
          return (
            <tr key={`salary-${staffUser.id}`}>
              <td>{period}</td>
              <td>Salary — {staffUser.name}</td>
              <td>{formatMoney(staffUser.salaryAmount)}</td>
              <td>—</td>
              <td>{formatMoney(amountPaid)}</td>
              <td>{formatMoney(Math.max(0, remaining))}</td>
              <td>
                <Pill status={pillStatus}>{paid ? "paid" : "unpaid"}</Pill>
              </td>
              <td>—</td>
              <td style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {canRecordPackerPayment ? (
                  <SalaryPaymentControl
                    userId={staffUser.id}
                    period={period}
                    initialPaid={paid}
                    salaryAmount={staffUser.salaryAmount}
                  />
                ) : paid ? (
                  <span style={{ fontSize: 12.5, color: "var(--green)" }}>Paid in full</span>
                ) : (
                  <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>{formatMoney(staffUser.salaryAmount)} owing</span>
                )}
                <SalaryPaymentHistory userId={staffUser.id} name={staffUser.name} />
              </td>
            </tr>
          );
        })}
        {items.map((item) => {
          const remaining = item.amount - item.amountPaid;
          const pillStatus = item.paid ? "APPROVED" : item.amountPaid > 0 ? "PENDING" : "REJECTED";
          const label = item.paid ? "paid" : item.amountPaid > 0 ? "partial" : "unpaid";
          return (
            <tr key={item.id}>
              <td>{item.dailyRecord.date}</td>
              <td>{item.description}</td>
              <td>{formatMoney(item.amount)}</td>
              <td>
                {item.rollsKg != null
                  ? `${item.rollsKg.toFixed(1)} kg`
                  : item.packingBagsBundles != null
                    ? `${item.packingBagsBundles.toFixed(1)} bundle${item.packingBagsBundles === 1 ? "" : "s"}`
                    : "—"}
              </td>
              <td>{formatMoney(item.amountPaid)}</td>
              <td>{formatMoney(remaining)}</td>
              <td>
                <Pill status={pillStatus}>{label}</Pill>
              </td>
              <td>{item.paidBy ? item.paidBy.name : "—"}</td>
              <td style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {canRecordPayment ? (
                  <ExpensePaymentControl id={item.id} amount={item.amount} amountPaid={item.amountPaid} />
                ) : remaining <= 0 ? (
                  <span style={{ fontSize: 12.5, color: "var(--green)" }}>Paid in full</span>
                ) : (
                  <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>{formatMoney(remaining)} owing</span>
                )}
                <ExpensePaymentHistory expenseItemId={item.id} count={item._count.payments} />
                {isSuperAdmin && <DeleteExpenseButton id={item.id} description={item.description} />}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const totalRowCount = packerRows.length + salaryRows.length + items.length;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Expenses</h1>
          <div className="sub">
            Every expense line logged on a daily record, across all days — plus packer pay (running total per
            packer){canSeeSalary ? " and this month's staff salaries" : ""}
          </div>
        </div>
      </div>
      <div className="grid grid-5" style={{ marginBottom: 18 }}>
        <KpiCard
          label="Outstanding"
          value={formatMoney(totalOutstanding)}
          delta={`${unpaidTotalCount} item${unpaidTotalCount === 1 ? "" : "s"}`}
          deltaTone="neg"
        />
        <KpiCard label="Paid" value={formatMoney(totalPaid)} />
        <KpiCard label="Total" value={formatMoney(totalAmount)} />
        <MaterialUsageCard
          materialName="Rolls"
          unit="kg"
          icon="🧻"
          iconBg="rgba(47,215,196,.15)"
          iconColor="var(--teal)"
          {...rolls}
        />
        <MaterialUsageCard
          materialName="Packing Bags"
          unit="bundle"
          icon="📦"
          iconBg="rgba(124,110,245,.15)"
          iconColor="var(--accent)"
          {...packingBags}
        />
      </div>
      <RangeTabs
        basePath="/expenses"
        current={status}
        paramName="status"
        options={[
          { value: "unpaid", label: "Unpaid" },
          { value: "paid", label: "Paid" },
          { value: "all", label: "All" },
        ]}
      />
      <div className="card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <ViewAllModal title="All Expenses">{expensesTable}</ViewAllModal>
        </div>
        <div className="table-wrap">{expensesTable}</div>
        {totalRowCount === 0 && <div className="empty">No {status === "all" ? "" : status} expenses.</div>}
      </div>
    </div>
  );
}
