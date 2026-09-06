import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const releaseRoot = path.resolve(
  process.env.SIMEX_PDPC_RELEASE_ROOT ?? "release/pdpc",
);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["pdpc-release-output.spec.js"],
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4191",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/pdpc-static-server.mjs --variant biomedical --port 4191",
      env: { SIMEX_PDPC_RELEASE_ROOT: releaseRoot },
      url: "http://127.0.0.1:4191/__test_ready__",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node tests/e2e/pdpc-static-server.mjs --variant socioeconomic --port 4192",
      env: { SIMEX_PDPC_RELEASE_ROOT: releaseRoot },
      url: "http://127.0.0.1:4192/__test_ready__",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
