import type { PlateSource, PlateSources } from "./plate-types";
import { MOODS, PLATES, type PlateId } from "./world.config";

// ScrollPlate engine (v4 §6): draws WebP frame sequences onto one 2D canvas.
//
// Memory is the constraint: a 1920×1080 frame is ~8 MB once decoded, a 4K one
// ~33 MB. Decoded ImageBitmaps live in an LRU sized by a BYTE budget (default
// 200 MB ≈ 24 frames at 1080p, ≈ 6 at 4K, ≈ 54 at today's 720p plates).
// Compressed blobs are cached separately (tens of KB each). Missing frames fall
// back to the nearest decoded frame of the same plate, then to the mood colour.
//
// Plates are ~12 fps, so a slow scrub would look stepped: at a fractional frame
// position the two neighbouring frames are blended (frame i, then i+1 with
// alpha = fraction). An optional zoom gives a subtle camera drift during holds.

export type Layer = {
  plate: PlateId | null;
  /** Playhead 0–1 within the plate. */
  t: number;
  /** Opacity of this layer (crossfades). */
  alpha: number;
  /** Mood-colour veil drawn over this layer (0–1). */
  dim?: number;
  /** Camera drift: draw scale ≥ 1 (e.g. 1 → 1.03), anchored on the plate's focal point. */
  zoom?: number;
};

type Resolved = { kind: "frame"; src: PlateSource; index: number; frac: number } | { kind: "colour"; colour: string };

export type EngineStats = {
  decoded: number;
  budgetMB: number;
  blobs: number;
  memoryMB: number;
  draws: number;
};

export class PlateEngine {
  private ctx: CanvasRenderingContext2D;
  private blobs = new Map<string, Promise<Blob | null>>();
  private bitmaps = new Map<string, ImageBitmap>(); // insertion order = LRU order
  private inflight = new Set<string>();
  private queue: Array<{ key: string; url: string }> = [];
  private lastSignature = "";
  private lastIndex = new Map<PlateId, number>();
  private dirty = true;
  private draws = 0;
  private destroyed = false;
  onFirstFrame?: () => void;
  private firstFrameDone = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private sources: PlateSources,
    private opts: { maxBytes: number; maxDpr: number; concurrency?: number } = { maxBytes: 200 * 1048576, maxDpr: 1.5 },
  ) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.ctx.imageSmoothingQuality = "high";
    this.dirty = true;
  }

  // ─── Resolution: plate + playhead → concrete frame or colour ────────────────
  private resolve(plate: PlateId, t: number): Resolved {
    const src = this.sources[plate];
    if (src) {
      const pos = Math.min(1, Math.max(0, t)) * (src.frames - 1);
      const index = Math.min(src.frames - 1, Math.floor(pos));
      return { kind: "frame", src, index, frac: index >= src.frames - 1 ? 0 : pos - index };
    }
    const fb = PLATES[plate].fallback;
    if (fb) return this.resolve(fb.plate, fb.frame === "last" ? 1 : 0);
    return { kind: "colour", colour: MOODS[PLATES[plate].mood] };
  }

  private url(src: PlateSource, index: number) {
    const n = String(index + 1).padStart(3, "0");
    return `${src.base}/${src.pattern.replace("%03d", n)}`;
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  private blob(url: string) {
    let p = this.blobs.get(url);
    if (!p) {
      p = fetch(url, { priority: "low" } as RequestInit)
        .then((r) => (r.ok ? r.blob() : null))
        .catch(() => null);
      this.blobs.set(url, p);
    }
    return p;
  }

  /** Fetch every compressed frame of a plate (cheap; decoding stays lazy). */
  warm(plate: PlateId) {
    const src = this.sources[plate];
    if (!src) return;
    for (let i = 0; i < src.frames; i++) void this.blob(this.url(src, i));
  }

  private want(src: PlateSource, center: number, direction: number) {
    // Ahead of the scroll direction gets most of the window (the slower journey
    // scrub dwells longer per frame, so look farther ahead than behind).
    const ahead = 16;
    const behind = 4;
    const keys: Array<{ key: string; url: string }> = [];
    for (let d = 0; d <= ahead; d++) {
      const i = center + d * (direction >= 0 ? 1 : -1);
      if (i >= 0 && i < src.frames) keys.push({ key: `${src.id}:${i}`, url: this.url(src, i) });
    }
    for (let d = 1; d <= behind; d++) {
      const i = center - d * (direction >= 0 ? 1 : -1);
      if (i >= 0 && i < src.frames) keys.push({ key: `${src.id}:${i}`, url: this.url(src, i) });
    }
    return keys;
  }

  private schedule(wanted: Array<{ key: string; url: string }>) {
    // Newest request wins: replace the queue instead of growing it.
    this.queue = wanted.filter((w) => !this.bitmaps.has(w.key) && !this.inflight.has(w.key));
    this.pump();
  }

  private pump() {
    const max = this.opts.concurrency ?? 4;
    while (this.inflight.size < max && this.queue.length) {
      const { key, url } = this.queue.shift()!;
      this.inflight.add(key);
      this.blob(url)
        .then((b) => (b ? createImageBitmap(b) : null))
        .then((bmp) => {
          if (!bmp) return;
          if (this.destroyed) return bmp.close();
          this.bitmaps.set(key, bmp);
          this.bytes += bmp.width * bmp.height * 4;
          this.evict();
          this.dirty = true;
        })
        .catch(() => undefined)
        .finally(() => {
          this.inflight.delete(key);
          this.pump();
        });
    }
  }

  private bytes = 0;

  private evict() {
    // Oldest first; always keep the two most recent frames so something can be drawn.
    for (const [key, bmp] of this.bitmaps) {
      if (this.bytes <= this.opts.maxBytes || this.bitmaps.size <= 2) break;
      this.bytes -= bmp.width * bmp.height * 4;
      bmp.close();
      this.bitmaps.delete(key);
    }
  }

  private get(key: string) {
    const bmp = this.bitmaps.get(key);
    if (bmp) {
      this.bitmaps.delete(key); // touch → most recently used
      this.bitmaps.set(key, bmp);
    }
    return bmp;
  }

  private nearest(src: PlateSource, index: number) {
    for (let d = 1; d < src.frames; d++) {
      const a = this.bitmaps.get(`${src.id}:${index - d}`);
      if (a) return a;
      const b = this.bitmaps.get(`${src.id}:${index + d}`);
      if (b) return b;
    }
    return undefined;
  }

  // ─── Drawing ────────────────────────────────────────────────────────────────
  /** Draw the given layers. Cheap to call every tick: skips when nothing changed. */
  render(layers: Layer[]) {
    const resolved = layers.map((l) => ({ l, r: l.plate ? this.resolve(l.plate, l.t) : null }));
    const signature = resolved
      .map(({ l, r }) =>
        r?.kind === "frame"
          ? `${r.src.id}:${r.index}:${r.frac.toFixed(2)}:${l.alpha.toFixed(2)}:${(l.dim ?? 0).toFixed(2)}:${(l.zoom ?? 1).toFixed(4)}`
          : r
            ? `${r.colour}:${l.alpha.toFixed(2)}`
            : "-",
      )
      .join("|");

    // Ask for the frames we need (and the ones just ahead).
    const wanted: Array<{ key: string; url: string }> = [];
    for (const { r } of resolved) {
      if (r?.kind !== "frame") continue;
      const prev = this.lastIndex.get(r.src.id) ?? r.index;
      wanted.push(...this.want(r.src, r.index, r.index - prev));
      this.lastIndex.set(r.src.id, r.index);
    }
    if (wanted.length) this.schedule(wanted);

    if (signature === this.lastSignature && !this.dirty) return;
    this.lastSignature = signature;
    this.dirty = false;

    const { ctx, canvas } = this;
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let drewFrame = false;

    for (const { l, r } of resolved) {
      if (!r || l.alpha <= 0) continue;
      ctx.globalAlpha = Math.min(1, l.alpha);
      if (r.kind === "colour") {
        ctx.fillStyle = r.colour;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        const bmp = this.get(`${r.src.id}:${r.index}`) ?? this.nearest(r.src, r.index);
        if (bmp) {
          const { focal } = PLATES[r.src.id];
          this.cover(bmp, focal, l.zoom);
          // Blend toward the next frame at fractional positions (only if it is decoded).
          const next = r.frac > 0.02 ? this.get(`${r.src.id}:${r.index + 1}`) : undefined;
          if (next) {
            ctx.globalAlpha = Math.min(1, l.alpha) * r.frac;
            this.cover(next, focal, l.zoom);
          }
          drewFrame = true;
        } else {
          ctx.fillStyle = MOODS[PLATES[r.src.id].mood];
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      if (l.dim && l.plate) {
        ctx.globalAlpha = Math.min(1, l.alpha) * l.dim;
        ctx.fillStyle = MOODS[PLATES[l.plate].mood];
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    ctx.globalAlpha = 1;
    this.draws++;
    if (drewFrame && !this.firstFrameDone) {
      this.firstFrameDone = true;
      this.onFirstFrame?.();
    }
  }

  /** object-fit: cover with a focal point; `zoom` scales around that point. */
  private cover(img: ImageBitmap, [fx, fy]: [number, number], zoom = 1) {
    const { width: cw, height: ch } = this.canvas;
    const scale = Math.max(cw / img.width, ch / img.height) * Math.max(1, zoom);
    const dw = img.width * scale;
    const dh = img.height * scale;
    this.ctx.drawImage(img, (cw - dw) * fx, (ch - dh) * fy, dw, dh);
  }

  stats(): EngineStats {
    return {
      decoded: this.bitmaps.size,
      budgetMB: Math.round(this.opts.maxBytes / 1048576),
      blobs: this.blobs.size,
      memoryMB: Math.round((this.bytes / 1048576) * 10) / 10,
      draws: this.draws,
    };
  }

  destroy() {
    this.destroyed = true;
    for (const b of this.bitmaps.values()) b.close();
    this.bitmaps.clear();
    this.bytes = 0;
    this.queue = [];
  }
}
