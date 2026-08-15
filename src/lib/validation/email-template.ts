import { z } from "zod";

export const emailTemplateSettingsSchema = z.object({
  subject: z.string().trim().min(1, "Subject can't be empty").max(200),
  introText: z.string().trim().min(1, "Intro text can't be empty").max(1000),
  signatureText: z.string().trim().min(1, "Signature can't be empty").max(1000),
});

export type EmailTemplateSettingsInput = z.infer<typeof emailTemplateSettingsSchema>;
