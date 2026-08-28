import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createOperationStatusQueue } from "../src/lib/operationStatusQueue.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: AppFrame },
  { resolveDashboardTheme },
  {
    createOperationStatusProviderQueueOwner,
    default: OperationStatusProvider,
  },
  { measureOperationStatusDrawerOffset },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/app-shell/AppFrame.jsx"),
  vite.ssrLoadModule("/src/theme/dashboardTheme.js"),
  vite.ssrLoadModule("/src/components/app-shell/OperationStatusProvider.jsx"),
  vite.ssrLoadModule("/src/components/app-shell/OperationStatusViewport.jsx"),
]);
await vite.close();

test("AppFrame exposes the resolved dashboard theme at the shell boundary", () => {
  const theme = resolveDashboardTheme({
    globalStyles: {
      dashboardStyle: "humanist-standard",
      dashboardColorProfile: "utility/prismatic-index",
      chartColorMode: "standard",
    },
    appearancePreference: "dark",
  });
  const queue = createOperationStatusQueue({ scheduler: staticScheduler });
  const html = renderToStaticMarkup(React.createElement(
    OperationStatusProvider,
    { queue },
    React.createElement(AppFrame, {
      mode: "view",
      density: "comfortable",
      theme,
      children: React.createElement("main", null, "Dashboard"),
    }),
  ));

  assert.match(html, /data-dashboard-style="humanist-standard"/);
  assert.match(html, /data-dashboard-color-profile="utility\/prismatic-index"/);
  assert.match(html, /data-chart-color-mode="standard"/);
  assert.match(html, /data-appearance-preference="dark"/);
  assert.match(html, /data-resolved-appearance="dark"/);
  assert.match(html, /--simex-surface-panel:#202029/);
  assert.match(html, /--simex-data-1:#86b3dd/);
});

test("AppFrame renders one atomic live transition and drawer/footer-safe status geometry", () => {
  const queue = createOperationStatusQueue({ scheduler: staticScheduler });
  queue.beginOperation({
    key: "source-load",
    label: "Loading source",
    blocking: true,
  }).fail(new Error("Source load failed"));

  const html = renderToStaticMarkup(React.createElement(
    OperationStatusProvider,
    { queue },
    React.createElement(AppFrame, {
      mode: "build",
      density: "compact",
      rightDrawer: "map",
      children: React.createElement("main", null, "Dashboard"),
    }),
  ));

  assert.match(html, /class="operation-status-viewport"/);
  assert.match(html, /data-right-drawer="map"/);
  assert.match(html, /--operation-status-drawer-offset:0px/);
  assert.match(html, /right:calc\(var\(--operation-status-drawer-offset\) \+ max\(16px, env\(safe-area-inset-right\)\)\)/);
  assert.match(html, /bottom:calc\(var\(--operation-status-footer-offset\) \+ max\(16px, env\(safe-area-inset-bottom\)\)\)/);
  assert.match(html, /data-live-region="assertive"[^>]*aria-live="assertive"[^>]*aria-atomic="true"[^>]*>Source load failed</);
  assert.match(html, /data-live-region="polite"[^>]*aria-live="polite"[^>]*aria-atomic="true"><\/span>/);
  assert.match(html, /data-operation-status="failed"/);
  assert.match(html, />Failed</);
  assert.match(html, /aria-label="Dismiss Loading source status"/);
});

test("completed operation transitions use the single polite live message", () => {
  const queue = createOperationStatusQueue({ scheduler: staticScheduler });
  queue.beginOperation({ key: "layout", label: "Saving layout", blocking: true })
    .succeed("Layout saved");
  const html = renderToStaticMarkup(React.createElement(
    OperationStatusProvider,
    { queue },
    React.createElement(AppFrame, {
      mode: "build",
      density: "compact",
      rightDrawer: "look",
      children: React.createElement("main", null, "Dashboard"),
    }),
  ));

  assert.match(html, /data-operation-status="completed"/);
  assert.match(html, /data-live-region="polite"[^>]*>Layout saved</);
  assert.match(html, /--operation-status-drawer-offset:0px/);
});

test("operation status reserves the measured tablet drawer but not a full-screen mobile drawer", () => {
  assert.equal(measureOperationStatusDrawerOffset({
    viewportWidth: 820,
    drawerRect: { left: 420, right: 820 },
  }), 400);
  assert.equal(measureOperationStatusDrawerOffset({
    viewportWidth: 820,
    drawerRect: { left: 12, right: 808 },
  }), 0);
  assert.equal(measureOperationStatusDrawerOffset({
    viewportWidth: 390,
    drawerRect: { left: 0, right: 390 },
  }), 0);
});

test("operation status provider cleanup disposes only its internally owned queue", () => {
  let injectedDisposals = 0;
  const injectedQueue = { dispose: () => { injectedDisposals += 1; } };
  const injectedOwner = createOperationStatusProviderQueueOwner({
    suppliedQueue: injectedQueue,
    createQueue: () => assert.fail("an injected queue must be reused"),
  });
  assert.equal(injectedOwner.queue, injectedQueue);
  injectedOwner.dispose();
  assert.equal(injectedDisposals, 0);

  let internalDisposals = 0;
  const internalQueue = { dispose: () => { internalDisposals += 1; } };
  const internalOwner = createOperationStatusProviderQueueOwner({
    createQueue: () => internalQueue,
  });
  assert.equal(internalOwner.queue, internalQueue);
  internalOwner.dispose();
  assert.equal(internalDisposals, 1);
});

const staticScheduler = {
  setTimeout: () => 1,
  clearTimeout: () => {},
};
