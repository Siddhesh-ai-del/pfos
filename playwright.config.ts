// Playwright config for the PFOS local-dev surface.
// Dev server is assumed already running (start: npm run dev -- -p 3214).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 5_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PFOS_BASE_URL ?? "http://localhost:3214",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
