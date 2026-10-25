"use client";

import { useEffect } from "react";
import { PHONE_QUERY } from "@/world/world.config";

const FOCUSABLE = 'summary, a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])';

/**
 * Phones only: turns the header's native <details> menu into a full-height
 * dialog-like menu: focus moves in and is trapped, Esc and the back button
 * close it, choosing a link closes it, and html[data-menu-open] lets CSS hide
 * the sticky bar and lock page scroll. Tablet/desktop keep the plain <details>.
 */
export function MobileMenuBehaviour({ id }: { id: string }) {
  useEffect(() => {
    const details = document.getElementById(id) as HTMLDetailsElement | null;
    if (!details) return;
    const media = matchMedia(PHONE_QUERY);
    const root = document.documentElement;
    const summary = details.querySelector("summary");
    let pushed = false;
    let leaving = false;

    const visible = (el: Element) => (el as HTMLElement).offsetParent !== null || el === summary;
    const focusables = () => [...details.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);

    const onToggle = () => {
      if (!media.matches) {
        root.removeAttribute("data-menu-open");
        return;
      }
      root.toggleAttribute("data-menu-open", details.open);
      if (details.open) {
        history.pushState({ ...history.state, hfaMenu: true }, "");
        pushed = true;
        requestAnimationFrame(() => focusables()[1]?.focus());
      } else {
        if (pushed && !leaving && history.state?.hfaMenu) history.back();
        pushed = false;
        leaving = false;
      }
    };
    const close = () => {
      details.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (!details.open || !media.matches) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        summary?.focus();
      } else if (e.key === "Tab") {
        const list = focusables();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onPop = () => {
      if (details.open && media.matches) {
        pushed = false;
        close();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!media.matches || !details.open) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-menu-close]")) {
        close();
        summary?.focus();
      } else if (target.closest("[data-menu-panel] a[href]")) {
        leaving = true; // navigating: do not undo the history entry
        close();
      }
    };

    details.addEventListener("toggle", onToggle);
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    details.addEventListener("click", onClick);
    return () => {
      details.removeEventListener("toggle", onToggle);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      details.removeEventListener("click", onClick);
      root.removeAttribute("data-menu-open");
    };
  }, [id]);
  return null;
}
