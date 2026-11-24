"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { setScrollLock } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import { ENTRY_INTENTS, type EntryIntent } from "./intents";

/** Window event the footer "What do you need?" link fires to reopen the dialog. */
export const ENTRY_INTENT_OPEN_EVENT = "hfa:entry-intent-open";
/** Hash that opens the dialog on the home page (no-JS fallback of the footer link). */
export const ENTRY_INTENT_HASH = "#need";

const SEEN_KEY = "hfa:entry-intent-seen";

function seenThisSession() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage blocked: the dialog may show again on the next home visit, which is fine.
  }
}

function isBot() {
  return navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent);
}

/** Wait until the page has painted and settled, so the dialog never competes with the hero (LCP). */
function afterFirstPaint(run: () => void) {
  let idle = 0;
  let timer = 0;
  const schedule = () => {
    if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(run, { timeout: 2000 });
    else timer = setTimeout(run, 400) as unknown as number;
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    window.removeEventListener("load", schedule);
    if (idle) window.cancelIdleCallback(idle);
    if (timer) clearTimeout(timer);
  };
}

/**
 * "What do you need today?": routes a first-time visitor of the home page to the
 * right place in one tap. Opens once per browser session on `/` only (never on deep
 * links, other pages or for bots); the footer link reopens it anywhere.
 * Native <dialog> + showModal(): focus trap, Esc and inert background come from the browser.
 */
export function EntryIntentDialog() {
  const t = useTranslations("entryIntent");
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const navigating = useRef(false);
  const titleId = useId();
  const descId = useId();

  const show = useCallback((from: HTMLElement | null) => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    opener.current = from;
    navigating.current = false;
    markSeen();
    dialog.showModal();
    setScrollLock(true);
  }, []);

  const close = useCallback(() => ref.current?.close(), []);

  // First visit of the session: home page only, after first paint.
  useEffect(() => {
    if (pathname !== "/") return;
    const asked = location.hash === ENTRY_INTENT_HASH;
    if (!asked && (location.hash || seenThisSession() || isBot())) return;
    return afterFirstPaint(() => show(null));
  }, [pathname, show]);

  // Footer link (any page), or a #need link followed on the same page.
  useEffect(() => {
    const onOpen = (e: Event) => show((e as CustomEvent<HTMLElement | null>).detail ?? null);
    const onHash = () => location.hash === ENTRY_INTENT_HASH && show(null);
    window.addEventListener(ENTRY_INTENT_OPEN_EVENT, onOpen);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener(ENTRY_INTENT_OPEN_EVENT, onOpen);
      window.removeEventListener("hashchange", onHash);
    };
  }, [show]);

  // Backdrop click closes (the content box fills the dialog, so only the backdrop targets it).
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  // Never leave the page locked if the dialog unmounts while open.
  useEffect(() => () => setScrollLock(false), []);

  const onClosed = () => {
    setScrollLock(false);
    if (location.hash === ENTRY_INTENT_HASH) history.replaceState(history.state, "", location.pathname + location.search);
    if (!navigating.current) opener.current?.focus();
  };

  const choose = () => {
    navigating.current = true;
    close();
  };

  const urgent = ENTRY_INTENTS.filter((i) => i.urgent);
  const others = ENTRY_INTENTS.filter((i) => !i.urgent);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-modal="true"
      onClose={onClosed}
      data-testid="entry-intent"
      className={cn(
        "m-auto max-h-[90dvh] w-[min(720px,calc(100vw-32px))] max-w-none overflow-y-auto rounded-lg bg-white p-0 text-ink shadow-lift backdrop:bg-navy-900/60",
        // Phone: bottom sheet.
        "max-md:mb-0 max-md:max-h-[88dvh] max-md:w-full max-md:rounded-b-none",
        // Fade in; a short slide only when motion is allowed.
        "transition-[opacity,translate] duration-200 ease-out starting:opacity-0 motion-safe:starting:translate-y-3 motion-safe:max-md:starting:translate-y-10",
      )}
    >
      <div className="space-y-6 px-5 pt-5 pb-6 md:px-8 md:pt-7 md:pb-7">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 id={titleId} className="text-2xl font-bold text-blue-800 md:text-3xl">
              {t("title")}
            </h2>
            <p id={descId} className="text-muted">
              {t("subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-cream-50"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <IntentGroup label={t("urgent")} items={urgent} cols="md:grid-cols-2" onChoose={choose} />
        <IntentGroup label={t("others")} items={others} cols="md:grid-cols-3" onChoose={choose} />

        <div className="flex justify-center">
          <button type="button" onClick={close} className={buttonVariants({ variant: "ghost", size: "md" })}>
            {t("skip")}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function IntentGroup({
  label,
  items,
  cols,
  onChoose,
}: {
  label: string;
  items: EntryIntent[];
  cols: string;
  onChoose: () => void;
}) {
  const t = useTranslations("entryIntent.options");
  const labelId = useId();
  return (
    <section aria-labelledby={labelId} className="space-y-2">
      <h3 id={labelId} className="text-sm font-bold text-muted">
        {label}
      </h3>
      <ul className={cn("grid grid-cols-1 gap-3", cols)}>
        {items.map(({ id, href, urgent, icon: Icon }) => (
          <li key={id} className="flex">
            <Link
              href={href}
              onClick={onChoose}
              data-intent={id}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-md px-4 py-3 font-bold text-ink no-underline transition-[box-shadow,background-color,translate] duration-200",
                urgent
                  ? "bg-orange-500 text-base shadow-soft hover:-translate-y-px hover:shadow-lift md:min-h-20 md:text-lg"
                  : "border-2 border-border bg-cream-50 hover:bg-blue-100 hover:text-blue-800",
              )}
            >
              <Icon aria-hidden="true" className={cn("size-6 shrink-0", !urgent && "text-blue-800")} />
              <span>{t(id)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Footer link that reopens the dialog in place (falls back to /#need without JS). */
export function EntryIntentTrigger({ label, className }: { label: string; className?: string }) {
  return (
    <Link
      href={{ pathname: "/", hash: ENTRY_INTENT_HASH.slice(1) }}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(ENTRY_INTENT_OPEN_EVENT, { detail: e.currentTarget }));
      }}
    >
      {label}
    </Link>
  );
}
