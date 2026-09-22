import { z } from "zod";

export const announcementAudienceSchema = z.enum(["STAFF", "DRIVERS", "CUSTOMERS", "PACKERS", "INDIVIDUAL"]);
export const announcementIndividualTypeSchema = z.enum(["STAFF", "DRIVER", "CUSTOMER", "PACKER"]);

export const announcementSchema = z.object({
  audience: announcementAudienceSchema,
  individualType: announcementIndividualTypeSchema.optional(),
  individualId: z.string().optional(),
  message: z.string().trim().min(1, "Enter a message").max(1000, "Message is too long (max 1000 characters)"),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
