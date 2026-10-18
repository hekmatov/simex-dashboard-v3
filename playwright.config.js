import { defineConfig, devices } from "@playwright/test";
import { LEGACY_STORAGE_STATE } from "./tests/e2e/support/legacyContractFixture.js";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["pdpc-release-output.spec.js"],
  grepInvert: /@production-static/,
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 20_000,
  },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    storageState: LEGACY_STORAGE_STATE,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node tests/e2e/mock-companion-server.mjs --source",
      url: "http://127.0.0.1:4173/__test_ready__",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node tests/e2e/fixture-vite-server.mjs --port 4175",
      url: "http://127.0.0.1:4175/tests/e2e/embedded-echarts-harness.html",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node tests/e2e/fixture-vite-server.mjs --port 4185",
      url: "http://127.0.0.1:4185/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
