import { prisma } from "@/lib/prisma";
import { recordSoldTotal, recordProdTotal, dailyRecordInclude } from "@/lib/records";
import { roleLabel } from "@/lib/roles";
import ApproveRejectButtons from "@/components/shared/ApproveRejectButtons";
import { approveDailyRecord, rejectDailyRecord } from "./actions";
import { approveDriver, rejectDriver } from "../drivers/actions";

export default async function ApprovalsPage() {
  const [pendingRecords, pendingDrivers] = await Promise.all([
    prisma.dailyRecord.findMany({
      where: { status: "PENDING" },
      include: dailyRecordInclude,
      orderBy: { date: "desc" },
    }),
    prisma.driver.findMany({
      where: { status: "PENDING" },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Approvals</h1>
          <div className="sub">Entries by Sales Staff, Editors &amp; Admin Staff wait here until Admin/Super Admin approves</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Pending daily records</div>
        <div className="table-wrap">
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
                    <td>{r.date}</td>
                    <td>{r.createdBy.name}</td>
                    <td>
                      {roleLabel(r.createdByRole) && <span className="badge-role">{roleLabel(r.createdByRole)}</span>}
                    </td>
                    <td>
                      {net >= 0 ? "+" : ""}
                      {net} bags
                    </td>
                    <td>
                      <ApproveRejectButtons id={r.id} onApprove={approveDailyRecord} onReject={rejectDailyRecord} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pendingRecords.length === 0 && <div className="empty">Nothing pending here.</div>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">Pending drivers</div>
        <div className="table-wrap">
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
                  <td>{d.name}</td>
                  <td>{d.phone || "—"}</td>
                  <td>{d.createdBy.name}</td>
                  <td>
                    <ApproveRejectButtons id={d.id} onApprove={approveDriver} onReject={rejectDriver} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pendingDrivers.length === 0 && <div className="empty">Nothing pending here.</div>}
      </div>
    </div>
  );
}
