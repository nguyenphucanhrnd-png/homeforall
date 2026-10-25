"use client";

import { MessageCircleHeart, Send, Stethoscope, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Message = { id: number; from: "fanh" | "user"; text: string; links?: boolean };

/**
 * "Fanh the vet": AI assistant chat, UI only for now. Replies are a fixed,
 * honest "still being built" message pointing to Care and Help now. Hidden on
 * /help, which must stay calm and distraction-free.
 */
export function FanhChat() {
  const t = useTranslations("fanh");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const titleId = useId();

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, typing]);

  // Esc closes the chat and returns focus to the launcher.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      launcher.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/help")) return null;

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  function ask(text: string) {
    const question = text.trim();
    if (!question || typing) return;
    setMessages((m) => [...m, { id: nextId.current++, from: "user", text: question }]);
    setDraft("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { id: nextId.current++, from: "fanh", text: t("reply"), links: true }]);
      setTyping(false);
    }, 700);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(draft);
  }

  const suggestions = t.raw("suggestions") as string[];

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="fixed right-5 bottom-24 z-40 flex max-h-[min(580px,calc(100dvh-140px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-lg bg-white shadow-lift ring-1 ring-border max-md:right-4 max-md:bottom-[calc(var(--mobile-cta-h,0px)+env(safe-area-inset-bottom)+4.75rem)] max-md:max-h-[calc(100dvh-var(--mobile-cta-h,0px)-9rem)]"
        >
          <header className="flex items-center gap-3 bg-blue-800 px-5 py-4 text-white">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-ink">
              <Stethoscope aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-heading text-xl font-bold">
                {t("title")}
              </h2>
              <p className="text-sm text-white">{t("subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-white/15"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <p className="border-b border-border bg-cream-50 px-5 py-3 text-sm text-ink">
            {t("disclaimer")}{" "}
            <Link href="/help" className="font-bold">
              {t("linkHelp")}
            </Link>
          </p>

          <div ref={log} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <Bubble from="fanh">{t("greeting")}</Bubble>
            {messages.map((m) => (
              <Bubble key={m.id} from={m.from} youLabel={t("you")}>
                {m.text}
                {m.links && (
                  <span className="mt-2 flex flex-wrap gap-3">
                    <Link href="/learn" className="font-bold">
                      {t("linkLearn")}
                    </Link>
                    <Link href="/help" className="font-bold">
                      {t("linkHelp")}
                    </Link>
                  </span>
                )}
              </Bubble>
            ))}
            {typing && (
              <p className="text-sm text-muted" aria-live="polite">
                {t("typing")}
              </p>
            )}
            {messages.length === 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-sm font-bold text-muted">{t("suggestionsLabel")}</p>
                <ul className="flex flex-col items-start gap-2">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => ask(s)}
                        className="min-h-10 cursor-pointer rounded-full border-2 border-blue-100 bg-white px-4 text-left text-sm font-semibold text-blue-800 hover:bg-blue-100"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border p-3">
            <label htmlFor="fanh-input" className="sr-only">
              {t("inputLabel")}
            </label>
            <textarea
              id="fanh-input"
              ref={input}
              rows={1}
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(draft);
                }
              }}
              placeholder={t("placeholder")}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-md border-2 border-border px-3 py-2 text-ink"
            />
            <button
              type="submit"
              disabled={!draft.trim() || typing}
              aria-label={t("send")}
              className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-orange-500 text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send aria-hidden="true" className="size-5" />
            </button>
          </form>
        </div>
      )}

      <button
        ref={launcher}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        data-testid="fanh-launcher"
        className="fixed right-5 bottom-5 z-40 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-blue-800 py-1.5 ps-1.5 pe-5 font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 max-md:right-4 max-md:bottom-[calc(var(--mobile-cta-h,0px)+env(safe-area-inset-bottom)+0.75rem)] max-md:pe-1.5"
      >
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-orange-500 text-ink">
          <MessageCircleHeart aria-hidden="true" className="size-5" />
        </span>
        <span className="max-md:sr-only">{t("launcher")}</span>
      </button>
    </>
  );
}

function Bubble({ from, youLabel, children }: { from: "fanh" | "user"; youLabel?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex", from === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5 text-[15px] leading-relaxed",
          from === "user" ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-cream-50 text-ink",
        )}
      >
        {from === "user" && <span className="sr-only">{youLabel}: </span>}
        {children}
      </div>
    </div>
  );
}
