import { z } from "zod";
import { COLLAR, CONDITIONS, REPORT_SPECIES, REPORT_TYPES } from "./model";

// Shared by the wizard (client) and the server action. Required besides the
// photo: species and a location (pin or ward), plus the consent tick.

const inCity = (v: number | null, min: number, max: number) => v === null || (v >= min && v <= max);

export const reportSchema = z
  .object({
    type: z.enum(REPORT_TYPES),
    species: z.enum(REPORT_SPECIES, { error: "required" }),
    condition: z.enum(CONDITIONS),
    bitten: z.boolean(),
    collar: z.enum(COLLAR),
    note: z.string().trim().max(280),
    seenAt: z.string().min(1, "required"),
    ward: z.string().trim().max(80).nullable(),
    landmark: z.string().trim().max(120),
    lat: z.number().nullable().refine((v) => inCity(v, 10.3, 11.4), "location"),
    lng: z.number().nullable().refine((v) => inCity(v, 106.3, 107.2), "location"),
    accuracyM: z.number().nonnegative().nullable(),
    recipients: z.array(z.string().max(40)).max(3),
    contactEnabled: z.boolean(),
    contact: z.string().trim().max(120),
    contactConsent: z.boolean(),
    consent: z.literal(true, { error: "consent" }),
    website: z.string().max(0), // honeypot: real people never fill it
  })
  .refine((v) => (v.lat !== null && v.lng !== null) || Boolean(v.ward), { path: ["ward"], message: "location" })
  .refine((v) => !v.contactEnabled || (v.contact.length > 3 && v.contactConsent), { path: ["contact"], message: "contact" });

export type ReportInput = z.input<typeof reportSchema>;
