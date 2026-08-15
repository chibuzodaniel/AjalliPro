import { getCurrentUser } from "@/lib/auth-helpers";
import { isApprover } from "@/lib/roles";
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
import ApproveRejectButtons from "@/components/shared/ApproveRejectButtons";
import { approveDailyRecord } from "../approvals/actions";

export default async function DailyRecordPage() {
  const user = await getCurrentUser();
  const [records, drivers, customers, opening, leakageOpening, pricing, tiers] = await Promise.all([
    getAllRecordsSorted(),
    prisma.driver.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    latestClosingStock(),
    latestLeakageClosing(),
    getPricingSettings(),
    prisma.incentiveTier.findMany({ orderBy: { min: "asc" } }),
  ]);
  const approver = user ? isApprover(user.role) : false;

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
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          incentiveTiers={tiers.map((t) => ({ min: t.min, max: t.max, bonus: t.bonus }))}
          canEditOpeningStock={user?.role === "SUPER_ADMIN"}
          factoryPricePerBag={pricing.factoryPricePerBag}
          canEditFactoryPrice={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"}
        />
      </div>
      <div className="card">
        <div className="table-wrap">
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
                  <td>{r.date}</td>
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
                    <br />
                    <span className="badge-role">{r.createdByRole}</span>
                  </td>
                  <td>
                    {approver && r.status === "PENDING" && (
                      <ApproveRejectButtons id={r.id} onApprove={approveDailyRecord} approveOnly />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {records.length === 0 && (
          <div className="empty">No daily records yet. Click &quot;New daily entry&quot; to log today&apos;s activity.</div>
        )}
      </div>
    </div>
  );
}
