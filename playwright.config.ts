import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = 4174;

// In sandboxed CI-like environments without network access for
// `npx playwright install`, a Chromium build is preinstalled outside
// Playwright's own version-pinned cache directory (mirrors
// scripts/a11y-check.mjs, which needs the same fallback).
const preinstalledChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const launchOptions = existsSync(preinstalledChromium)
  ? { executablePath: preinstalledChromium, args: ["--no-sandbox"] }
  : {};

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
    launchOptions,
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // isTrustedOrigin() (src/lib/apiSecurity.ts) rejects any form POST whose
    // Origin header doesn't match SITE_URL, which otherwise defaults to the
    // production domain and would 403 every form submission made against
    // this local dev server.
    env: { NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}` },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
