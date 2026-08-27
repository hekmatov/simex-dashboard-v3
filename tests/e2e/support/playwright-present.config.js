import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "..",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4185",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node ../../../node_modules/vite/bin/vite.js ../../.. --host 127.0.0.1 --port 4185 --strictPort --force",
    url: "http://127.0.0.1:4185/",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
