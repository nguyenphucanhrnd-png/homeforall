"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scene Header parallax (v4 §5.3): ≤ 8 % of the header height, transform only,
 * off for reduced motion or when the visitor chose "Giảm hiệu ứng".
 */
export function HeaderParallax({ children, max = 0.08 }: { children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      reduced ||= localStorage.getItem("hfa:reduce-effects") === "1";
    } catch {}
    if (reduced) return;

    let frame = 0;
    const update = () => {
      const box = el.parentElement!.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -box.top / box.height));
      el.style.transform = `translate3d(0, ${(progress * max * 100).toFixed(2)}%, 0)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [max]);

  return (
    <div ref={ref} aria-hidden="true" className="absolute inset-x-0 -top-[8%] -bottom-[8%] -z-20 will-change-transform">
      {children}
    </div>
  );
}
