"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * After a client-side route change, move focus to <main> so keyboard and
 * screen-reader users start at the new content instead of a stale link.
 * Skips the first load, and search-param-only changes (filters) keep focus.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
