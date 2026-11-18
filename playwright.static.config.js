import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["v3-static-offline.spec.js", "static-content-portability.spec.js", "v3-view-performance.spec.js"],
  grep: /@production-static/,
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 25_000 },
  reporter: process.env.SIMEX_NATIVE_REPORT_DIR
    ? [["list"], ["json", { outputFile: path.resolve(process.env.SIMEX_NATIVE_REPORT_DIR, "static.json") }]]
    : [["list"]],
  ...(process.env.SIMEX_NATIVE_REPORT_DIR ? { outputDir: path.resolve(process.env.SIMEX_NATIVE_REPORT_DIR, "static-artifacts") } : {}),
  use: {
    baseURL: "http://127.0.0.1:4180",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/mock-companion-server.mjs --source",
      url: "http://127.0.0.1:4173/__test_ready__",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command:
        "pnpm build && pnpm preview --host 127.0.0.1 --port 4180 --strictPort",
      url: "http://127.0.0.1:4180/",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
