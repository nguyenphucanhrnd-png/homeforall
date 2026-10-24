// Proposed partners (prompt bundle §D): an explicit override of
// v4's "confirmed partners only". Nobody here is a partner or endorser.
// Only `status: "confirmed"` (with a date and a proof link in docs/SOURCES.md)
// may ever be called a partner. Copy lives in messages under `proposedPartners`.

export type ProposedPartner = {
  slug: "cocoon" | "farmina-pet-foods" | "msd-animal-health";
  name: string;
  status: "proposed" | "confirmed";
  /** A logo may be shown in production only when this AND status are "confirmed". */
  logoPermission: "none" | "confirmed";
  confirmedAt?: string;
  proofUrl?: string;
  sources: Array<{ label: string; url: string }>;
};

export const PROPOSED_PARTNERS: ProposedPartner[] = [
  {
    slug: "cocoon",
    name: "Cocoon",
    status: "proposed",
    logoPermission: "none",
    sources: [
      {
        label: "RMIT Vietnam case study",
        url: "https://www.rmit.edu.vn/about-us/who-we-are/our-commitments/vietnam-country-commitment/strategic-innovation-challenge/sustainability-hub-for-educators/case-studies/cocoon",
      },
    ],
  },
  {
    slug: "farmina-pet-foods",
    name: "Farmina Pet Foods",
    status: "proposed",
    logoPermission: "none",
    sources: [
      {
        label: "London Vet Show press release",
        url: "https://london.vetshow.com/press-release/farmina-pet-foods",
      },
    ],
  },
  {
    slug: "msd-animal-health",
    name: "MSD Animal Health",
    status: "proposed",
    logoPermission: "none",
    sources: [
      { label: "MSD Animal Health: About us", url: "https://www.msd-animal-health.com/about-us/" },
      {
        label: "Merck: Animal Health name",
        url: "https://www.merck.com/news/merck-announces-new-name-for-its-animal-health-division/",
      },
    ],
  },
];

/** Production shows a logo only for confirmed partners with confirmed permission; dev always shows it. */
export function mayShowLogo(p: ProposedPartner) {
  return (
    process.env.NODE_ENV !== "production" || (p.status === "confirmed" && p.logoPermission === "confirmed")
  );
}
