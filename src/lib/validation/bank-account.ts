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
  startingBalance: z.number().int().min(0).default(0),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;

export const bankAccountExpenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(200),
  amount: z.number().int().min(1, "Enter an amount"),
});

export type BankAccountExpenseInput = z.infer<typeof bankAccountExpenseSchema>;
