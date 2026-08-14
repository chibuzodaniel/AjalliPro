export interface NavItem {
  href: string;
  label: string;
  icon: string;
  approverOnly?: boolean;
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
      { href: "/drivers", label: "Drivers", icon: "🚚" },
      { href: "/customers", label: "Customers", icon: "👥" },
      { href: "/incentives", label: "Incentive Tracking", icon: "🎁" },
    ],
  },
  {
    section: "Governance",
    items: [
      { href: "/approvals", label: "Approvals", icon: "✅", approverOnly: true, badge: true },
      { href: "/reports", label: "Reports", icon: "📈" },
      { href: "/settings", label: "Settings", icon: "⚙️", superAdminOnly: true },
    ],
  },
];
