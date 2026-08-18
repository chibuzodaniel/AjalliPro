import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getApprovedRecordsSorted } from "@/lib/records";
import { formatMoney } from "@/lib/money";
import PackerPricingEditor from "@/components/packers/PackerPricingEditor";
import DeletePackerButton from "@/components/packers/DeletePackerButton";
import ViewAllModal from "@/components/ui/ViewAllModal";

export default async function PackersPage() {
  const user = await getCurrentUser();
  const [packers, approvedRecords, paidAgg, owingAgg] = await Promise.all([
    prisma.packer.findMany({ orderBy: { createdAt: "desc" } }),
    getApprovedRecordsSorted(),
    prisma.expenseItem.groupBy({
      by: ["packerId"],
      where: { packerId: { not: null }, paid: true },
      _sum: { amount: true },
    }),
    prisma.expenseItem.groupBy({
      by: ["packerId"],
      where: { packerId: { not: null }, paid: false },
      _sum: { amount: true },
    }),
  ]);

  const canSetPricing = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canDelete = user?.role === "SUPER_ADMIN";

  const bagsByPacker = new Map<string, number>();
  for (const r of approvedRecords) {
    for (const p of r.productionLines) {
      bagsByPacker.set(p.packerId, (bagsByPacker.get(p.packerId) ?? 0) + p.bags);
    }
  }
  const paidByPacker = new Map(paidAgg.map((a) => [a.packerId as string, a._sum.amount ?? 0]));
  const owingByPacker = new Map(owingAgg.map((a) => [a.packerId as string, a._sum.amount ?? 0]));

  const packersTable = (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Pay/bag</th>
          <th>Bags packed</th>
          <th>Amount owing</th>
          <th>Amount paid</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {packers.map((p) => {
          const bags = bagsByPacker.get(p.id) ?? 0;
          const owing = owingByPacker.get(p.id) ?? 0;
          const paid = paidByPacker.get(p.id) ?? 0;
          return (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>
                {canSetPricing ? (
                  <PackerPricingEditor packerId={p.id} pricePerBag={p.pricePerBag} />
                ) : (
                  <span>{formatMoney(p.pricePerBag)}/bag</span>
                )}
              </td>
              <td>{bags}</td>
              <td>
                <span style={{ color: owing > 0 ? "var(--red)" : "var(--text-faint)" }}>{formatMoney(owing)}</span>
              </td>
              <td>{formatMoney(paid)}</td>
              <td>{canDelete && <DeletePackerButton id={p.id} name={p.name} />}</td>
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
            Recognized automatically from names entered on daily records — set the pay per bag here as Admin/Super
            Admin, and it applies from that point on
          </div>
        </div>
      </div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
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
