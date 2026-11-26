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
import { getPricingSettings, getPackingBagTypes } from "@/lib/settings";
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
import WorkFreeDaysManager from "@/components/daily-record/WorkFreeDaysManager";
import TrashedRecordsList, {
  type TrashedRecordRow,
  type RestoredRecordRow,
} from "@/components/daily-record/TrashedRecordsList";
import { approveDailyRecord } from "../approvals/actions";

type SnapshotRows = {
  createdById?: string;
  factoryBags?: number;
  productionLines?: { bags?: number }[];
  driverSales?: { bags?: number }[];
  truckDeliveries?: { bags?: number }[];
};

async function loadTrashRows(): Promise<TrashedRecordRow[]> {
  const trashed = await prisma.trashedDailyRecord.findMany({
    where: { restoredAt: null },
    orderBy: { deletedAt: "desc" },
    include: { deletedBy: { select: { name: true } } },
  });
  const snaps = trashed.map((t) => t.snapshot as unknown as SnapshotRows);
  const creatorIds = [...new Set(snaps.map((s) => s.createdById).filter((id): id is string => !!id))];
  const creators = await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } });
  const nameById = new Map(creators.map((u) => [u.id, u.name]));
  const sum = (rows: { bags?: number }[] | undefined) => (rows ?? []).reduce((s, r) => s + (r.bags ?? 0), 0);
  return trashed.map((t, i) => {
    const snap = snaps[i];
    return {
      id: t.id,
      date: t.date,
      status: t.status,
      produced: sum(snap.productionLines),
      sold: (snap.factoryBags ?? 0) + sum(snap.driverSales) + sum(snap.truckDeliveries),
      createdByName: (snap.createdById && nameById.get(snap.createdById)) || "—",
      deletedByName: t.deletedBy.name,
      deletedAt: t.deletedAt.toISOString(),
      effects: Array.isArray(t.effects) ? (t.effects as string[]) : [],
    };
  });
}

const asStrings = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

async function loadRestoredRows(): Promise<RestoredRecordRow[]> {
  const rows = await prisma.trashedDailyRecord.findMany({
    where: { restoredAt: { not: null } },
    orderBy: { restoredAt: "desc" },
    take: 50,
    include: { deletedBy: { select: { name: true } }, restoredBy: { select: { name: true } } },
  });
  return rows.map((t) => ({
    id: t.id,
    date: t.date,
    deletedByName: t.deletedBy.name,
    deletedAt: t.deletedAt.toISOString(),
    restoredByName: t.restoredBy?.name ?? "—",
    restoredAt: t.restoredAt!.toISOString(),
    restoredItems: asStrings(t.restoredItems),
    notRestoredItems: asStrings(t.notRestoredItems),
  }));
}

function fmtArchivedAt(d: Date) {
  return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

export default async function DailyRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "archived" ? "archived" : sp.view === "trash" ? "trash" : "active";
  const user = await getCurrentUser();
  const approver = user ? isApprover(user.role) : false;
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [records, activeCount, drivers, customers, bankAccounts, packers, opening, leakageOpening, pricing, packingBagTypes, workFreeDays] =
    await Promise.all([
      view === "archived" && approver ? getArchivedRecordsSorted() : getAllRecordsSorted(),
      prisma.dailyRecord.count({ where: { archivedAt: null } }),
      prisma.driver.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }),
      prisma.customer.findMany({ orderBy: { name: "asc" } }),
      prisma.bankAccount.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
      prisma.packer.findMany({ orderBy: { name: "asc" } }),
      latestClosingStock(),
      latestLeakageClosing(),
      getPricingSettings(),
      getPackingBagTypes(),
      isAdmin
        ? prisma.workFreeDay.findMany({ orderBy: { date: "desc" }, take: 60, include: { createdBy: { select: { name: true } } } })
        : Promise.resolve([]),
    ]);
  const showingArchived = view === "archived" && approver;
  const showingTrash = view === "trash" && approver;
  const [trashRows, restoredRows] = showingTrash
    ? await Promise.all([loadTrashRows(), loadRestoredRows()])
    : [[], []];

  function recordRow(r: DailyRecordFull) {
    return (
      <tr key={r.id}>
        <td>
          <DailyRecordDetail record={r} isAdmin={isAdmin} isSuperAdmin={user?.role === "SUPER_ADMIN"} />
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
          {r.lastEditedBy && (
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>
              edited by {r.lastEditedBy.name}
              {r.lastEditedAt ? ` · ${fmtArchivedAt(r.lastEditedAt)}` : ""}
            </div>
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
                bankAccounts={bankAccounts}
                packers={packers.map((p) => ({ id: p.id, name: p.name }))}
                canEditOpeningStock={user?.role === "SUPER_ADMIN"}
                canEditFactoryPrice={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"}
                canEditLeakageOpening={user?.role === "SUPER_ADMIN"}
                packerPricePerBag={pricing.packerPricePerBag}
                truckLoadingFeePerBag={pricing.truckLoadingFeePerBag}
                truckOffloadingFeePerBag={pricing.truckOffloadingFeePerBag}
                truckHiredCostPerBag={pricing.truckHiredCostPerBag}
                rollsPricePerKg={pricing.rollsPricePerKg}
                packingBagTypes={packingBagTypes}
              />
            )}
            {approver && (r.status !== "APPROVED" || user?.role === "SUPER_ADMIN") && (
              <DeleteDailyRecordButton id={r.id} date={r.date} status={r.status} labelled />
            )}
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
        {!showingArchived && !showingTrash && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {user?.role === "SUPER_ADMIN" && <ArchiveRecordsButton activeCount={activeCount} />}
            <AddDailyRecordButton
              openingStock={opening}
              leakageOpening={leakageOpening}
              drivers={drivers.map((d) => ({ id: d.id, name: d.name, pricePerBag: d.pricePerBag, loadingFee: d.loadingFee }))}
              customers={customers.map((c) => ({ id: c.id, name: c.name, pricePerBag: c.pricePerBag }))}
              bankAccounts={bankAccounts}
              packers={packers.map((p) => ({ id: p.id, name: p.name }))}
              canEditOpeningStock={user?.role === "SUPER_ADMIN"}
              factoryPricePerBag={pricing.factoryPricePerBag}
              canEditFactoryPrice={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"}
              canEditLeakageOpening={user?.role === "SUPER_ADMIN"}
              packerPricePerBag={pricing.packerPricePerBag}
              truckLoadingFeePerBag={pricing.truckLoadingFeePerBag}
              truckOffloadingFeePerBag={pricing.truckOffloadingFeePerBag}
              truckHiredCostPerBag={pricing.truckHiredCostPerBag}
              rollsPricePerKg={pricing.rollsPricePerKg}
              packingBagTypes={packingBagTypes}
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
            { value: "trash", label: "Trash" },
          ]}
        />
      )}
      {showingTrash ? (
        <TrashedRecordsList rows={trashRows} restored={restoredRows} canPurge={user?.role === "SUPER_ADMIN"} />
      ) : (
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
      )}
      {isAdmin && !showingArchived && !showingTrash && (
        <WorkFreeDaysManager
          days={workFreeDays.map((d) => ({ id: d.id, date: d.date, reason: d.reason, createdByName: d.createdBy.name }))}
        />
      )}
    </div>
  );
}
