// Build partner logos from partner_logo/ (originals, never modified) into
// public/assets/partners/<slug>/logo.webp|svg + manifest.json.
//
//   npm run images:partners
//
// Rules (prompt bundle §D): map files by normalised name; stop if a file matches
// nothing or two files match one brand; reject SVGs with scripts, event handlers
// or external references; never upscale, recolour, crop or stretch; flag logos
// narrower than 320 px.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = join(ROOT, "partner_logo");
const OUT = join(ROOT, "public/assets/partners");
const MAX_WIDTH = 640; // display is ≤ 160×64; 640 covers 4× density without upscaling
const MIN_WIDTH = 320;

const BRANDS = [
  { slug: "cocoon", match: (n) => n.includes("cocoon") },
  { slug: "msd-animal-health", match: (n) => n.includes("msd") },
  { slug: "farmina-pet-foods", match: (n) => n.includes("farmina") },
];
const EXT = new Set([".svg", ".png", ".webp", ".jpg", ".jpeg"]);

const normalise = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "");

function fail(msg) {
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
}

if (!existsSync(SRC)) fail("partner_logo/ not found (run from the project root).");

const files = readdirSync(SRC).filter((f) => EXT.has(extname(f).toLowerCase()));
const mapping = new Map();
for (const file of files) {
  const n = normalise(file);
  const hits = BRANDS.filter((b) => b.match(n));
  if (hits.length !== 1) fail(`"${file}" matches ${hits.length ? hits.map((h) => h.slug).join(" + ") : "no brand"}. Rename it and re-run.`);
  const slug = hits[0].slug;
  if (mapping.has(slug)) fail(`Two files match "${slug}": "${mapping.get(slug)}" and "${file}". Keep one.`);
  mapping.set(slug, file);
}
for (const b of BRANDS) if (!mapping.has(b.slug)) console.warn(`WARN: no logo file for ${b.slug} (the brand name will be shown as text).`);

console.log("Logo mapping:");
for (const [slug, file] of mapping) console.log(`  ${file.padEnd(22)} → ${slug}`);

rmSync(OUT, { recursive: true, force: true });
const manifest = {};

for (const [slug, file] of mapping) {
  const src = join(SRC, file);
  const dir = join(OUT, slug);
  mkdirSync(dir, { recursive: true });
  const warnings = [];

  if (extname(file).toLowerCase() === ".svg") {
    const svg = readFileSync(src, "utf8");
    if (/<script/i.test(svg)) fail(`${file}: SVG contains <script>.`);
    if (/\son[a-z]+\s*=/i.test(svg)) fail(`${file}: SVG contains event handlers.`);
    if (/(href|src)\s*=\s*["'](?!#|data:image\/)/i.test(svg) || /url\(\s*["']?(?!#)/i.test(svg)) {
      fail(`${file}: SVG references external resources.`);
    }
    writeFileSync(join(dir, "logo.svg"), svg);
    manifest[slug] = { file: `/assets/partners/${slug}/logo.svg`, source: file, width: null, height: null, warnings };
    console.log(`  ${slug}: SVG copied (sanitised check passed)`);
    continue;
  }

  const meta = await sharp(src).metadata();
  if (meta.width < MIN_WIDTH) warnings.push(`only ${meta.width}px wide (< ${MIN_WIDTH}px): ask the brand for a larger or vector logo`);
  // Shrink only; never enlarge, crop or recolour. Metadata (EXIF) is dropped by default.
  const out = await sharp(src)
    .resize({ width: Math.min(meta.width, MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(join(dir, "logo.webp"));
  manifest[slug] = { file: `/assets/partners/${slug}/logo.webp`, source: file, width: out.width, height: out.height, warnings };
  console.log(`  ${slug}: ${meta.width}×${meta.height} ${meta.format} → ${out.width}×${out.height} webp${warnings.length ? `  ⚠ ${warnings.join("; ")}` : ""}`);
}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nWrote ${Object.keys(manifest).length} logo(s) to public/assets/partners/ (git-ignored).`);
