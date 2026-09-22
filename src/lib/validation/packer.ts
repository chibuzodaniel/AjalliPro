import { z } from "zod";

export const packerPhoneSchema = z.object({
  phone: z.string().trim().optional(),
});

export type PackerPhoneInput = z.infer<typeof packerPhoneSchema>;

export const packerSmsSchema = z.object({
  message: z.string().trim().min(1, "Enter a message").max(1000, "Message is too long (max 1000 characters)"),
});

export type PackerSmsInput = z.infer<typeof packerSmsSchema>;
