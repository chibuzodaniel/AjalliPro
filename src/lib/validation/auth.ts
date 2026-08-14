import { z } from "zod";

export const SELECTABLE_ROLES = ["SALES_STAFF", "EDITOR", "ADMIN_STAFF", "ADMIN"] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(SELECTABLE_ROLES),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
