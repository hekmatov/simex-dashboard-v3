import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

export function resolvePdpcArtifactRoots(env = process.env, cwd = process.cwd()) {
  const deliverableRoot = path.resolve(cwd, env.SIMEX_PDPC_DELIVERABLE_ROOT
    ?? (env.SIMEX_PDPC_RELEASE_ROOT ? path.dirname(path.resolve(cwd, env.SIMEX_PDPC_RELEASE_ROOT)) : "release/pdpc-deliverables"));
  const releaseRoot = path.resolve(cwd, env.SIMEX_PDPC_RELEASE_ROOT ?? path.join(deliverableRoot, "Cloudflare"));
  if (env.SIMEX_PDPC_DELIVERABLE_ROOT && env.SIMEX_PDPC_RELEASE_ROOT
    && path.relative(deliverableRoot, path.dirname(releaseRoot)) !== "") {
    throw new Error("PDPC hosted and standalone overrides must belong to the same deliverable root.");
  }
  return { releaseRoot, deliverableRoot };
}

const { releaseRoot } = resolvePdpcArtifactRoots();

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["pdpc-release-output.spec.js", "pdpc-offline-output.spec.js"],
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: process.env.SIMEX_NATIVE_REPORT_DIR
    ? [["list"], ["json", { outputFile: path.resolve(process.env.SIMEX_NATIVE_REPORT_DIR, "pdpc.json") }]]
    : [["list"]],
  ...(process.env.SIMEX_NATIVE_REPORT_DIR ? { outputDir: path.resolve(process.env.SIMEX_NATIVE_REPORT_DIR, "pdpc-artifacts") } : {}),
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
