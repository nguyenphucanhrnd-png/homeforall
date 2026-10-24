import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// Desktop-first (prompt §8): design at 1440, check 1280 and 1920.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // The landing renders WebGL in software (SwiftShader) in headless runs; keep load reasonable.
  workers: process.env.CI ? 2 : 4,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "vi-VN",
  },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  // Run `npm run build` first; e2e always tests the production build.
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/vi`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
