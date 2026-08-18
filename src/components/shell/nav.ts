export interface NavItem {
  href: string;
  label: string;
  icon: string;
  approverOnly?: boolean;
  reviewerOnly?: boolean;
  superAdminOnly?: boolean;
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
      { href: "/production", label: "Total Produced", icon: "🏭" },
      { href: "/packers", label: "Packers", icon: "📦" },
      { href: "/drivers", label: "Drivers", icon: "🚚" },
      { href: "/customers", label: "Customers", icon: "👥" },
      { href: "/incentives", label: "Incentive Tracking", icon: "🎁" },
    ],
  },
  {
    section: "Governance",
    items: [
      { href: "/approvals", label: "Approvals", icon: "✅", reviewerOnly: true, badge: true },
      { href: "/expenses", label: "Expenses", icon: "💸", approverOnly: true },
      { href: "/reports", label: "Reports", icon: "📈" },
      { href: "/settings", label: "Settings", icon: "⚙️", approverOnly: true },
    ],
  },
];
