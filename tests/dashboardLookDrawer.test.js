import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
let Drawer;
let lookModel = {};
try {
  [{ default: Drawer }, lookModel] = await Promise.all([
    vite.ssrLoadModule("/src/components/dashboard-look/DashboardLookDrawer.jsx"),
    vite.ssrLoadModule("/src/theme/dashboardLookDraft.js"),
  ]);
} catch (error) {
  if (error?.code !== "ERR_LOAD_URL" && error?.code !== "ENOENT") throw error;
}
await vite.close();

const saved = {
  dashboardStyle: "evidence-ledger",
  dashboardColorProfile: "evidence-ledger/brighter-vellum",
  chartColorMode: "profile",
  appearancePreference: "system",
};
const preview = {
  ...saved,
  dashboardStyle: "humanist-standard",
  dashboardColorProfile: "utility/prismatic-index",
  appearancePreference: "dark",
};

test("approved look drawer exposes all values with immediate persistence and no visual scrim", () => {
  assert.equal(typeof Drawer, "function");
  if (typeof Drawer !== "function") return;

  const html = renderToStaticMarkup(React.createElement(Drawer, {
    open: true,
    saved,
    preview,
    onCancel: () => {},
    onPreviewChange: () => {},
  }));

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /class="look-drawer-click-catcher"/);
  assert.doesNotMatch(html, /scrim|backdrop-filter|opacity:/i);
  assert.equal((html.match(/data-profile-option=/g) ?? []).length, 15);
  assert.doesNotMatch(html, />Set (?:dashboard look|chart colors|appearance)<\/button>/);
  assert.match(html, /Selections are saved automatically/);
  assert.match(html, /Saved[\s\S]*Preview/);
});

test("look ownership helpers keep the three commit scopes independent", () => {
  assert.equal(typeof lookModel.dashboardLookUpdates, "function");
  assert.equal(typeof lookModel.chartColorUpdates, "function");
  assert.equal(typeof lookModel.signatureProfileForStyle, "function");
  if (typeof lookModel.dashboardLookUpdates !== "function") return;

  assert.deepEqual(lookModel.dashboardLookUpdates(preview), {
    dashboardStyle: "humanist-standard",
    dashboardColorProfile: "utility/prismatic-index",
  });
  assert.deepEqual(lookModel.chartColorUpdates(preview), {
    chartColorMode: "profile",
  });
  assert.equal(
    lookModel.signatureProfileForStyle("humanist-standard"),
    "humanist-standard/common-ground",
  );
});

test("look drawer preview carries resolved shared-surface attributes without mutating saved values", () => {
  assert.equal(typeof lookModel.resolveDashboardLookSurfaceAttributes, "function");
  if (typeof lookModel.resolveDashboardLookSurfaceAttributes !== "function") return;

  const surface = lookModel.resolveDashboardLookSurfaceAttributes(preview);
  assert.deepEqual(surface, {
    style: "humanist-standard",
    colorProfile: "utility/prismatic-index",
    resolvedAppearance: "dark",
  });

  const html = renderToStaticMarkup(React.createElement(Drawer, {
    open: true,
    saved,
    preview,
    onCancel: () => {},
    onPreviewChange: () => {},
    onSetDashboardLook: () => {},
    onSetChartColors: () => {},
    onSetAppearance: () => {},
  }));

  assert.match(html, /data-dashboard-style="humanist-standard"/);
  assert.ok(html.includes('data-dashboard-color-profile="utility/prismatic-index"'));
  assert.match(html, /data-resolved-appearance="dark"/);
  assert.deepEqual(saved, {
    dashboardStyle: "evidence-ledger",
    dashboardColorProfile: "evidence-ledger/brighter-vellum",
    chartColorMode: "profile",
    appearancePreference: "system",
  });
});

test("system appearance keeps the already-resolved dashboard appearance", () => {
  assert.equal(typeof lookModel.createDashboardLookPreview, "function");
  assert.equal(typeof lookModel.resolveDashboardLookSurfaceAttributes, "function");
  if (typeof lookModel.createDashboardLookPreview !== "function") return;

  const systemPreview = lookModel.createDashboardLookPreview({
    ...saved,
    resolvedAppearance: "dark",
  });
  assert.equal(systemPreview.resolvedAppearance, "dark");
  assert.deepEqual(lookModel.resolveDashboardLookSurfaceAttributes(systemPreview), {
    style: "evidence-ledger",
    colorProfile: "evidence-ledger/brighter-vellum",
    resolvedAppearance: "dark",
  });
});
