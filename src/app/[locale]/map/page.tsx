import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** /map became /network (prompt bundle §B). Keep old links working. */
export default async function MapRedirect({ params }: PageProps<"/[locale]/map">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  redirect({ href: "/network", locale });
}
