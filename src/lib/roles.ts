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
export function needsApproval(role: Role): boolean {
  return !isApprover(role);
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
