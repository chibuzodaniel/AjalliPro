"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDailyRecordApprover } from "@/app/(app)/settings/actions";

interface AdminRow {
  id: string;
  name: string;
  email: string;
  dailyRecordApprover: boolean;
}

export default function DailyRecordApproverEditor({ admins }: { admins: AdminRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggle(id: string, next: boolean) {
    setLoadingId(id);
    await setDailyRecordApprover(id, next);
    setLoadingId(null);
    router.refresh();
  }

  if (admins.length === 0) {
    return <div className="empty">No Admin accounts yet — only Super Admin will be notified.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {admins.map((a) => (
        <label
          key={a.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13.5,
            padding: "9px 0",
            borderBottom: "1px solid var(--border)",
            cursor: loadingId === a.id ? "wait" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={a.dailyRecordApprover}
            disabled={loadingId === a.id}
            onChange={(e) => toggle(a.id, e.target.checked)}
          />
          <span>
            <b>{a.name}</b> <span style={{ color: "var(--text-faint)" }}>({a.email})</span>
          </span>
        </label>
      ))}
    </div>
  );
}
