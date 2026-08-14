import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageDrivers, isApprover } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getApprovedRecordsSorted } from "@/lib/records";
import { computeIncentiveData } from "@/lib/incentives";
import { currentWeekKey } from "@/lib/week";
import Pill from "@/components/ui/Pill";
import AddDriverButton from "@/components/drivers/AddDriverButton";
import ApproveRejectButtons from "@/components/shared/ApproveRejectButtons";
import { approveDriver, rejectDriver } from "./actions";

export default async function DriversPage() {
  const user = await getCurrentUser();
  const [drivers, approvedRecords] = await Promise.all([
    prisma.driver.findMany({ include: { createdBy: true }, orderBy: { createdAt: "desc" } }),
    getApprovedRecordsSorted(),
  ]);
  const { driverWeekly } = computeIncentiveData(approvedRecords);
  const wk = currentWeekKey();
  const approver = user ? isApprover(user.role) : false;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Drivers</h1>
          <div className="sub">Added by Admin Staff, approved by Admin/Super Admin</div>
        </div>
        {user && canManageDrivers(user.role) && <AddDriverButton />}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
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
                    <td>{d.name}</td>
                    <td>{d.phone || "—"}</td>
                    <td>
                      {wkBags}
                      {wkBags >= 1000 ? " 🎉 +10 bonus" : ""}
                    </td>
                    <td>
                      <Pill status={d.status}>{d.status.toLowerCase()}</Pill>
                    </td>
                    <td>{d.createdBy.name}</td>
                    <td>
                      {approver && d.status === "PENDING" && (
                        <ApproveRejectButtons id={d.id} onApprove={approveDriver} onReject={rejectDriver} />
                      )}
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
