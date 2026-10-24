import { z } from "zod";

// "Tôi có thể nuôi tạm" (journey F1): species, size, duration, ward, start date, contact — ≤ 1 minute.

const VN_PHONE = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

export const FOSTER_SPECIES = ["cat", "dog", "any"] as const;
export const FOSTER_SIZES = ["small", "medium", "large"] as const;
export const FOSTER_DURATIONS = ["under2w", "2to8w", "over2m"] as const;

export const fosterOfferSchema = z.object({
  species: z.enum(FOSTER_SPECIES, { error: "required" }),
  sizes: z.array(z.enum(FOSTER_SIZES)).min(1, "required"),
  duration: z.enum(FOSTER_DURATIONS, { error: "required" }),
  ward: z.string().trim().min(2, "required").max(80),
  from: z.iso.date({ error: "required" }),
  contact: z
    .string()
    .trim()
    .min(1, "required")
    .refine((v) => VN_PHONE.test(v.replace(/[\s.-]/g, "")) || z.email().safeParse(v).success, "contact"),
  consent: z.literal(true, { error: "consent" }),
});

export type FosterOfferInput = z.input<typeof fosterOfferSchema>;
