import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import KpiCard from "@/components/ui/KpiCard";
import RangeTabs from "@/components/ui/RangeTabs";
import Pill from "@/components/ui/Pill";
import ViewAllModal from "@/components/ui/ViewAllModal";
import ExpensePaidToggle from "@/components/expenses/ExpensePaidToggle";

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

  const [items, unpaidTotal, paidTotal, unpaidCount] = await Promise.all([
    prisma.expenseItem.findMany({
      where: status === "all" ? {} : { paid: status === "paid" },
      include: { dailyRecord: true, paidBy: true },
      orderBy: { dailyRecord: { date: "desc" } },
    }),
    prisma.expenseItem.aggregate({ where: { paid: false }, _sum: { amount: true } }),
    prisma.expenseItem.aggregate({ where: { paid: true }, _sum: { amount: true } }),
    prisma.expenseItem.count({ where: { paid: false } }),
  ]);

  const expensesTable = (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Paid by</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.dailyRecord.date}</td>
            <td>{item.description}</td>
            <td>{formatMoney(item.amount)}</td>
            <td>
              <Pill status={item.paid ? "APPROVED" : "PENDING"}>{item.paid ? "paid" : "unpaid"}</Pill>
            </td>
            <td>{item.paidBy ? item.paidBy.name : "—"}</td>
            <td>
              <ExpensePaidToggle id={item.id} paid={item.paid} />
            </td>
          </tr>
        ))}
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
          label="Unpaid"
          value={formatMoney(unpaidTotal._sum.amount ?? 0)}
          delta={`${unpaidCount} item${unpaidCount === 1 ? "" : "s"}`}
          deltaTone="neg"
        />
        <KpiCard label="Paid" value={formatMoney(paidTotal._sum.amount ?? 0)} />
        <KpiCard label="Total" value={formatMoney((unpaidTotal._sum.amount ?? 0) + (paidTotal._sum.amount ?? 0))} />
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
