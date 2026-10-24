import { z } from "zod";

// Express interest (journey A3, stage 1): ≤ 6 fields, about a minute.
// Error messages are i18n keys under "interest.errors".

const VN_PHONE = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

export const CONTACT_METHODS = ["zalo", "phone", "email"] as const;
export const EXPERIENCE = ["none", "past", "now"] as const;

export const interestSchema = z
  .object({
    petCode: z.string().regex(/^HFA-\d{4,}$/),
    name: z.string().trim().min(2, "required").max(80),
    contactMethod: z.enum(CONTACT_METHODS, { error: "required" }),
    contactValue: z.string().trim().min(1, "required").max(254),
    ward: z.string().trim().min(2, "required").max(80),
    experience: z.enum(EXPERIENCE, { error: "required" }),
    motivation: z.string().trim().max(500).optional(),
    // Unticked by default; must be explicitly ticked (PDPL consent, prompt §11).
    consent: z.literal(true, { error: "consent" }),
  })
  // `when`: run even if *other* fields are still invalid, so a bad number shows
  // on the first submit instead of after everything else is fixed.
  .superRefine(
    (v, ctx) => {
      if (v.contactMethod === "email") {
        if (!z.email().safeParse(v.contactValue).success) {
          ctx.addIssue({ code: "custom", path: ["contactValue"], message: "email" });
        }
      } else if (!VN_PHONE.test(v.contactValue.replace(/[\s.-]/g, ""))) {
        ctx.addIssue({ code: "custom", path: ["contactValue"], message: "phone" });
      }
    },
    {
      when: ({ issues }) =>
        !issues.some((i) => i.path?.[0] === "contactMethod" || i.path?.[0] === "contactValue"),
    },
  );

export type InterestInput = z.input<typeof interestSchema>;
