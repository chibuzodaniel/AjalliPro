import { getCurrentUser } from "@/lib/auth-helpers";
import { isApprover, roleLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  getAllRecordsSorted,
  recordProdTotal,
  recordSoldTotal,
  recordTruckDeliveryBagsTotal,
} from "@/lib/records";
import { latestClosingStock, latestLeakageClosing } from "@/lib/stock";
import { getPricingSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import Pill from "@/components/ui/Pill";
import AddDailyRecordButton from "@/components/daily-record/AddDailyRecordButton";
import DailyRecordDetail from "@/components/daily-record/DailyRecordDetail";
import EditDailyRecordButton from "@/components/daily-record/EditDailyRecordButton";
import DeleteDailyRecordButton from "@/components/daily-record/DeleteDailyRecordButton";
import ApproveRejectButtons from "@/components/shared/ApproveRejectButtons";
import ViewAllModal from "@/components/ui/ViewAllModal";
import { approveDailyRecord } from "../approvals/actions";

export default async function DailyRecordPage() {
  const user = await getCurrentUser();
  const [records, drivers, customers, opening, leakageOpening, pricing] = await Promise.all([
    getAllRecordsSorted(),
    prisma.driver.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    latestClosingStock(),
    latestLeakageClosing(),
    getPricingSettings(),
  ]);
  const approver = user ? isApprover(user.role) : false;

  const recordsTable = (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Opening</th>
          <th>Produced</th>
          <th>Sold</th>
          <th>Truck bags</th>
          <th>Pump water</th>
          <th>Leakages</th>
          <th>Leakage balance</th>
          <th>Closing</th>
          <th>Status</th>
          <th>By</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {records.map((r) => (
          <tr key={r.id}>
            <td>
              <DailyRecordDetail record={r} />
            </td>
            <td>{r.openingStock}</td>
            <td>{recordProdTotal(r)}</td>
            <td>{recordSoldTotal(r)}</td>
            <td>{recordTruckDeliveryBagsTotal(r)}</td>
            <td>{formatMoney(r.pumpWaterAmount)}</td>
            <td>{r.leakageBags}</td>
            <td>{r.leakageClosing}</td>
            <td>{r.closingStock}</td>
            <td>
              <Pill status={r.status}>{r.status.toLowerCase()}</Pill>
            </td>
            <td>
              {r.createdBy.name}
              {roleLabel(r.createdByRole) && (
                <>
                  <br />
                  <span className="badge-role">{roleLabel(r.createdByRole)}</span>
                </>
              )}
            </td>
            <td style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {approver && r.status === "PENDING" && (
                <ApproveRejectButtons id={r.id} onApprove={approveDailyRecord} approveOnly />
              )}
              {user && (approver || (r.createdById === user.id && r.status === "PENDING")) && (
                <EditDailyRecordButton
                  record={r}
                  drivers={drivers.map((d) => ({ id: d.id, name: d.name, pricePerBag: d.pricePerBag, loadingFee: d.loadingFee }))}
                  customers={customers.map((c) => ({ id: c.id, name: c.name, pricePerBag: c.pricePerBag }))}
                  canEditOpeningStock={user?.role === "SUPER_ADMIN"}
                  canEditFactoryPrice={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"}
                  canEditLeakageOpening={user?.role === "SUPER_ADMIN"}
                  packerPricePerBag={pricing.packerPricePerBag}
                  truckLoadingFeePerBag={pricing.truckLoadingFeePerBag}
                  truckOffloadingFeePerBag={pricing.truckOffloadingFeePerBag}
                  truckHiredCostPerBag={pricing.truckHiredCostPerBag}
                />
              )}
              {approver && <DeleteDailyRecordButton id={r.id} date={r.date} status={r.status} />}
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
          <h1>Daily Record</h1>
          <div className="sub">Opening stock, production, sales, leakages &amp; expenses for one day</div>
        </div>
        <AddDailyRecordButton
          openingStock={opening}
          leakageOpening={leakageOpening}
          drivers={drivers.map((d) => ({ id: d.id, name: d.name, pricePerBag: d.pricePerBag, loadingFee: d.loadingFee }))}
          customers={customers.map((c) => ({ id: c.id, name: c.name, pricePerBag: c.pricePerBag }))}
          canEditOpeningStock={user?.role === "SUPER_ADMIN"}
          factoryPricePerBag={pricing.factoryPricePerBag}
          canEditFactoryPrice={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"}
          canEditLeakageOpening={user?.role === "SUPER_ADMIN"}
          packerPricePerBag={pricing.packerPricePerBag}
          truckLoadingFeePerBag={pricing.truckLoadingFeePerBag}
          truckOffloadingFeePerBag={pricing.truckOffloadingFeePerBag}
          truckHiredCostPerBag={pricing.truckHiredCostPerBag}
        />
      </div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <ViewAllModal title="All Daily Records">{recordsTable}</ViewAllModal>
        </div>
        <div className="table-wrap">{recordsTable}</div>
        {records.length === 0 && (
          <div className="empty">No daily records yet. Click &quot;New daily entry&quot; to log today&apos;s activity.</div>
        )}
      </div>
    </div>
  );
}
