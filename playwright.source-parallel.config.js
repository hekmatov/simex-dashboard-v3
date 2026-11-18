import { defineConfig } from "@playwright/test";
import path from "node:path";

import sourceConfig from "./playwright.config.js";

// These files exercise the mock companion server's mutable catalogue and
// connected-client state. Run them first with one worker and a fresh server.
export default defineConfig({
  ...sourceConfig,
  ...(process.env.SIMEX_NATIVE_REPORT_DIR ? {
    reporter: [["list"], ["json", { outputFile: path.resolve(process.env.SIMEX_NATIVE_REPORT_DIR, "source.json") }]],
    outputDir: path.resolve(process.env.SIMEX_NATIVE_REPORT_DIR, "source-artifacts"),
  } : {}),
  testIgnore: [
    ...sourceConfig.testIgnore,
    "quorum-companion.spec.js",
    "static-image-audience.spec.js",
  ],
  webServer: [
    {
      ...sourceConfig.webServer[0],
      command: `${sourceConfig.webServer[0].command} --catalogue-default-absent`,
    },
    ...sourceConfig.webServer.slice(1),
  ],
  // Laptop gates start with one worker; an explicit CLI override can use
  // measured headroom without changing the selected test inventory.
  workers: 1,
});
