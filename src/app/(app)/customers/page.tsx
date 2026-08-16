import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageCustomers } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getApprovedRecordsSorted } from "@/lib/records";
import { computeIncentiveData } from "@/lib/incentives";
import { currentWeekKey } from "@/lib/week";
import { getWeeklyIncentiveSettings } from "@/lib/settings";
import AddCustomerButton from "@/components/customers/AddCustomerButton";
import CustomerNameDetail from "@/components/customers/CustomerNameDetail";
import CustomerPricingEditor from "@/components/customers/CustomerPricingEditor";
import DeleteCustomerButton from "@/components/customers/DeleteCustomerButton";
import WeeklyMailGenerator from "@/components/customers/WeeklyMailGenerator";
import { formatMoney } from "@/lib/money";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  const [customers, approvedRecords, weeklySettings] = await Promise.all([
    prisma.customer.findMany({ orderBy: { createdAt: "desc" } }),
    getApprovedRecordsSorted(),
    getWeeklyIncentiveSettings(),
  ]);
  const { customerWeekly, customerYearly } = computeIncentiveData(approvedRecords);
  const wk = currentWeekKey();
  const year = new Date().getFullYear();
  const canSetPricing = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canDelete = user?.role === "SUPER_ADMIN";

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Customers</h1>
          <div className="sub">Added by Admin Staff or Admin. Click a name for phone/address/email. Incentives &amp; weekly mail tracked here.</div>
        </div>
        {user && canManageCustomers(user.role) && <AddCustomerButton canSetPricing={canSetPricing} />}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Price/bag (truck deliveries)</th>
                <th>Weekly bags</th>
                <th>Yearly bags</th>
                <th>Bonus status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const wkBags = customerWeekly.get(c.id)?.[wk] ?? 0;
                const yrBags = customerYearly.get(c.id)?.[year] ?? 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <CustomerNameDetail
                        name={c.name}
                        email={c.email}
                        phone={c.phone}
                        address={c.address}
                        pricePerBag={c.pricePerBag}
                        weeklyBags={wkBags}
                        yearlyBags={yrBags}
                      />
                    </td>
                    <td>{c.phone || "—"}</td>
                    <td>
                      {canSetPricing ? (
                        <CustomerPricingEditor customerId={c.id} pricePerBag={c.pricePerBag} />
                      ) : (
                        <span>{c.pricePerBag > 0 ? `${formatMoney(c.pricePerBag)}/bag` : "—"}</span>
                      )}
                    </td>
                    <td>{wkBags}</td>
                    <td>{yrBags}</td>
                    <td>
                      {wkBags >= weeklySettings.customerWeeklyThreshold ? (
                        <span className="pill approved">+{weeklySettings.customerWeeklyBonus} bonus qualified</span>
                      ) : (
                        <span className="pill pending">below threshold</span>
                      )}
                    </td>
                    <td>{canDelete && <DeleteCustomerButton id={c.id} name={c.name} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && <div className="empty">No customers added yet.</div>}
      </div>
      <WeeklyMailGenerator threshold={weeklySettings.customerWeeklyThreshold} bonus={weeklySettings.customerWeeklyBonus} />
    </div>
  );
}
