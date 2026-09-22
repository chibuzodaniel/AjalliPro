"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setStaffPayrollEnabled } from "@/app/(app)/salary/actions";

export default function PayrollToggle({ userId, enabled }: { userId: string; enabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optimistic: router.refresh() can take a few seconds against this app's
  // real-world DB latency, so reflect a successful toggle immediately.
  const [override, setOverride] = useState<boolean | null>(null);
  const checked = override ?? enabled;

  async function toggle(next: boolean) {
    setLoading(true);
    setError(null);
    try {
      const result = await setStaffPayrollEnabled(userId, next);
      if (!result.ok) {
        setError(result.error ?? "Could not update");
        return;
      }
      setOverride(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: loading ? "wait" : "pointer" }}>
        <input type="checkbox" checked={checked} disabled={loading} onChange={(e) => toggle(e.target.checked)} />
        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{checked ? "On payroll" : "Not on payroll"}</span>
      </label>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
