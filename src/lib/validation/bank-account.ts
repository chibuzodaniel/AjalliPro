import { z } from "zod";

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(1, "Bank name is required").max(100),
  accountName: z.string().trim().min(1, "Account name is required").max(150),
  accountNumber: z
    .string()
    .trim()
    .min(1, "Account number is required")
    .max(30)
    .regex(/^[0-9]+$/, "Account number should contain digits only"),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
