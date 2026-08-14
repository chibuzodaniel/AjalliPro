"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface NotifItem {
  title: string;
  sub?: string | null;
  time?: string | null;
  pending: boolean;
  href?: string;
}

export default function NotificationBell({ items }: { items: NotifItem[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pendingCount = items.filter((i) => i.pending).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button className="notif-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔
        {pendingCount > 0 && <span className="notif-badge">{pendingCount}</span>}
      </button>
      <div className={`notif-dropdown ${open ? "show" : ""}`}>
        <div className="notif-head">
          <span>Notifications</span>
          <button className="notif-clear" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <div>
          {items.length === 0 ? (
            <div className="empty">No notifications yet</div>
          ) : (
            items.map((item, i) =>
              item.href ? (
                <Link
                  key={i}
                  href={item.href}
                  className={`notif-item ${item.pending ? "pending-item" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="ni-title">{item.title}</span>
                  {item.sub && <span className="ni-time">{item.sub}</span>}
                  {item.time && <span className="ni-time">{item.time}</span>}
                </Link>
              ) : (
                <div key={i} className={`notif-item ${item.pending ? "pending-item" : ""}`}>
                  <span className="ni-title">{item.title}</span>
                  {item.sub && <span className="ni-time">{item.sub}</span>}
                  {item.time && <span className="ni-time">{item.time}</span>}
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
