"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { PlateEngine, type Layer } from "@/world/plate-engine";
import type { PlateSources } from "@/world/plate-types";
import {
  CROSSFADE_VH,
  JOURNEY,
  JOURNEY_PIN_VH,
  JOURNEY_TRACK,
  LANDING_TRACK,
  PLATES,
  type Localized,
  type PlateId,
} from "@/world/world.config";
import { SCENES, type SceneId } from "./scenes";
import { useExperienceMode } from "./use-experience-mode";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = {
  children: ReactNode;
  sources: PlateSources;
  locale: keyof Localized;
  sceneLabels: Record<SceneId, string>;
  navLabel: string;
  reduceLabel: string;
};

export function StoryShell({ children, sources, locale, sceneLabels, navLabel, reduceLabel }: Props) {
  const { mode, reduced, toggleReduced } = useExperienceMode();
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lenis = useRef<Lenis | null>(null);
  const animated = mode === "full" || mode === "lite";
  const [ready, setReady] = useState(false);

  // Lenis drives scroll; GSAP's ticker drives Lenis (v4 §6 sync recipe).
  useEffect(() => {
    if (!animated) return;
    const instance = new Lenis({ autoRaf: false, lerp: 0.11 });
    lenis.current = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      instance.destroy();
      lenis.current = null;
    };
  }, [animated]);

  useGSAP(
    () => {
      if (!animated || !root.current || !canvas.current) return;
      return setupStory({
        root: root.current,
        canvas: canvas.current,
        sources,
        locale,
        lite: mode === "lite",
        lenis,
        onReady: () => setReady(true),
      });
    },
    { scope: root, dependencies: [animated], revertOnUpdate: true },
  );

  // Recalculate pin positions once fonts and images have settled.
  useEffect(() => {
    if (!animated) return;
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);
    return () => window.removeEventListener("load", refresh);
  }, [animated]);

  // Step buttons and #journey-n links work in every mode.
  useEffect(() => {
    if (!root.current) return;
    const el = root.current;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const abs = target.closest<HTMLElement>("[data-journey-go]");
      const rel = target.closest<HTMLElement>("[data-journey-step-rel]");
      if (!abs && !rel) return;
      e.preventDefault();
      if (abs) return goToStep(Number(abs.dataset.journeyGo), lenis);
      const current = Number(el.querySelector<HTMLElement>("[data-step][data-active]")?.dataset.index ?? 0) + 1;
      goToStep(current + Number(rel!.dataset.journeyStepRel), lenis);
    };
    el.addEventListener("click", onClick);
    const fromHash = () => {
      const m = location.hash.match(/^#journey-([1-6])$/);
      if (m) goToStep(Number(m[1]), lenis, true);
    };
    const t = setTimeout(fromHash, animated ? 400 : 0); // after pins exist
    window.addEventListener("hashchange", fromHash);
    return () => {
      clearTimeout(t);
      el.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", fromHash);
    };
  }, [animated]);

  return (
    <div
      ref={root}
      data-mode={mode}
      data-canvas={animated && ready ? "ready" : "none"}
      className="group/story"
    >
      {animated && (
        <canvas
          ref={canvas}
          role="img"
          aria-label={PLATES.s01.caption[locale]}
          className={cn(
            "pointer-events-none fixed inset-0 -z-10 h-screen w-screen transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
      )}
      {children}
      <SceneDots labels={sceneLabels} navLabel={navLabel} lenis={lenis} />
      <button
        type="button"
        onClick={toggleReduced}
        aria-pressed={reduced}
        className="fixed bottom-5 left-5 z-30 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-ink shadow-lift hover:bg-cream-50"
      >
        <Sparkles aria-hidden="true" className="size-4 text-orange-700" />
        {reduceLabel}
      </button>
    </div>
  );
}

/** Scroll to the middle of journey step n (pinned) or to its card (static). */
function goToStep(n: number, lenis: RefObject<Lenis | null>, instant = false) {
  const step = Math.min(6, Math.max(1, n));
  const pin = ScrollTrigger.getById("journey-pin");
  if (pin) {
    const y = pin.start + ((step - 0.5) / 6) * (pin.end - pin.start);
    if (lenis.current) lenis.current.scrollTo(y, { immediate: instant, duration: 1.1 });
    else window.scrollTo({ top: y });
  } else {
    document.getElementById(`journey-${step}`)?.scrollIntoView({ block: "start" });
  }
  document.querySelector<HTMLElement>(`[data-step][data-index="${step - 1}"] h3`)?.focus({ preventScroll: true });
  history.replaceState(null, "", `#journey-${step}`);
}

/** Labelled, keyboard-focusable progress dots; jump to any scene. */
function SceneDots({
  labels,
  navLabel,
  lenis,
}: {
  labels: Record<SceneId, string>;
  navLabel: string;
  lenis: RefObject<Lenis | null>;
}) {
  const [active, setActive] = useState<SceneId>("hero");

  useEffect(() => {
    const sections = SCENES.map((id) => document.getElementById(`scene-${id}`)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id.replace("scene-", "") as SceneId);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  function go(id: SceneId) {
    const el = document.getElementById(`scene-${id}`);
    if (!el) return;
    if (lenis.current) lenis.current.scrollTo(el, { offset: -72, duration: 1.2 });
    else el.scrollIntoView({ block: "start" });
    el.focus({ preventScroll: true });
  }

  return (
    <nav aria-label={navLabel} className="fixed top-1/2 right-5 z-30 -translate-y-1/2">
      <ol className="flex flex-col gap-1">
        {SCENES.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => go(id)}
              aria-current={active === id ? "step" : undefined}
              className="group/dot flex min-h-8 cursor-pointer items-center justify-end gap-3"
            >
              <span className="rounded-sm bg-white px-2 py-1 text-sm font-bold whitespace-nowrap text-ink opacity-0 shadow-soft transition-opacity group-hover/dot:opacity-100 group-focus-visible/dot:opacity-100">
                {labels[id]}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "block rounded-full border-2 border-blue-800 transition-all duration-200",
                  active === id ? "size-3.5 bg-blue-800" : "size-2.5 bg-white",
                )}
              />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ─── The scroll story ─────────────────────────────────────────────────────────

type Item =
  | { kind: "segment"; id: string; plate: PlateId | null; hold?: number; dim?: { from: number; to: number; alpha: number }; p: { t: number }; st: ScrollTrigger }
  | { kind: "journey"; p: { t: number }; st: ScrollTrigger };

type SetupArgs = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  sources: PlateSources;
  locale: keyof Localized;
  lite: boolean;
  lenis: RefObject<Lenis | null>;
  onReady: () => void;
};

/** Everything scroll-driven. Runs inside useGSAP, so triggers/tweens revert on cleanup. */
function setupStory({ root, canvas, sources, locale, lite, lenis, onReady }: SetupArgs) {
  const q = gsap.utils.selector(root);
  const engine = new PlateEngine(canvas, sources, { maxBytes: (lite ? 120 : 200) * 1048576, maxDpr: lite ? 1 : 1.5 });
  engine.onFirstFrame = onReady;
  engine.warm("s01");
  // Dev/test hook: lets /dev/plates and Playwright read decode/memory stats.
  if (process.env.NODE_ENV !== "production") (window as unknown as { __plateEngine?: PlateEngine }).__plateEngine = engine;

  // Hero intro.
  gsap.from(q("[data-hero-line]"), { y: 24, autoAlpha: 0, stagger: 0.08, duration: 0.7, ease: "power3.out" });

  // ── Pin 1: horizontal pet row ──
  const track = q("[data-hscroll-track]")[0] as HTMLElement | undefined;
  const hpin = q("[data-hscroll]")[0] as HTMLElement | undefined;
  if (track && hpin) {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: { trigger: hpin, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
    });
    q("[data-hcard]").forEach((card) => {
      gsap.fromTo(
        card,
        { rotateY: -14, scale: 0.92 },
        {
          rotateY: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "left 60%", scrub: true },
        },
      );
    });
    track.addEventListener("focusin", (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>("[data-hcard]");
      const st = tween.scrollTrigger;
      if (!card || !st || distance() === 0) return;
      const x = gsap.utils.clamp(0, distance(), card.offsetLeft - (window.innerWidth - card.offsetWidth) / 2);
      const y = st.start + (x / distance()) * (st.end - st.start);
      if (lenis.current) lenis.current.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    });
  }

  // ── Pin 2: the journey ──
  const jpin = q("[data-journey]")[0] as HTMLElement | undefined;
  const steps = q("[data-step]");
  const spine = q("[data-spine-step]");
  const bar = q("[data-journey-bar]")[0] as HTMLElement | undefined;
  let journeyItem: Item | null = null;
  if (jpin) {
    const p = { t: 0 };
    let current = -1;
    const st = ScrollTrigger.create({
      id: "journey-pin",
      trigger: jpin,
      start: "top top",
      end: `+=${JOURNEY_PIN_VH * 100}%`,
      pin: true,
      onUpdate: (self) => {
        const step = Math.min(5, Math.floor(self.progress * 6));
        if (bar) bar.style.transform = `scaleX(${self.progress})`;
        if (step === current) return;
        current = step;
        [...steps, ...spine].forEach((el) =>
          el.toggleAttribute("data-active", Number((el as HTMLElement).dataset.index) === step),
        );
      },
    });
    gsap.to(p, { t: 1, ease: "none", scrollTrigger: { trigger: jpin, start: "top top", end: `+=${JOURNEY_PIN_VH * 100}%`, scrub: 1 } });
    journeyItem = { kind: "journey", p, st };
  }

  // ── Plate segments (each with scrub: 1) ──
  const items: Item[] = [];
  for (const seg of LANDING_TRACK) {
    const el = document.getElementById(seg.section);
    if (!el) continue;
    const p = { t: 0 };
    const endTrigger = seg.endSection ? document.getElementById(seg.endSection) ?? el : el;
    const tween = gsap.to(p, {
      t: 1,
      ease: "none",
      scrollTrigger: { trigger: el, start: seg.start, endTrigger, end: seg.end, scrub: 1, invalidateOnRefresh: true },
    });
    items.push({ kind: "segment", id: seg.id, plate: seg.plate, hold: seg.hold, dim: seg.dim, p, st: tween.scrollTrigger! });
    if (seg.id === "journey-enter" && journeyItem) items.push(journeyItem);
  }

  // ── Every tick: pick the active item, crossfade, draw ──
  let label = "";
  let lastWarm = 0;
  const lastLayer = (item: Item): Layer => {
    if (item.kind === "journey") return { plate: JOURNEY_TRACK[JOURNEY_TRACK.length - 1].plate, t: 1, alpha: 1 };
    return { plate: item.plate, t: item.hold ?? 1, alpha: 1, dim: item.dim?.alpha };
  };

  const tick = () => {
    const fadePx = CROSSFADE_VH * window.innerHeight;
    let idx = 0;
    items.forEach((it, i) => {
      if (it.p.t > 0) idx = i;
    });
    const item = items[idx];
    let layers: Layer[];

    if (item.kind === "journey") {
      const t = item.p.t;
      const found = JOURNEY_TRACK.findIndex((s) => t >= s.from && t < s.to);
      const k = found === -1 ? JOURNEY_TRACK.length - 1 : found;
      const seg = JOURNEY_TRACK[k];
      const local = (t - seg.from) / (seg.to - seg.from);
      const pinLen = item.st.end - item.st.start;
      const into = (t - seg.from) * pinLen;
      const cur: Layer = { plate: seg.plate, t: local, alpha: 1 };
      layers = k > 0 && into < fadePx ? [{ plate: JOURNEY_TRACK[k - 1].plate, t: 1, alpha: 1 }, { ...cur, alpha: into / fadePx }] : [cur];
    } else {
      const t = item.p.t;
      const dim = item.dim ? gsap.utils.clamp(0, 1, (t - item.dim.from) / (item.dim.to - item.dim.from)) * item.dim.alpha : 0;
      const cur: Layer = { plate: item.plate, t: item.hold ?? t, alpha: 1, dim };
      const into = t * (item.st.end - item.st.start);
      const prev = idx > 0 ? items[idx - 1] : null;
      if (prev && into < fadePx) {
        const mix = into / fadePx;
        layers = [{ ...lastLayer(prev), alpha: item.plate ? 1 : 1 - mix }, ...(item.plate ? [{ ...cur, alpha: mix }] : [])];
      } else {
        layers = [cur];
      }
    }

    engine.render(layers);

    // Keep the canvas' accessible name in sync with what it shows.
    const shown = layers[layers.length - 1]?.plate;
    const next = shown ? PLATES[shown].caption[locale] : "";
    if (next && next !== label) {
      label = next;
      canvas.setAttribute("aria-label", next);
    }

    // Fetch compressed frames for plates within ~1.5 viewports.
    const now = performance.now();
    if (now - lastWarm > 300) {
      lastWarm = now;
      const horizon = window.scrollY + window.innerHeight * 2.5;
      for (const it of items) {
        if (it.st.start > horizon) continue;
        if (it.kind === "journey") JOURNEY.forEach((s) => s.plates.forEach((pl) => engine.warm(pl)));
        else if (it.plate) engine.warm(it.plate);
      }
    }
  };
  gsap.ticker.add(tick);
  const onResize = () => engine.resize();
  window.addEventListener("resize", onResize);

  // ── Reveals, masks, parallax ──
  const reveals = q("[data-reveal]");
  gsap.set(reveals, { autoAlpha: 0, y: 18 });
  ScrollTrigger.batch(reveals, {
    start: "top 88%",
    once: true,
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.55, ease: "power2.out", overwrite: true }),
  });
  q("[data-mask]").forEach((el) => {
    const arch = (el as HTMLElement).dataset.mask === "arch";
    const round = arch ? "round 999px 999px 24px 24px" : "round 24px";
    gsap.fromTo(
      el,
      { clipPath: `inset(100% 0% 0% 0% ${round})` },
      {
        clipPath: `inset(0% 0% 0% 0% ${round})`,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 98%", end: "top 75%", scrub: 1 },
      },
    );
  });
  q("[data-depth]").forEach((el) => {
    const depth = Math.min(0.1, Number((el as HTMLElement).dataset.depth) || 0.08); // ≤ 10 % (v4)
    gsap.fromTo(
      el,
      { yPercent: -depth * 50 },
      {
        yPercent: depth * 50,
        ease: "none",
        scrollTrigger: { trigger: el.closest("section") ?? el, start: "top bottom", end: "bottom top", scrub: 1 },
      },
    );
  });

  ScrollTrigger.refresh();

  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener("resize", onResize);
    engine.destroy();
  };
}
