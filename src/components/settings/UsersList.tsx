"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDailyRecordApprover, promoteSuperAdmin, revokeSuperAdmin } from "@/app/(app)/settings/actions";
import { roleLabel } from "@/lib/roles";
import Modal from "@/components/ui/Modal";
import type { Role } from "@prisma/client";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  dailyRecordApprover: boolean;
  createdAt: Date;
  isPrimary: boolean;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

function SuperAdminAction({
  user,
  mode,
  onDone,
}: {
  user: UserRow;
  mode: "promote" | "revoke";
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setLoading(true);
    setError(null);
    const result = mode === "promote" ? await promoteSuperAdmin(user.id) : await revokeSuperAdmin(user.id);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    onDone();
  }

  return (
    <>
      <button
        className={`btn btn-sm ${mode === "promote" ? "btn-ghost" : "btn-reject"}`}
        style={{ padding: "6px 12px", fontSize: 12 }}
        onClick={() => setOpen(true)}
      >
        {mode === "promote" ? "Make Super Admin" : "Revoke Super Admin"}
      </button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title={mode === "promote" ? "Make Super Admin?" : "Revoke Super Admin?"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
            <p style={{ margin: 0 }}>
              {mode === "promote" ? (
                <>
                  <b>{user.name}</b> will get full Super Admin rights — every page, every setting, and the ability to
                  promote or approve anything in the system.
                </>
              ) : (
                <>
                  <b>{user.name}</b> will lose Super Admin rights and drop back to Admin. They&apos;ll keep normal
                  Admin access but no longer have Super Admin powers.
                </>
              )}
            </p>
            {error && <div className="field-error">{error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </button>
              <button
                className={`btn btn-sm ${mode === "promote" ? "btn-approve" : "btn-reject"}`}
                style={{ padding: "10px 18px" }}
                onClick={confirm}
                disabled={loading}
              >
                {loading ? "Working…" : mode === "promote" ? "Make Super Admin" : "Revoke Super Admin"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function UsersList({
  users,
  canAssign,
  isSeniorAdmin,
}: {
  users: UserRow[];
  canAssign: boolean;
  isSeniorAdmin: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggle(id: string, next: boolean) {
    setLoadingId(id);
    await setDailyRecordApprover(id, next);
    setLoadingId(null);
    router.refresh();
  }

  if (users.length === 0) {
    return <div className="empty">No users yet.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            {canAssign && <th>Approves daily records</th>}
            {canAssign && <th></th>}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                {u.role === "SUPER_ADMIN" ? (
                  <span className="badge-role">Super Admin</span>
                ) : (
                  <span className="badge-role">{roleLabel(u.role)}</span>
                )}
              </td>
              <td>{fmtDate(u.createdAt)}</td>
              {canAssign && (
                <td>
                  {u.role === "SUPER_ADMIN" ? (
                    <span style={{ color: "var(--text-faint)", fontSize: 12.5 }}>always (Super Admin)</span>
                  ) : u.role === "ADMIN" ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: loadingId === u.id ? "wait" : "pointer" }}>
                      <input
                        type="checkbox"
                        checked={u.dailyRecordApprover}
                        disabled={loadingId === u.id}
                        onChange={(e) => toggle(u.id, e.target.checked)}
                      />
                      <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>assigned</span>
                    </label>
                  ) : (
                    <span style={{ color: "var(--text-faint)", fontSize: 12.5 }}>—</span>
                  )}
                </td>
              )}
              {canAssign && (
                <td>
                  {u.role === "SUPER_ADMIN" ? (
                    isSeniorAdmin && !u.isPrimary ? (
                      <SuperAdminAction user={u} mode="revoke" onDone={() => router.refresh()} />
                    ) : null
                  ) : (
                    <SuperAdminAction user={u} mode="promote" onDone={() => router.refresh()} />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
