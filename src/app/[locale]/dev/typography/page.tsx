import { setRequestLocale } from "next-intl/server";
import { Fredoka } from "next/font/google";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import type { Locale } from "@/i18n/routing";

// Kept only to show why Fredoka was rejected: it ships no Vietnamese subset.
const fredoka = Fredoka({ subsets: ["latin", "latin-ext"], weight: ["500", "700"] });

const SAMPLE = "Ắ Ằ Ẳ Ẵ Ặ Ề Ể Ễ Ệ Ổ Ỗ Ộ Ờ Ở Ỡ Ợ Ữ Ự Ỳ Ỷ Ỹ Ỵ — Chung tay đưa thú cưng về mái ấm";
const HEADING_WEIGHTS = [500, 600, 700] as const;
const BODY_WEIGHTS = [400, 600, 700, 800] as const;

/** Prompt §5 Vietnamese glyph test. Not served in production. */
export default async function TypographyTestPage({ params }: PageProps<"/[locale]/dev/typography">) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_PAGES !== "true") notFound();
  setRequestLocale((await params).locale as Locale);

  return (
    <Container className="space-y-12 py-14" lang="vi">
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">Headings · Baloo 2</h1>
        {HEADING_WEIGHTS.map((w) => (
          <p key={w} className="font-heading text-4xl" style={{ fontWeight: w }} data-testid={`heading-${w}`}>
            <span className="me-4 text-sm text-muted">{w}</span>
            {SAMPLE}
          </p>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Body · Nunito</h2>
        {BODY_WEIGHTS.map((w) => (
          <p key={w} className="text-lg" style={{ fontWeight: w }} data-testid={`body-${w}`}>
            <span className="me-4 text-sm text-muted">{w}</span>
            {SAMPLE}
          </p>
        ))}
      </section>
      <section className="space-y-4 rounded-lg border-2 border-dashed border-border p-6">
        <h2 className="text-2xl font-bold">Rejected · Fredoka (no Vietnamese subset)</h2>
        <p className={`${fredoka.className} text-4xl`}>{SAMPLE}</p>
        <p className="text-muted">Mixed glyph shapes on tone-marked capitals = system fallback font.</p>
      </section>
    </Container>
  );
}
