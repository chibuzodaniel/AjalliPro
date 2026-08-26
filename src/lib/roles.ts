import type { Role } from "@prisma/client";

export function isApprover(role: Role): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
export function isSuperAdmin(role: Role): boolean {
  return role === "SUPER_ADMIN";
}
export function canManageDrivers(role: Role): boolean {
  return role === "ADMIN_STAFF" || isApprover(role);
}
export function canManageCustomers(role: Role): boolean {
  return role === "ADMIN_STAFF" || isApprover(role);
}
export function canViewExpenses(role: Role): boolean {
  return role === "ADMIN_STAFF" || isApprover(role);
}
export function needsApproval(role: Role): boolean {
  return !isApprover(role);
}

/**
 * Daily record approvals are further restricted beyond isApprover: Super
 * Admin always has access; a plain Admin only does if Super Admin has
 * specifically assigned them (User.dailyRecordApprover). Callers must pass
 * a freshly-fetched dailyRecordApprover value — it isn't in the JWT session
 * since Super Admin can toggle it at any time and the effect should be
 * immediate, not wait for re-login.
 */
export function canApproveDailyRecords(role: Role, dailyRecordApprover: boolean): boolean {
  return role === "SUPER_ADMIN" || (role === "ADMIN" && dailyRecordApprover);
}

/**
 * Same audience as isApprover for now. Originally also included Editor
 * (visibility without action rights) but that role is disabled for now —
 * re-add `role === "EDITOR" ||` below if it comes back.
 */
export function canReview(role: Role): boolean {
  return isApprover(role);
}

/**
 * Super Admin is a hidden role — never shown in the UI, so the person
 * just reads as themselves by name, not tagged with a role.
 */
export function roleLabel(role: Role): string {
  if (role === "SUPER_ADMIN") return "";
  return role
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}
