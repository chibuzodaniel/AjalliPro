import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canViewExpenses } from "@/lib/roles";
import { formatMoney } from "@/lib/money";
import { currentWeekKey, weekKeyOf, MONTH_NAMES } from "@/lib/week";
import KpiCard from "@/components/ui/KpiCard";
import RangeTabs from "@/components/ui/RangeTabs";
import Pill from "@/components/ui/Pill";
import ViewAllModal from "@/components/ui/ViewAllModal";
import ExpensePaymentControl from "@/components/expenses/ExpensePaymentControl";
import ExpensePaymentHistory from "@/components/expenses/ExpensePaymentHistory";
import DeleteExpenseButton from "@/components/expenses/DeleteExpenseButton";
import MaterialUsageCard, { type MaterialKgRow } from "@/components/expenses/MaterialUsageCard";

function groupKgByPeriod(
  entries: { date: string; kg: number }[],
  keyFn: (date: string) => string,
  labelFn: (key: string) => string,
  limit: number
): MaterialKgRow[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    const key = keyFn(e.date);
    totals.set(key, (totals.get(key) ?? 0) + e.kg);
  }
  const keys = [...totals.keys()].sort().reverse().slice(0, limit);
  return keys.map((key) => ({ label: labelFn(key), kg: totals.get(key)! }));
}

function materialHistory(entries: { date: string; kg: number }[]) {
  const wk = currentWeekKey();
  return {
    weekKg: entries.filter((e) => weekKeyOf(e.date) === wk).reduce((s, e) => s + e.kg, 0),
    weeklyHistory: groupKgByPeriod(entries, (d) => weekKeyOf(d), (k) => k, 12),
    monthlyHistory: groupKgByPeriod(
      entries,
      (d) => d.slice(0, 7),
      (k) => `${MONTH_NAMES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`,
      12
    ),
    yearlyHistory: groupKgByPeriod(entries, (d) => d.slice(0, 4), (k) => k, 10),
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

  const [items, allTotals, unpaidCount, rollsEntriesRaw, packingBagsEntriesRaw] = await Promise.all([
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
      where: { packingBagsKg: { not: null } },
      select: { packingBagsKg: true, dailyRecord: { select: { date: true } } },
    }),
  ]);

  const totalAmount = allTotals.reduce((s, e) => s + e.amount, 0);
  const totalPaid = allTotals.reduce((s, e) => s + e.amountPaid, 0);
  const totalOutstanding = totalAmount - totalPaid;

  const rolls = materialHistory(rollsEntriesRaw.map((e) => ({ date: e.dailyRecord.date, kg: e.rollsKg ?? 0 })));
  const packingBags = materialHistory(
    packingBagsEntriesRaw.map((e) => ({ date: e.dailyRecord.date, kg: e.packingBagsKg ?? 0 }))
  );

  const expensesTable = (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Kg</th>
          <th>Paid</th>
          <th>Remaining</th>
          <th>Status</th>
          <th>Last paid by</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
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
                  : item.packingBagsKg != null
                    ? `${item.packingBagsKg.toFixed(1)} kg`
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

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Expenses</h1>
          <div className="sub">Every expense line logged on a daily record, across all days</div>
        </div>
      </div>
      <div className="grid grid-5" style={{ marginBottom: 18 }}>
        <KpiCard
          label="Outstanding"
          value={formatMoney(totalOutstanding)}
          delta={`${unpaidCount} item${unpaidCount === 1 ? "" : "s"}`}
          deltaTone="neg"
        />
        <KpiCard label="Paid" value={formatMoney(totalPaid)} />
        <KpiCard label="Total" value={formatMoney(totalAmount)} />
        <MaterialUsageCard
          materialName="Rolls"
          icon="🧻"
          iconBg="rgba(47,215,196,.15)"
          iconColor="var(--teal)"
          {...rolls}
        />
        <MaterialUsageCard
          materialName="Packing Bags"
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
        {items.length === 0 && <div className="empty">No {status === "all" ? "" : status} expenses.</div>}
      </div>
    </div>
  );
}
