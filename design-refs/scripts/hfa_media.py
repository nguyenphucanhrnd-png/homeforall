#!/usr/bin/env python3
"""
hfa_media.py - HomeForAll media pipeline (cross-platform: Windows / macOS / Linux).

Turns ONE master video into: scene clips, scroll "plates" (WebP frame sequences) and
one distinct high-resolution still per page. Also removes the Gemini sparkle logo.

Run from the PROJECT ROOT (the folder that contains package.json and design-refs/):

    python design-refs/scripts/hfa_media.py check          # what do I have? is it really 4K?
    python design-refs/scripts/hfa_media.py logo-preview   # before/after crop of the logo area
    python design-refs/scripts/hfa_media.py clean          # master.mp4 -> master-clean.mp4 (logo removed, no audio)
    python design-refs/scripts/hfa_media.py sample         # 2-second test clip to try an upscaler on first
    python design-refs/scripts/hfa_media.py fit4k --source design-refs/video/upscaled.mp4   # exact 3840x2160 -> master-4k.mp4
    python design-refs/scripts/hfa_media.py slice          # clips + stills (from timecodes file)
    python design-refs/scripts/hfa_media.py plates         # clips -> WebP frame sequences
    python design-refs/scripts/hfa_media.py all            # check + slice + plates

Options: --source PATH  --delogo / --no-delogo  --strict (fail if source is not true 4K)
         --plate-width N  --fps N  --quality N  --still-width N

Rules baked in (do not change without reason):
  * Never fakes resolution: nothing is upscaled here. If the source is 1280 wide, stills are 1280 wide
    and the script says so loudly. True 4K needs an AI upscale of the video first (see README).
  * Originals in design-refs/video/master*.mp4 are never modified or deleted.
  * Needs only Python 3.8+ and ffmpeg/ffprobe (with libx264 + libwebp) on PATH. No pip packages.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REFS = HERE.parent                      # design-refs/
ROOT = REFS.parent                      # project root
CONFIG_PATH = REFS / "media.config.json"


# --------------------------------------------------------------------------- helpers
_MASK_DIR = None          # temp folder holding the logo mask; ffmpeg runs with it as cwd so the filter path stays simple


def die(msg: str, code: int = 1) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        die(f"Missing {CONFIG_PATH}. Re-extract the kit.")
    with open(CONFIG_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def rel(p: Path) -> str:
    """Path relative to the project root when possible (Python 3.8-safe)."""
    try:
        return str(Path(p).resolve().relative_to(ROOT))
    except ValueError:
        return str(p)


def need_tools() -> None:
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            die(
                f"'{tool}' not found on PATH.\n"
                "  Windows: open PowerShell and run  winget install Gyan.FFmpeg  then open a NEW terminal.\n"
                "  macOS:   brew install ffmpeg      Linux: sudo apt install ffmpeg"
            )
    enc = subprocess.run(["ffmpeg", "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
    for name in ("libx264", "libwebp"):
        if name not in enc:
            die(f"Your ffmpeg has no '{name}' encoder. Install the 'full' or Gyan build of ffmpeg.")


def run(cmd: list, quiet: bool = True) -> subprocess.CompletedProcess:
    """Run ffmpeg; stdin is closed so it never swallows input; abort with the ffmpeg message on error."""
    cmd = [str(c) for c in cmd]
    res = subprocess.run(cmd, stdin=subprocess.DEVNULL, capture_output=True, text=True, cwd=_MASK_DIR)
    if res.returncode != 0:
        die("ffmpeg failed:\n  " + " ".join(cmd) + "\n" + res.stderr[-1500:])
    return res


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        capture_output=True, text=True, stdin=subprocess.DEVNULL,
    )
    if out.returncode != 0:
        die(f"ffprobe cannot read {path}: {out.stderr.strip()}")
    data = json.loads(out.stdout)
    v = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    if v is None:
        die(f"{path} has no video stream.")
    num, den = (v.get("avg_frame_rate") or "0/1").split("/")
    fps = float(num) / float(den) if float(den) else 0.0
    return {
        "width": int(v["width"]), "height": int(v["height"]), "fps": round(fps, 3),
        "duration": float(data["format"].get("duration", 0)),
        "has_audio": any(s["codec_type"] == "audio" for s in data["streams"]),
        "codec": v.get("codec_name"), "size_mb": round(int(data["format"].get("size", 0)) / 1e6, 1),
    }


def pick_source(cfg: dict, override: str | None) -> Path:
    if override:
        p = Path(override)
        p = p if p.is_absolute() else (Path.cwd() / p)
        if not p.exists():
            die(f"--source {override} not found.")
        return p
    for rel in cfg["sources_in_priority_order"]:
        p = REFS / rel
        if p.exists():
            return p
    die(
        "No master video found. Put your video at  design-refs/video/master.mp4\n"
        "  (optional upgrades: master-clean.mp4 = logo removed, master-4k.mp4 = AI-upscaled)."
    )


def should_delogo(src: Path, cfg: dict, flag: bool | None) -> bool:
    """Logo removal is applied inline unless the source is already clean."""
    if flag is not None:
        return flag
    stem = src.stem.lower()
    if stem.endswith("-clean"):
        return False
    if stem == "master-4k":
        return bool(cfg["logo"].get("apply_to_master_4k", False))
    return True


def delogo_filter(width: int, height: int, cfg: dict) -> str:
    """
    Remove the Gemini sparkle with ffmpeg's 'removelogo' filter and a pixel mask shaped like the 4-point star.
    Far less visible than a rectangular blur ('delogo') because only ~14% of a box is touched.
    The mask is built for THIS resolution from relative numbers, so it works at 720p, 1080p and 4K.
    (Measured on the 1280x720 master: star bbox x 1136-1183, y 576-623 -> centre 0.906/0.833, half-size 24 px.)
    """
    global _MASK_DIR
    L = cfg["logo"]
    r = L["half"] * width * (1 + L["margin"])        # half-size in px, square, plus safety margin
    cx, cy = L["cx"] * width, L["cy"] * height
    p = L["shape_p"]                                 # |x|^p + |y|^p <= r^p ; p<1 gives concave "sparkle" sides
    x0, x1 = max(0, int(cx - r) - 1), min(width, int(cx + r) + 2)
    y0, y1 = max(0, int(cy - r) - 1), min(height, int(cy + r) + 2)
    rows = bytearray(width * height)                 # 0 = keep, 255 = remove
    for y in range(y0, y1):
        dy = abs(y + 0.5 - cy) / r
        for x in range(x0, x1):
            if (abs(x + 0.5 - cx) / r) ** p + dy ** p <= 1.0:
                rows[y * width + x] = 255
    if _MASK_DIR is None:
        _MASK_DIR = tempfile.mkdtemp(prefix="hfa_mask_")
    with open(Path(_MASK_DIR) / "hfa_logo_mask.pgm", "wb") as fh:
        fh.write(("P5\n%d %d\n255\n" % (width, height)).encode("ascii"))
        fh.write(rows)
    return "removelogo=hfa_logo_mask.pgm"


def parse_timecodes(path: Path) -> tuple[list, list]:
    if not path.exists():
        die(f"Missing timecodes file {path}")
    clips, stills = [], []
    for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        p = line.split()
        try:
            if p[0] == "clip" and len(p) == 5:
                clips.append({"id": p[1], "name": p[2], "start": float(p[3]), "end": float(p[4])})
            elif p[0] == "still" and len(p) == 3:
                stills.append({"name": p[1], "t": float(p[2])})
            else:
                raise ValueError
        except ValueError:
            die(f"{path.name} line {n} is not valid: '{raw}'")
    return clips, stills


def true4k_verdict(info: dict, cfg: dict) -> tuple[bool, str]:
    ok = info["width"] >= cfg["true_4k_min_width"]
    if ok:
        return True, f"{info['width']}x{info['height']} is true 4K."
    return False, (
        f"NOT 4K: the source is {info['width']}x{info['height']}.\n"
        "      Stills and plates will be cut at that native size. This script does NOT fake 4K.\n"
        "      To get real 4K: AI-upscale the video first (README, 'Nang 4K'), save it as\n"
        "      design-refs/video/master-4k.mp4, then run this script again."
    )


# --------------------------------------------------------------------------- commands
def cmd_check(args, cfg) -> dict:
    need_tools()
    src = pick_source(cfg, args.source)
    info = probe(src)
    print(f"Project root : {ROOT}")
    print(f"Source       : {rel(src)}")
    print(f"Size         : {info['width']}x{info['height']} @ {info['fps']} fps, {info['duration']:.2f} s, "
          f"{info['codec']}, {info['size_mb']} MB, audio={'yes (will be dropped)' if info['has_audio'] else 'no'}")
    ok, msg = true4k_verdict(info, cfg)
    print(("[OK]   " if ok else "[WARN] ") + msg)
    print(f"Logo removal : {'will be applied: ' + delogo_filter(info['width'], info['height'], cfg) if should_delogo(src, cfg, args.delogo) else 'skipped (source already clean)'}")

    clips, stills = parse_timecodes(REFS / cfg["timecodes"])
    bad = 0
    for c in clips:
        if not (0 <= c["start"] < c["end"] <= info["duration"] + 0.05):
            print(f"[ERR]  clip {c['id']} {c['start']}-{c['end']} is outside 0-{info['duration']:.2f}s")
            bad += 1
    for s in stills:
        if not (0 <= s["t"] <= info["duration"]):
            print(f"[ERR]  still {s['name']} @ {s['t']}s is outside the video")
            bad += 1
    names = [s["name"] for s in stills]
    if len(names) != len(set(names)):
        print("[ERR]  duplicate still names")
        bad += 1
    times = [s["t"] for s in stills]
    if len(times) != len(set(times)):
        print("[ERR]  two stills use the same time -> two pages would show the same image")
        bad += 1
    print(f"Timecodes    : {len(clips)} clips, {len(stills)} stills, {'all valid' if not bad else str(bad) + ' problem(s)'}")
    if bad:
        die("Fix design-refs/video/master-timecodes.txt", 2)
    if args.strict and not ok:
        die("--strict: source is not true 4K.", 3)
    return {"src": src, "info": info, "true4k": ok}


def cmd_logo_preview(args, cfg) -> None:
    need_tools()
    src = pick_source(cfg, args.source)
    info = probe(src)
    w, h = info["width"], info["height"]
    L = cfg["logo"]
    # crop window = logo box with generous context
    cw, ch = int(w * 0.16), int(h * 0.28)
    cx, cy = min(w - cw, int(w * L["cx"] - cw / 2)), min(h - ch, int(h * L["cy"] - ch / 2))
    t = args.time if args.time is not None else min(12.0, max(0.0, info["duration"] / 2))
    out = REFS / "frames" / "_logo-check.png"
    out.parent.mkdir(exist_ok=True)
    crop = f"crop={cw}:{ch}:{cx}:{cy},scale=iw*3:ih*3:flags=neighbor"
    fc = (f"[0:v]split[a][b];[a]{crop}[before];[b]{delogo_filter(w, h, cfg)},{crop}[after];"
          f"[before][after]hstack")
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", t, "-i", src, "-frames:v", "1",
         "-filter_complex", fc, out])
    print(f"Wrote {rel(out)}  @ {t:.1f}s  (left = before, right = after, 3x zoom). Open it and check.")


def cmd_clean(args, cfg) -> None:
    need_tools()
    src = pick_source(cfg, args.source)
    info = probe(src)
    out = REFS / "video" / "master-clean.mp4"
    if src.resolve() == out.resolve():
        die("Source is already master-clean.mp4")
    vf = delogo_filter(info["width"], info["height"], cfg)
    # crf 10 + slow: this file is an INTERMEDIATE (it may be upscaled next), so keep it near-lossless.
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-an", "-vf", vf,
         "-c:v", "libx264", "-crf", "10", "-preset", "slow", "-pix_fmt", "yuv420p", out])
    new = probe(out)
    print(f"Wrote {rel(out)}  {new['width']}x{new['height']}  {new['size_mb']} MB  (logo removed, audio dropped, resolution unchanged)")
    print("Next: upscale THIS file to 4K (README), save as design-refs/video/master-4k.mp4, then run:  python design-refs/scripts/hfa_media.py all")


def cmd_sample(args, cfg) -> None:
    """Cut a 2 s test clip (a busy clay scene) so you can test an upscaler in a minute instead of an hour."""
    need_tools()
    src = REFS / "video" / "master-clean.mp4"
    if not src.exists():
        src = pick_source(cfg, args.source)
    t = args.time if args.time is not None else 11.6
    out = REFS / "video" / "_test-2s.mp4"          # leading underscore: pipeline ignores it
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", t, "-t", 2, "-i", src, "-an",
         "-c:v", "libx264", "-crf", "10", "-preset", "slow", "-pix_fmt", "yuv420p", out])
    print(f"Wrote {rel(out)} (2 s from {t}s of {src.name}). Upscale THIS first and judge the result.")


def cmd_fit4k(args, cfg) -> None:
    """Scale an upscaled video to EXACTLY 3840x2160 (e.g. after a 4x upscale gave 5120x2880) -> master-4k.mp4."""
    need_tools()
    if not args.source:
        die("Give the upscaled file:  fit4k --source design-refs/video/<upscaled>.mp4")
    src = Path(args.source)
    info = probe(src)
    if info["width"] < 2880 and not args.force:
        die(f"{src.name} is only {info['width']}px wide. Scaling it to 3840 would be a fake 4K.\n"
            "  Upscale it with an AI upscaler first (README), or add --force if you really want this.")
    if abs(info["width"] / info["height"] - 16 / 9) > 0.01:
        die("Source is not 16:9; refusing to stretch it.")
    out = REFS / "video" / "master-4k.mp4"
    vf = "scale=3840:2160:flags=lanczos" if info["width"] != 3840 else "null"
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-an", "-vf", vf,
         "-c:v", "libx264", "-crf", "12", "-preset", "slow", "-pix_fmt", "yuv420p", out])
    new = probe(out)
    print(f"Wrote {rel(out)}  {new['width']}x{new['height']}  {new['size_mb']} MB")
    print("Next: python design-refs/scripts/hfa_media.py all     (add --delogo if this file still has the Gemini sparkle)")


def cmd_slice(args, cfg, ctx=None) -> list:
    ctx = ctx or cmd_check(args, cfg)
    src, info = ctx["src"], ctx["info"]
    use_logo = should_delogo(src, cfg, args.delogo)
    vf_logo = delogo_filter(info["width"], info["height"], cfg) if use_logo else None
    clips, stills = parse_timecodes(REFS / cfg["timecodes"])
    still_w = min(args.still_width or cfg["stills"]["width"], info["width"])   # never upscale
    out_stills = (REFS / cfg["outputs"]["stills"]).resolve()
    masters = REFS / cfg["outputs"]["stills_master"]
    out_stills.mkdir(parents=True, exist_ok=True)
    masters.mkdir(parents=True, exist_ok=True)
    report = []

    print("\nClips (visually lossless re-encode, audio dropped, native resolution):")
    for c in clips:
        out = REFS / "video" / f"{c['id']}-{c['name']}.mp4"
        cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", c["start"], "-t", round(c["end"] - c["start"], 3), "-i", src, "-an"]
        if vf_logo:
            cmd += ["-vf", vf_logo]
        cmd += ["-c:v", "libx264", "-crf", cfg["clip"]["crf"], "-preset", cfg["clip"]["preset"], "-pix_fmt", "yuv420p", out]
        run(cmd)
        print(f"  {out.name:28s} {c['start']:>5.1f} -> {c['end']:>5.1f} s")

    print(f"\nStills (lossless PNG master + WebP q{cfg['stills']['quality']}, width {still_w}px):")
    for s in stills:
        png = masters / f"{s['name']}.png"
        cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", s["t"], "-i", src, "-frames:v", "1"]
        if vf_logo:
            cmd += ["-vf", vf_logo]
        cmd += [png]
        run(cmd)                                   # native resolution, lossless
        webp = out_stills / f"{s['name']}.webp"
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", png,
             "-vf", f"scale={still_w}:-2:flags=lanczos", "-c:v", "libwebp", "-quality", cfg["stills"]["quality"], webp])
        kb = webp.stat().st_size // 1024
        print(f"  {webp.name:28s} @ {s['t']:>5.1f} s   {still_w}px   {kb} KB")
        report.append({"name": s["name"], "t": s["t"], "width": still_w, "kb": kb})
    if not cfg["stills"].get("keep_png_masters", True):
        shutil.rmtree(masters, ignore_errors=True)

    ok, msg = true4k_verdict(info, cfg)
    if not ok:
        print("\n[WARN] " + msg)
    return report


def cmd_plates(args, cfg) -> None:
    need_tools()
    clips = sorted((REFS / "video").glob("s[0-9][0-9]-*.mp4"))
    if not clips:
        die("No clips design-refs/video/sNN-*.mp4. Run the 'slice' command first.")
    P = cfg["plates"]
    fps = args.fps or P["fps"]
    q = args.quality or P["quality"]
    out_root = (REFS / cfg["outputs"]["plates"]).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    total = 0
    print(f"\nPlates: {len(clips)} clips, {fps} fps, WebP q{q}")
    for clip in clips:
        pid = clip.name.split("-")[0]
        info = probe(clip)
        w = min(args.plate_width or P["width"], info["width"])           # never upscale
        pw = min(P["poster_width"], info["width"])
        d = out_root / pid
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True)
        vf = f"fps={fps},scale={w}:-2:flags=lanczos"
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", clip, "-an", "-vf", vf,
             "-c:v", "libwebp", "-quality", q, str(d / "f_%03d.webp")])
        pvf = f"scale={pw}:-2:flags=lanczos"
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", clip, "-an", "-vf", pvf, "-frames:v", "1",
             "-c:v", "libwebp", "-quality", 85, d / "poster.webp"])
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-sseof", "-0.15", "-i", clip, "-an", "-vf", pvf,
             "-update", 1, "-frames:v", 1, "-c:v", "libwebp", "-quality", 85, d / "last.webp"])
        frames = len(list(d.glob("f_*.webp")))
        size = sum(f.stat().st_size for f in d.iterdir())
        total += size
        manifest = {"id": pid, "source": clip.name, "frames": frames, "fps": fps, "width": w,
                    "height": round(w * info["height"] / info["width"] / 2) * 2,
                    "duration_s": round(info["duration"], 3), "pattern": "f_%03d.webp", "bytes": size}
        (d / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print(f"  {pid}  frames={frames:3d}  {w}px  {size / 1e6:5.1f} MB")
    print(f"  TOTAL {total / 1e6:.1f} MB   (guide: hero plate < 6 MB, all plates < 30 MB; if larger lower --plate-width or --quality)")


def cmd_all(args, cfg) -> None:
    ctx = cmd_check(args, cfg)
    cmd_slice(args, cfg, ctx)
    cmd_plates(args, cfg)
    print("\nDone. Now start Claude Code from the project root and paste design-refs/CLAUDE_CODE_PROMPT.md")


# --------------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description="HomeForAll media pipeline")
    ap.add_argument("command", choices=["check", "logo-preview", "clean", "sample", "fit4k", "slice", "plates", "all"])
    ap.add_argument("--source", help="video file to use instead of the default priority list")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--delogo", dest="delogo", action="store_true", default=None, help="force logo removal")
    g.add_argument("--no-delogo", dest="delogo", action="store_false", help="skip logo removal")
    ap.add_argument("--strict", action="store_true", help="fail unless the source is true 4K")
    ap.add_argument("--plate-width", type=int)
    ap.add_argument("--still-width", type=int)
    ap.add_argument("--fps", type=int)
    ap.add_argument("--quality", type=int)
    ap.add_argument("--force", action="store_true", help="fit4k: allow scaling a small source (fake 4K)")
    ap.add_argument("--time", type=float, help="logo-preview: which second of the video to inspect")
    args = ap.parse_args()
    cfg = load_config()
    {
        "check": cmd_check, "logo-preview": cmd_logo_preview, "clean": cmd_clean,
        "sample": cmd_sample, "fit4k": cmd_fit4k,
        "slice": cmd_slice, "plates": cmd_plates, "all": cmd_all,
    }[args.command](args, cfg)


if __name__ == "__main__":
    main()
