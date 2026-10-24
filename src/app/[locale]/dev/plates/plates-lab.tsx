"use client";

import { useEffect, useRef, useState } from "react";
import { PlateEngine, type EngineStats } from "@/world/plate-engine";
import type { PlateSources } from "@/world/plate-types";
import { CROSSFADE_VH, JOURNEY_PIN_VH, JOURNEY_TRACK, PLATE_IDS, PLATES, type PlateId } from "@/world/world.config";

const field = "w-20 rounded-sm border-2 border-border bg-white px-2 py-1";

export function PlatesLab({ sources }: { sources: PlateSources }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<PlateEngine | null>(null);
  const [plate, setPlate] = useState<PlateId>("s01");
  const [t, setT] = useState(0);
  const [focal, setFocal] = useState<Record<PlateId, [number, number]>>(
    () => Object.fromEntries(PLATE_IDS.map((id) => [id, [...PLATES[id].focal]])) as Record<PlateId, [number, number]>,
  );
  const [track, setTrack] = useState(() => JOURNEY_TRACK.map((s) => ({ ...s })));
  const [crossfade, setCrossfade] = useState(CROSSFADE_VH);
  const [pinVh, setPinVh] = useState(JOURNEY_PIN_VH);
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [fps, setFps] = useState(0);
  const [copied, setCopied] = useState(false);

  // The preview canvas fills its box; the engine sizes to the window, so scale with CSS.
  useEffect(() => {
    if (!canvas.current) return;
    const e = new PlateEngine(canvas.current, sources, { maxBytes: 200 * 1048576, maxDpr: 1 });
    engine.current = e;
    PLATE_IDS.forEach((id) => e.warm(id));
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frames++;
      if (now - last > 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        setStats(e.stats());
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      e.destroy();
    };
  }, [sources]);

  // Redraw on every change; apply the edited focal point to the live config object.
  useEffect(() => {
    PLATES[plate].focal = focal[plate];
    const id = setInterval(() => engine.current?.render([{ plate, t, alpha: 1 }]), 50);
    engine.current?.render([{ plate, t, alpha: 1 }]);
    return () => clearInterval(id);
  }, [plate, t, focal]);

  const src = sources[plate];
  const frame = src ? Math.round(t * (src.frames - 1)) + 1 : null;
  const json = JSON.stringify({ JOURNEY_PIN_VH: pinVh, CROSSFADE_VH: crossfade, JOURNEY_TRACK: track, focal }, null, 2);

  return (
    <div className="grid grid-cols-12 gap-8">
      <section className="col-span-12 space-y-4 xl:col-span-8">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-navy-900 shadow-lift">
          <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
          {src && src.width < 1920 && (
            <span className="absolute top-3 left-3 rounded-sm bg-warning px-2 py-1 text-xs font-extrabold text-white">
              INTERIM {src.width}px (master not 4K)
            </span>
          )}
        </div>
        <label className="block space-y-1">
          <span className="font-bold">
            {plate} · {frame ? `frame ${frame}/${src!.frames}` : "missing → fallback"} · t = {t.toFixed(3)}
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={t}
            onChange={(e) => setT(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </label>
        <p className="text-sm text-muted">
          {fps} fps · decoded {stats?.decoded ?? 0} frames · ~{stats?.memoryMB ?? 0} / {stats?.budgetMB ?? 200} MB budget ·{" "}
          {stats?.blobs ?? 0} compressed frames cached · {stats?.draws ?? 0} draws
        </p>
      </section>

      <aside className="col-span-12 space-y-6 xl:col-span-4">
        <fieldset className="space-y-2">
          <legend className="font-heading text-lg font-bold">Plates</legend>
          {PLATE_IDS.map((id) => {
            const s = sources[id];
            return (
              <label key={id} className="flex items-center gap-3">
                <input type="radio" name="plate" checked={plate === id} onChange={() => setPlate(id)} className="accent-blue-600" />
                <span className="font-bold">{id}</span>
                <span className="text-sm text-muted">
                  {s ? `${s.frames} frames · ${s.width}×${s.height} · ${(s.bytes / 1e6).toFixed(1)} MB` : PLATES[id].fallback ? `missing → ${PLATES[id].fallback!.plate} ${PLATES[id].fallback!.frame}` : "missing → mood colour"}
                </span>
              </label>
            );
          })}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="font-heading text-lg font-bold">Focal point ({plate})</legend>
          {(["x", "y"] as const).map((axis, i) => (
            <label key={axis} className="flex items-center gap-3">
              <span className="w-4 font-bold">{axis}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={focal[plate][i]}
                onChange={(e) => {
                  const next: [number, number] = [...focal[plate]];
                  next[i] = Number(e.target.value);
                  setFocal({ ...focal, [plate]: next });
                }}
                className="flex-1 accent-blue-600"
              />
              <span className="w-10 text-right text-sm">{focal[plate][i].toFixed(2)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="font-heading text-lg font-bold">Journey track</legend>
          <label className="flex items-center gap-3">
            Pin length (vh)
            <input type="number" step={0.5} value={pinVh} onChange={(e) => setPinVh(Number(e.target.value))} className={field} />
          </label>
          <label className="flex items-center gap-3">
            Crossfade (vh)
            <input type="number" step={0.05} value={crossfade} onChange={(e) => setCrossfade(Number(e.target.value))} className={field} />
          </label>
          {track.map((seg, i) => (
            <div key={seg.plate} className="flex items-center gap-2 text-sm">
              <span className="w-8 font-bold">{seg.plate}</span>
              {(["from", "to"] as const).map((k) => (
                <input
                  key={k}
                  type="number"
                  step={0.01}
                  min={0}
                  max={1}
                  aria-label={`${seg.plate} ${k}`}
                  value={Number(seg[k].toFixed(3))}
                  onChange={(e) => setTrack(track.map((s, j) => (j === i ? { ...s, [k]: Number(e.target.value) } : s)))}
                  className={field}
                />
              ))}
            </div>
          ))}
        </fieldset>

        <div className="space-y-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(json);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="rounded-md bg-blue-600 px-4 py-2 font-bold text-white"
          >
            {copied ? "Copied" : "Copy values for world.config.ts"}
          </button>
          <pre className="max-h-64 overflow-auto rounded-md bg-white p-3 text-xs">{json}</pre>
        </div>
      </aside>
    </div>
  );
}
