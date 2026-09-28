import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { recordSoldTotal, recordProdTotal, dailyRecordInclude } from "@/lib/records";
import { roleLabel, isApprover, canApproveDailyRecords } from "@/lib/roles";
import { getPricingSettings } from "@/lib/settings";
import ApproveRejectButtons from "@/components/shared/ApproveRejectButtons";
import ViewAllModal from "@/components/ui/ViewAllModal";
import DailyRecordDetail from "@/components/daily-record/DailyRecordDetail";
import EditDailyRecordButton from "@/components/daily-record/EditDailyRecordButton";
import DeleteDailyRecordButton from "@/components/daily-record/DeleteDailyRecordButton";
import PendingDriverDetail from "@/components/approvals/PendingDriverDetail";
import { approveDailyRecord, rejectDailyRecord } from "./actions";
import { approveDriver, rejectDriver } from "../drivers/actions";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  const approver = user ? isApprover(user.role) : false;

  const dbUser = user ? await prisma.user.findUnique({ where: { id: user.id }, select: { dailyRecordApprover: true } }) : null;
  const canSeeDailyRecords = user ? canApproveDailyRecords(user.role, dbUser?.dailyRecordApprover ?? false) : false;

  const [pendingRecords, pendingDrivers, editDrivers, editCustomers, pricing] = await Promise.all([
    canSeeDailyRecords
      ? prisma.dailyRecord.findMany({
          where: { status: "PENDING" },
          include: dailyRecordInclude,
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
    prisma.driver.findMany({
      where: { status: "PENDING" },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    approver ? prisma.driver.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    approver ? prisma.customer.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    approver ? getPricingSettings() : Promise.resolve(null),
  ]);

  const pendingRecordsTable = (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Submitted by</th>
          <th>Role</th>
          <th>Net stock change</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {pendingRecords.map((r) => {
          const net = recordProdTotal(r) - r.leakageBags - recordSoldTotal(r);
          return (
            <tr key={r.id}>
              <td>
                <DailyRecordDetail record={r} />
              </td>
              <td>{r.createdBy.name}</td>
              <td>{roleLabel(r.createdByRole) && <span className="badge-role">{roleLabel(r.createdByRole)}</span>}</td>
              <td>
                {net >= 0 ? "+" : ""}
                {net} bags
              </td>
              <td style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <ApproveRejectButtons id={r.id} onApprove={approveDailyRecord} onReject={rejectDailyRecord} />
                {approver && pricing && (
                  <EditDailyRecordButton
                    record={r}
                    drivers={editDrivers.map((d) => ({ id: d.id, name: d.name, pricePerBag: d.pricePerBag, loadingFee: d.loadingFee }))}
                    customers={editCustomers.map((c) => ({ id: c.id, name: c.name, pricePerBag: c.pricePerBag }))}
                    canEditOpeningStock={user?.role === "SUPER_ADMIN"}
                    canEditFactoryPrice={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"}
                    canEditLeakageOpening={user?.role === "SUPER_ADMIN"}
                    packerPricePerBag={pricing.packerPricePerBag}
                    truckLoadingFeePerBag={pricing.truckLoadingFeePerBag}
                    truckOffloadingFeePerBag={pricing.truckOffloadingFeePerBag}
                    truckHiredCostPerBag={pricing.truckHiredCostPerBag}
                    rollsPricePerKg={pricing.rollsPricePerKg}
                    packingBagsPricePerBundle={pricing.packingBagsPricePerBundle}
                  />
                )}
                {approver && <DeleteDailyRecordButton id={r.id} date={r.date} status={r.status} />}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const pendingDriversTable = (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Submitted by</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {pendingDrivers.map((d) => (
          <tr key={d.id}>
            <td>
              <PendingDriverDetail
                driver={{
                  name: d.name,
                  phone: d.phone,
                  pricePerBag: d.pricePerBag,
                  loadingFee: d.loadingFee,
                  createdAt: d.createdAt,
                  createdByName: d.createdBy.name,
                }}
              />
            </td>
            <td>{d.phone || "—"}</td>
            <td>{d.createdBy.name}</td>
            <td>
              {approver ? (
                <ApproveRejectButtons id={d.id} onApprove={approveDriver} onReject={rejectDriver} />
              ) : (
                <span className="pill pending">awaiting Admin/Super Admin</span>
              )}
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
          <h1>Approvals</h1>
          <div className="sub">Entries by Sales Staff &amp; Admin Staff wait here until Admin/Super Admin approves</div>
        </div>
      </div>

      {canSeeDailyRecords && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="section-title">Pending daily records</div>
            <ViewAllModal title="All Pending Daily Records">{pendingRecordsTable}</ViewAllModal>
          </div>
          <div className="table-wrap">{pendingRecordsTable}</div>
          {pendingRecords.length === 0 && <div className="empty">Nothing pending here.</div>}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="section-title">Pending drivers</div>
          <ViewAllModal title="All Pending Drivers">{pendingDriversTable}</ViewAllModal>
        </div>
        <div className="table-wrap">{pendingDriversTable}</div>
        {pendingDrivers.length === 0 && <div className="empty">Nothing pending here.</div>}
      </div>
    </div>
  );
}
