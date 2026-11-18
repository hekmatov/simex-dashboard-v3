import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: fileURLToPath(new URL("./", import.meta.url)),
  testMatch: "v3-release-rollback.spec.js",
  outputDir: fileURLToPath(new URL("../../release/rollback-test-results", import.meta.url)),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: { storageState: { cookies: [], origins: [] }, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  // The owned fixture starts one ephemeral same-origin static server. No Vite,
  // build, companion server, existing browser profile or old preview is used.
});
