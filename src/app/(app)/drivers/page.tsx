import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageDrivers, isApprover } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getApprovedRecordsSorted } from "@/lib/records";
import { computeIncentiveData } from "@/lib/incentives";
import { currentWeekKey } from "@/lib/week";
import { getWeeklyIncentiveSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import Pill from "@/components/ui/Pill";
import AddDriverButton from "@/components/drivers/AddDriverButton";
import DriverPricingEditor from "@/components/drivers/DriverPricingEditor";
import DriverNameDetail from "@/components/drivers/DriverNameDetail";
import DeleteDriverButton from "@/components/drivers/DeleteDriverButton";
import ApproveRejectButtons from "@/components/shared/ApproveRejectButtons";
import { approveDriver, rejectDriver } from "./actions";

export default async function DriversPage() {
  const user = await getCurrentUser();
  const [drivers, approvedRecords, weeklySettings] = await Promise.all([
    prisma.driver.findMany({ include: { createdBy: true }, orderBy: { createdAt: "desc" } }),
    getApprovedRecordsSorted(),
    getWeeklyIncentiveSettings(),
  ]);
  const { driverWeekly } = computeIncentiveData(approvedRecords);
  const wk = currentWeekKey();
  const approver = user ? isApprover(user.role) : false;
  const canSetPricing = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canDelete = user?.role === "SUPER_ADMIN";

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Drivers</h1>
          <div className="sub">Added by Admin Staff, approved by Admin/Super Admin</div>
        </div>
        {user && canManageDrivers(user.role) && <AddDriverButton canSetPricing={canSetPricing} />}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Price/bag &amp; loading fee/bag</th>
                <th>Weekly bags</th>
                <th>Status</th>
                <th>Added by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => {
                const wkBags = driverWeekly.get(d.id)?.[wk] ?? 0;
                return (
                  <tr key={d.id}>
                    <td>
                      <DriverNameDetail
                        name={d.name}
                        phone={d.phone}
                        pricePerBag={d.pricePerBag}
                        loadingFee={d.loadingFee}
                        status={d.status}
                        weeklyBags={wkBags}
                      />
                    </td>
                    <td>{d.phone || "—"}</td>
                    <td>
                      {canSetPricing ? (
                        <DriverPricingEditor driverId={d.id} pricePerBag={d.pricePerBag} loadingFee={d.loadingFee} />
                      ) : (
                        <span>
                          {formatMoney(d.pricePerBag)}/bag + {formatMoney(d.loadingFee)}/bag loading
                        </span>
                      )}
                    </td>
                    <td>
                      {wkBags}
                      {wkBags >= weeklySettings.driverWeeklyThreshold
                        ? ` 🎉 +${weeklySettings.driverWeeklyBonus} bonus`
                        : ""}
                    </td>
                    <td>
                      <Pill status={d.status}>{d.status.toLowerCase()}</Pill>
                    </td>
                    <td>{d.createdBy.name}</td>
                    <td style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {approver && d.status === "PENDING" && (
                        <ApproveRejectButtons id={d.id} onApprove={approveDriver} onReject={rejectDriver} />
                      )}
                      {canDelete && <DeleteDriverButton id={d.id} name={d.name} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {drivers.length === 0 && <div className="empty">No drivers added yet.</div>}
      </div>
    </div>
  );
}
