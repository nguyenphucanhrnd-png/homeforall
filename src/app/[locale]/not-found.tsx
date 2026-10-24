import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  const c = useTranslations("comingSoon");
  return (
    <Container className="py-20">
      <div className="max-w-2xl space-y-4 rounded-lg bg-white p-10 shadow-soft">
        <h1 className="text-4xl font-bold text-blue-800">{t("title")}</h1>
        <p className="text-muted">{t("body")}</p>
        <Button asChild variant="secondary">
          <Link href="/">{c("back")}</Link>
        </Button>
      </div>
    </Container>
  );
}
