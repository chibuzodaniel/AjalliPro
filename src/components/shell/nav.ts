export interface NavItem {
  href: string;
  label: string;
  icon: string;
  approverOnly?: boolean;
  reviewerOnly?: boolean;
  superAdminOnly?: boolean;
  staffOrAboveOnly?: boolean;
  hiddenFromSalesStaff?: boolean;
  badge?: boolean;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    section: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "📊" }],
  },
  {
    section: "Operations",
    items: [
      { href: "/daily-record", label: "Daily Record", icon: "📝" },
      { href: "/production", label: "Total Produced", icon: "🏭", hiddenFromSalesStaff: true },
      { href: "/packers", label: "Packers", icon: "📦", hiddenFromSalesStaff: true },
      { href: "/drivers", label: "Drivers", icon: "🚚", hiddenFromSalesStaff: true },
      { href: "/customers", label: "Customers", icon: "👥", hiddenFromSalesStaff: true },
      { href: "/incentives", label: "Incentive Tracking", icon: "🎁", hiddenFromSalesStaff: true },
    ],
  },
  {
    section: "Governance",
    items: [
      { href: "/approvals", label: "Approvals", icon: "✅", reviewerOnly: true, badge: true },
      { href: "/expenses", label: "Expenses", icon: "💸", staffOrAboveOnly: true },
      { href: "/reports", label: "Reports", icon: "📈", hiddenFromSalesStaff: true },
      { href: "/settings", label: "Settings", icon: "⚙️", approverOnly: true },
    ],
  },
];
