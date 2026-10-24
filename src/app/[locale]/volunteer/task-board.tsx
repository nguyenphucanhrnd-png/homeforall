"use client";

import {
  CalendarDays,
  Car,
  Camera,
  CircleCheck,
  Clock,
  MapPin,
  MessagesSquare,
  PartyPopper,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TaskView = {
  id: string;
  type: "transport" | "photo" | "event" | "online";
  minutes: number;
  wardLabel: string;
  dateLabel: string;
  weekend: boolean;
  online: boolean;
  partner: string;
};

const ICONS = { transport: Car, photo: Camera, event: PartyPopper, online: MessagesSquare };
const FILTERS = ["all", "short", "weekend", "online"] as const;
type Filter = (typeof FILTERS)[number];

/** Time-boxed task board (journey T1). Sign-up is acknowledged but not sent yet. */
export function TaskBoard({ tasks }: { tasks: TaskView[] }) {
  const t = useTranslations("volunteer");
  const [filter, setFilter] = useState<Filter>("all");
  const [signed, setSigned] = useState<Set<string>>(new Set());

  const shown = tasks.filter((task) =>
    filter === "short"
      ? task.minutes < 120
      : filter === "weekend"
        ? task.weekend
        : filter === "online"
          ? task.online
          : true,
  );

  return (
    <div className="space-y-6">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">{t("filters")}</legend>
        {FILTERS.map((f) => (
          <label
            key={f}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-border bg-white px-4 font-semibold has-checked:border-blue-600 has-checked:bg-blue-100 has-checked:text-blue-800"
          >
            <input
              type="radio"
              name="task-filter"
              value={f}
              checked={filter === f}
              onChange={() => setFilter(f)}
              className="sr-only"
            />
            {t(f)}
          </label>
        ))}
      </fieldset>

      <p aria-live="polite" className="sr-only">
        {shown.length}
      </p>

      {shown.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-muted shadow-soft">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((task) => {
            const Icon = ICONS[task.type];
            const done = signed.has(task.id);
            return (
              <li
                key={task.id}
                data-testid="task-card"
                className="flex flex-col gap-3 rounded-lg bg-white p-6 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <Icon aria-hidden="true" className="size-8 text-blue-800" />
                </div>
                <h3 className="text-xl font-bold">{t(`types.${task.type}`)}</h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="flex items-center gap-1 text-muted">
                    <Clock aria-hidden="true" className="size-4" />
                    {t("duration")}
                  </dt>
                  <dd className="font-semibold">
                    {task.minutes >= 60 ? `${task.minutes / 60} h` : `${task.minutes} min`}
                  </dd>
                  <dt className="flex items-center gap-1 text-muted">
                    <CalendarDays aria-hidden="true" className="size-4" />
                    {t("date")}
                  </dt>
                  <dd className="font-semibold">{task.dateLabel}</dd>
                  <dt className="flex items-center gap-1 text-muted">
                    <MapPin aria-hidden="true" className="size-4" />
                    {t("ward")}
                  </dt>
                  <dd className="font-semibold">{task.online ? t("online") : task.wardLabel}</dd>
                </dl>
                <p className="text-sm text-muted">
                  {t("partner")}: {task.partner}
                </p>
                <Button
                  type="button"
                  variant={done ? "ghost" : "secondary"}
                  className={cn("mt-auto", done && "pointer-events-none")}
                  aria-pressed={done}
                  onClick={() => setSigned((s) => new Set(s).add(task.id))}
                >
                  {done ? <CircleCheck aria-hidden="true" /> : null}
                  {done ? t("signedUp") : t("signUp")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
