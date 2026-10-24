"use client";

import { useCallback, useEffect, useState } from "react";

export type ExperienceMode = "pending" | "full" | "lite" | "static";

export const REDUCE_KEY = "hfa:reduce-effects";

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

function readPreference() {
  try {
    return localStorage.getItem(REDUCE_KEY) === "1";
  } catch {
    return false;
  }
}

function canDrawPlates() {
  try {
    return typeof createImageBitmap === "function" && Boolean(document.createElement("canvas").getContext("2d"));
  } catch {
    return false;
  }
}

/**
 * Full on capable desktops, Lite on weaker hardware (smaller decode window),
 * Static when the visitor asks for less motion, saves data, the browser can't
 * draw plates, or the window is narrower than 768 px (mobile layout deferred).
 * Starts "pending", which renders exactly like Static.
 */
function detect(userReduce: boolean): ExperienceMode {
  const nav = navigator as NavigatorExtras;
  if (
    userReduce ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    nav.connection?.saveData ||
    window.innerWidth < 768 ||
    !canDrawPlates()
  ) {
    return "static";
  }
  const lowEnd = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  return lowEnd ? "lite" : "full";
}

export function useExperienceMode() {
  const [mode, setMode] = useState<ExperienceMode>("pending");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const pref = readPreference();
      setReduced(pref);
      setMode(detect(pref));
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const toggleReduced = useCallback(() => {
    const next = !readPreference();
    try {
      localStorage.setItem(REDUCE_KEY, next ? "1" : "0");
    } catch {
      /* preference lasts for this page only */
    }
    setReduced(next);
    setMode(detect(next));
  }, []);

  return { mode, reduced, toggleReduced };
}
