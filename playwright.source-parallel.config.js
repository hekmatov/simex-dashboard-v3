import { defineConfig } from "@playwright/test";

import sourceConfig from "./playwright.config.js";

// These files exercise the mock companion server's mutable catalogue and
// connected-client state. Run them first with one worker and a fresh server.
export default defineConfig({
  ...sourceConfig,
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
  workers: 4,
});
