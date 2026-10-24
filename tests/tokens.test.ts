import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Reads the real tokens from globals.css so the test fails if someone edits a colour. */
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
const tokens = Object.fromEntries(
  [...root.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name, hex]),
);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(tokens[a]), luminance(tokens[b])].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [text, background] pairs the UI actually uses. Add a row when you add a pairing.
const PAIRS: Array<[string, string]> = [
  ["ink", "cream-50"],
  ["ink", "white"],
  ["ink", "orange-500"], // primary CTA
  ["ink", "peach-300"],
  ["white", "blue-600"], // secondary CTA
  ["white", "blue-800"],
  ["white", "navy-900"],
  ["peach-200", "navy-900"],
  ["muted", "cream-50"],
  ["muted", "white"],
  ["blue-600", "cream-50"],
  ["blue-600", "white"],
  ["blue-800", "blue-100"], // ghost hover
  ["blue-800", "cream-50"],
  ["orange-700", "cream-50"],
  ["orange-700", "white"],
  ["danger", "white"],
  ["danger", "cream-50"],
  ["success", "white"],
  ["success", "cream-50"],
  ["warning", "white"],
  ["warning", "cream-50"],
];

describe("design tokens", () => {
  it("parsed every colour token", () => {
    expect(Object.keys(tokens).length).toBeGreaterThanOrEqual(17);
  });

  it.each(PAIRS)("%s on %s meets WCAG AA (4.5:1)", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("white on orange stays forbidden", () => {
    expect(contrast("white", "orange-500")).toBeLessThan(4.5);
  });

  it("logo blue (blue-500) is decorative only: neither ink nor white text passes on it", () => {
    expect(contrast("white", "blue-500")).toBeLessThan(4.5);
    expect(contrast("ink", "blue-500")).toBeLessThan(4.5);
  });

  it("blue-600 text on blue-100 fails, so ghost hover must switch to blue-800", () => {
    expect(contrast("blue-600", "blue-100")).toBeLessThan(4.5);
  });
});
