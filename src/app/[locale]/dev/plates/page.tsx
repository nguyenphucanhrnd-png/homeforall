import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import type { Locale } from "@/i18n/routing";
import { getPlateSources } from "@/world/plate-sources";
import { PlatesLab } from "./plates-lab";

/** Dev-only plate inspector (v4 §6 / design-refs CLAUDE_CODE_PROMPT §5). Not served in production. */
export default async function DevPlatesPage({ params }: PageProps<"/[locale]/dev/plates">) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_PAGES !== "true") notFound();
  setRequestLocale((await params).locale as Locale);
  return (
    <Container className="space-y-6 py-10">
      <h1 className="text-4xl font-bold text-blue-800">/dev/plates</h1>
      <PlatesLab sources={getPlateSources()} />
    </Container>
  );
}
