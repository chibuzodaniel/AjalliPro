import { z } from "zod";

export const smsTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(100),
  body: z
    .string()
    .trim()
    .min(1, "Message body can't be empty")
    .max(1000, "Message is too long (max 1000 characters)"),
});

export type SmsTemplateInput = z.infer<typeof smsTemplateSchema>;
