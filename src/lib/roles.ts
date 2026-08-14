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
