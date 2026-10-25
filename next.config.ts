import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// A full CSP lands in M5 once the 3D, map and Turnstile origins are known.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // partialPrefetching off: Vercel output fails on its per-segment .rsc files (ENOENT on *.segment.rsc.func).
  partialPrefetching: false,
  poweredByHeader: false,
  // Files read with fs at runtime (spots, wards, vet list, plate/still manifests).
  outputFileTracingIncludes: {
    "/*": ["./design-refs/data/*.csv", "./src/data/*.json", "./public/assets/**/manifest.json", "./public/assets/stills/*.webp"],
    // Linux sharp binaries for builds made on Windows and deployed with --prebuilt.
    "/[locale]/report": ["./node_modules/@img/sharp-linux-x64/**", "./node_modules/@img/sharp-libvips-linux-x64/**"],
    "/[locale]/report/track/[token]": ["./node_modules/@img/sharp-linux-x64/**", "./node_modules/@img/sharp-libvips-linux-x64/**"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
