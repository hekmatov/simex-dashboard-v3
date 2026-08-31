import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
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
      command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4175 --strictPort",
      url: "http://127.0.0.1:4175/tests/e2e/embedded-echarts-harness.html",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4185 --strictPort",
      url: "http://127.0.0.1:4185/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
