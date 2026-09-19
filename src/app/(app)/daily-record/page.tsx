import { getCurrentUser } from "@/lib/auth-helpers";
import { isApprover, roleLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  getAllRecordsSorted,
  getArchivedRecordsSorted,
  recordProdTotal,
  recordSoldTotal,
  recordTruckDeliveryBagsTotal,
  type DailyRecordFull,
} from "@/lib/records";
import { latestClosingStock, latestLeakageClosing } from "@/lib/stock";
import { getPricingSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import Pill from "@/components/ui/Pill";
import RangeTabs from "@/components/ui/RangeTabs";
import AddDailyRecordButton from "@/components/daily-record/AddDailyRecordButton";
import ArchiveRecordsButton from "@/components/daily-record/ArchiveRecordsButton";
import DailyRecordDetail from "@/components/daily-record/DailyRecordDetail";
import EditDailyRecordButton from "@/components/daily-record/EditDailyRecordButton";
import DeleteDailyRecordButton from "@/components/daily-record/DeleteDailyRecordButton";
import ApproveRejectButtons from "@/components/shared/ApproveRejectButtons";
import ViewAllModal from "@/components/ui/ViewAllModal";
import { approveDailyRecord } from "../approvals/actions";

function fmtArchivedAt(d: Date) {
  return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

export default async function DailyRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "archived" ? "archived" : "active";
  const user = await getCurrentUser();
  const approver = user ? isApprover(user.role) : false;

  const [records, activeCount, drivers, customers, opening, leakageOpening, pricing] = await Promise.all([
    view === "archived" && approver ? getArchivedRecordsSorted() : getAllRecordsSorted(),
    prisma.dailyRecord.count({ where: { archivedAt: null } }),
    prisma.driver.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    latestClosingStock(),
    latestLeakageClosing(),
    getPricingSettings(),
  ]);
  const showingArchived = view === "archived" && approver;

  function recordRow(r: DailyRecordFull) {
    return (
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
        {showingArchived ? (
          <td style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
            {r.archivedBy?.name ?? "—"}
            {r.archivedAt && (
              <>
                <br />
                {fmtArchivedAt(r.archivedAt)}
              </>
            )}
          </td>
        ) : (
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
                rollsPricePerKg={pricing.rollsPricePerKg}
                packingBagsPricePerBundle={pricing.packingBagsPricePerBundle}
              />
            )}
            {approver && <DeleteDailyRecordButton id={r.id} date={r.date} status={r.status} />}
          </td>
        )}
      </tr>
    );
  }

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
          <th>{showingArchived ? "Archived by" : ""}</th>
        </tr>
      </thead>
      <tbody>{records.map(recordRow)}</tbody>
    </table>
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Daily Record</h1>
          <div className="sub">Opening stock, production, sales, leakages &amp; expenses for one day</div>
        </div>
        {!showingArchived && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {user?.role === "SUPER_ADMIN" && <ArchiveRecordsButton activeCount={activeCount} />}
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
              rollsPricePerKg={pricing.rollsPricePerKg}
              packingBagsPricePerBundle={pricing.packingBagsPricePerBundle}
            />
          </div>
        )}
      </div>
      {approver && (
        <RangeTabs
          basePath="/daily-record"
          current={view}
          paramName="view"
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
        />
      )}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <ViewAllModal title={showingArchived ? "All Archived Records" : "All Daily Records"}>{recordsTable}</ViewAllModal>
        </div>
        <div className="table-wrap">{recordsTable}</div>
        {records.length === 0 && (
          <div className="empty">
            {showingArchived
              ? "No archived records yet."
              : 'No daily records yet. Click "New daily entry" to log today\'s activity.'}
          </div>
        )}
      </div>
    </div>
  );
}
