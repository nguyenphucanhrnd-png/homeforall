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
 * Full on capable desktops, Lite on weaker hardware and on phones (smaller
 * decode window, see setupStory), Static when the visitor asks for less
 * motion, saves data, or the browser can't draw plates.
 * Starts "pending", which renders exactly like Static.
 */
function detect(userReduce: boolean): ExperienceMode {
  const nav = navigator as NavigatorExtras;
  if (userReduce || matchMedia("(prefers-reduced-motion: reduce)").matches || nav.connection?.saveData || !canDrawPlates()) {
    return "static";
  }
  if (window.innerWidth < 768) return "lite"; // phones: pinned story with the phone budget
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
