"""
One-off: turns public/brand/logo-source.png (white background) into transparent
brand assets. Re-run only if the source logo changes; outputs are committed.

    python scripts/brand/make-logo-assets.py

Needs Pillow. Crop boxes were measured from the supplied 628x631 PNG.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/brand/logo-source.png"
OUT = ROOT / "public/brand"
APP = ROOT / "src/app"

BOXES = {  # (left, top, right, bottom), inclusive of a 4px margin
    "logo": (110, 31, 541, 574),
    "logo-mark": (110, 31, 541, 500),
    "logo-wordmark": (141, 504, 519, 574),
}
CREAM = (255, 246, 238, 255)


def remove_white_background(img: Image.Image) -> Image.Image:
    """Make every near-white pixel transparent (the logo has no intentional white:
    gaps and letter counters must show the page colour, also on navy), then
    soften the anti-aliased edge band."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    is_bg = [[min(px[x, y][:3]) >= 235 for x in range(w)] for y in range(h)]

    for y in range(h):
        for x in range(w):
            if is_bg[y][x]:
                px[x, y] = (255, 255, 255, 0)
                continue
            near_bg = any(
                is_bg[ny][nx]
                for nx in range(max(0, x - 2), min(w, x + 3))
                for ny in range(max(0, y - 2), min(h, y + 3))
            )
            if near_bg:  # colour-to-alpha against white for anti-aliased edges
                r, g, b, _ = px[x, y]
                alpha = max((255 - c) / 255 for c in (r, g, b))
                if alpha <= 0.02:
                    px[x, y] = (255, 255, 255, 0)
                else:
                    un = [round(255 - (255 - c) / alpha) for c in (r, g, b)]
                    px[x, y] = (*[max(0, min(255, c)) for c in un], round(alpha * 255))
    return img


def square(img: Image.Image, size: int, pad: float, bg=(0, 0, 0, 0)) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    inner = round(size * (1 - 2 * pad))
    fitted = img.copy()
    fitted.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    canvas.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return canvas


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    assets = {}
    for name, box in BOXES.items():
        asset = remove_white_background(src.crop(box))
        asset.save(OUT / f"{name}.png", optimize=True)
        assets[name] = asset
        print(f"{name}.png {asset.size}")

    mark = assets["logo-mark"]
    square(mark, 512, 0.04).save(APP / "icon.png", optimize=True)
    square(mark, 180, 0.1, CREAM).convert("RGB").save(APP / "apple-icon.png", optimize=True)
    print("icon.png, apple-icon.png")


if __name__ == "__main__":
    main()
