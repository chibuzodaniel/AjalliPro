import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canViewExpenses } from "@/lib/roles";
import { formatMoney } from "@/lib/money";
import KpiCard from "@/components/ui/KpiCard";
import RangeTabs from "@/components/ui/RangeTabs";
import Pill from "@/components/ui/Pill";
import ViewAllModal from "@/components/ui/ViewAllModal";
import ExpensePaymentControl from "@/components/expenses/ExpensePaymentControl";
import ExpensePaymentHistory from "@/components/expenses/ExpensePaymentHistory";
import DeleteExpenseButton from "@/components/expenses/DeleteExpenseButton";

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

  const [items, allTotals, unpaidCount] = await Promise.all([
    prisma.expenseItem.findMany({
      where: status === "all" ? {} : { paid: status === "paid" },
      include: { dailyRecord: true, paidBy: true, _count: { select: { payments: true } } },
      orderBy: { dailyRecord: { date: "desc" } },
    }),
    prisma.expenseItem.findMany({ select: { amount: true, amountPaid: true } }),
    prisma.expenseItem.count({ where: { paid: false } }),
  ]);

  const totalAmount = allTotals.reduce((s, e) => s + e.amount, 0);
  const totalPaid = allTotals.reduce((s, e) => s + e.amountPaid, 0);
  const totalOutstanding = totalAmount - totalPaid;

  const expensesTable = (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Amount</th>
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
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <KpiCard
          label="Outstanding"
          value={formatMoney(totalOutstanding)}
          delta={`${unpaidCount} item${unpaidCount === 1 ? "" : "s"}`}
          deltaTone="neg"
        />
        <KpiCard label="Paid" value={formatMoney(totalPaid)} />
        <KpiCard label="Total" value={formatMoney(totalAmount)} />
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
