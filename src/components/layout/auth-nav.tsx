import { LayoutDashboard, LogIn, LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/[locale]/login/actions";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/auth/viewer";

/** Reads the session cookie, so it must render inside <Suspense>. */
export async function AuthNav({ locale }: { locale: Locale }) {
  const [t, viewer] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getViewer(),
  ]);

  if (!viewer) return <LoginLink label={t("login")} />;

  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <LayoutDashboard aria-hidden="true" />
        {t("dashboard")}
      </Link>
      <form action={signOut.bind(null, locale)}>
        <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <LogOut aria-hidden="true" />
          {t("logout")}
        </button>
      </form>
    </div>
  );
}

export function LoginLink({ label }: { label: string }) {
  return (
    <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <LogIn aria-hidden="true" />
      {label}
    </Link>
  );
}
