"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { NAV_SECTIONS } from "./nav";
import PushSubscribeButton from "./PushSubscribeButton";
import PushToastListener from "./PushToastListener";

interface ShellUser {
  name: string;
  role: string;
}

function roleLabel(role: string) {
  if (role === "SUPER_ADMIN") return "";
  return role
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

function isApprover(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function canReview(role: string) {
  // Editor disabled for now — was: role === "EDITOR" || isApprover(role)
  return isApprover(role);
}

export default function AppShell({
  user,
  pendingApprovalCount,
  pushEnabled,
  children,
}: {
  user: ShellUser;
  pendingApprovalCount: number;
  pushEnabled?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {pushEnabled && <PushToastListener />}
      <div className="mobile-header">
        <div className="mh-brand">
          <div className="logo">CI</div>
          <span>Cusica ERP</span>
        </div>
        <button className="hamburger-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          ☰
        </button>
      </div>
      <div className={`sidebar-overlay ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <div className="shell">
        <div className={`sidebar ${open ? "open" : ""}`}>
          <div className="sb-brand">
            <div className="logo">CI</div>
            <div>
              <h2>Cusica ERP</h2>
              <span>Ajalli Table Water</span>
            </div>
          </div>

          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => {
              if (item.hiddenFromSalesStaff && user.role === "SALES_STAFF") return false;
              if (item.superAdminOnly) return user.role === "SUPER_ADMIN";
              if (item.approverOnly) return isApprover(user.role);
              if (item.reviewerOnly) return canReview(user.role);
              if (item.staffOrAboveOnly) return user.role === "ADMIN_STAFF" || isApprover(user.role);
              return true;
            });
            if (!visibleItems.length) return null;
            return (
              <div key={section.section}>
                <div className="sb-section">{section.section}</div>
                {visibleItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="ic">{item.icon}</span>
                    {item.label}
                    {item.badge && pendingApprovalCount > 0 && (
                      <span className="nav-badge">{pendingApprovalCount}</span>
                    )}
                  </Link>
                ))}
              </div>
            );
          })}

          {pushEnabled && (
            <div style={{ marginBottom: 4 }}>
              <PushSubscribeButton />
            </div>
          )}

          <div className="sb-user">
            <div className="avatar">{initials}</div>
            <div className="sb-user-info">
              <div className="nm">{user.name}</div>
              {roleLabel(user.role) && <div className="rl">{roleLabel(user.role)}</div>}
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Log out">
              🚪
            </button>
          </div>
        </div>

        <div className="main">{children}</div>
      </div>
    </>
  );
}
