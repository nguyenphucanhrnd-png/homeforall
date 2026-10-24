import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { SceneHeader } from "@/components/world/scene-header";
import type { Locale } from "@/i18n/routing";
import { wardLabel } from "@/lib/pets/wards";
import { buildDemoTasks } from "@/lib/volunteer/demo-tasks";
import { TaskBoard } from "./task-board";

export async function generateMetadata({ params }: PageProps<"/[locale]/volunteer">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("volunteer") };
}

/** Journey beat 1 (s03): a few hours of yours help an animal get home (journey T1). */
export default async function VolunteerPage({ params }: PageProps<"/[locale]/volunteer">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [pages, t] = await Promise.all([
    getTranslations({ locale, namespace: "pages" }),
    getTranslations({ locale, namespace: "volunteer" }),
  ]);

  return (
    <>
      <SceneHeader route="/volunteer" locale={locale} title={pages("volunteer")} />
      <Container className="relative pb-20">
        <section aria-labelledby="tasks-title" className="space-y-6 rounded-lg bg-cream-50 p-8 shadow-lift">
          <h2 id="tasks-title" className="text-3xl font-bold text-blue-800">
            {t("title")}
          </h2>
          <Suspense>
            <Board locale={locale} />
          </Suspense>
        </section>
      </Container>
    </>
  );
}

async function Board({ locale }: { locale: Locale }) {
  await connection(); // dates are relative to the request
  const fmt = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const tasks = buildDemoTasks(new Date()).map((task) => ({
    id: task.id,
    type: task.type,
    minutes: task.minutes,
    wardLabel: task.ward ? wardLabel(task.ward, locale) : "",
    dateLabel: fmt.format(task.date),
    weekend: [0, 6].includes(task.date.getDay()),
    online: task.online,
    partner: task.partner,
  }));
  return <TaskBoard tasks={tasks} />;
}
