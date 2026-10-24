import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { SceneHeader } from "@/components/world/scene-header";
import type { Locale } from "@/i18n/routing";
import { safeNextPath } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "login" });
  return { title: t("title"), robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "login" });

  return (
    <>
      <SceneHeader route="/login" locale={locale} title={t("title")} />
      <Container className="relative pb-20">
        <div className="max-w-md space-y-6 rounded-lg bg-white p-10 shadow-lift">
          <p>{t("intro")}</p>
          {isSupabaseConfigured ? (
            <Suspense fallback={<LoginForm />}>
              <LoginFormWithParams searchParams={searchParams} linkInvalid={t("linkInvalid")} />
            </Suspense>
          ) : (
            <p role="status" className="rounded-md bg-cream-50 p-4 font-semibold text-warning">
              {t("notConfigured")}
            </p>
          )}
        </div>
      </Container>
    </>
  );
}

async function LoginFormWithParams({
  searchParams,
  linkInvalid,
}: {
  searchParams: PageProps<"/[locale]/login">["searchParams"];
  linkInvalid: string;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNextPath(sp.next) : undefined;
  return (
    <>
      {sp.error === "link" && (
        <p role="alert" className="font-semibold text-danger">
          {linkInvalid}
        </p>
      )}
      <LoginForm next={next} />
    </>
  );
}
