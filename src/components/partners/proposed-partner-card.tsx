import "server-only";
import { ExternalLink } from "lucide-react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { mayShowLogo, PROPOSED_PARTNERS, type ProposedPartner } from "@/lib/partners/proposed";

type LogoEntry = { file: string; width: number | null; height: number | null };

function logoManifest(): Record<string, LogoEntry> {
  const file = join(process.cwd(), "public/assets/partners/manifest.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

/** Plain white tile, object-fit: contain, max 160×64; the brand name as text when no logo may be shown. */
function Logo({ partner, alt, logo }: { partner: ProposedPartner; alt: string; logo?: LogoEntry }) {
  return (
    <div className="flex h-20 w-full items-center justify-center rounded-md bg-white px-4 ring-1 ring-border">
      {logo && mayShowLogo(partner) ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny local logo; never recoloured or cropped
        <img
          src={logo.file}
          alt={alt}
          width={logo.width ?? 160}
          height={logo.height ?? 64}
          data-partner-logo={partner.slug}
          className="max-h-16 w-auto max-w-[160px] object-contain"
        />
      ) : (
        <span data-partner-name={partner.slug} className="font-heading text-2xl font-bold text-ink">
          {partner.name}
        </span>
      )}
    </div>
  );
}

export async function ProposedPartnerCards({
  locale,
  compact = false,
  heading = false,
  className,
}: {
  locale: Locale;
  compact?: boolean;
  /** Render the "Đối tác đề xuất" heading (h3) above the cards. */
  heading?: boolean;
  className?: string;
}) {
  const t = await getTranslations({ locale, namespace: "proposedPartners" });
  const logos = logoManifest();

  return (
    <div className={cn("space-y-4", className)}>
      {heading && <h3 className="text-2xl font-bold text-blue-800">{t("title")}</h3>}
      <ul className={cn("grid gap-5", compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3")}>
        {PROPOSED_PARTNERS.map((p) => (
          <li
            key={p.slug}
            data-testid="proposed-partner"
            className="flex flex-col gap-3 rounded-lg bg-cream-50 p-5 ring-1 ring-border"
          >
            <Logo partner={p} alt={t("logoAlt", { brand: p.name })} logo={logos[p.slug]} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl font-bold">{p.name}</h3>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-orange-700 ring-1 ring-orange-500/50">
                {t("badge")}
              </span>
            </div>
            {!compact && <p className="text-sm">{t(`${p.slug}.about`)}</p>}
            <p className="text-sm">
              <strong>{t("proposalLabel")}</strong> {t(`${p.slug}.proposal`)}
            </p>
            <p className="mt-auto flex flex-wrap gap-x-3 text-xs">
              {p.sources.map((s, i) => (
                <a
                  key={s.url}
                  href={s.url}
                  rel="noopener"
                  className="inline-flex items-center gap-1 font-semibold"
                >
                  {t("sourceLabel")}
                  {p.sources.length > 1 ? ` ${i + 1}` : ""}
                  <ExternalLink aria-hidden="true" className="size-3" />
                </a>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
