import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DASHBOARD_SURFACE_MANIFEST } from "./e2e/support/dashboard-surface-manifest.js";

let registryModule = null;
let registryLoadError = null;
try {
  registryModule = await import("../src/theme/dashboardRegionRegistry.js");
} catch (error) {
  registryLoadError = error;
}

const EXPECTED_ROLES = [
  "shell", "command-bar", "panel", "editor", "dialog",
  "drawer", "menu", "status", "table", "chart-cell",
];

test("owned visual-region registry is valid independently of the journey catalogue", () => {
  assert.equal(registryLoadError, null, registryLoadError?.stack);
  assert.deepEqual(registryModule.DASHBOARD_REGION_ROLES, EXPECTED_ROLES);
  assert.deepEqual(registryModule.DASHBOARD_REGION_LIFECYCLES, ["persistent", "conditional", "portal"]);
  assert.deepEqual(registryModule.DASHBOARD_REGION_MATERIALS, ["flat", "ledger-register"]);
  assert.deepEqual(
    registryModule.validateDashboardOwnedRegionRegistry(
      registryModule.DASHBOARD_OWNED_REGION_REGISTRY,
      DASHBOARD_SURFACE_MANIFEST,
    ),
    [],
  );
});

test("registers persistent command chrome instead of treating its controls as shell evidence", () => {
  assert.equal(registryLoadError, null, registryLoadError?.stack);
  const build = registryModule.dashboardOwnedRegionFor("build-command-header");

  assert.deepEqual({
    owner: build.owner,
    role: build.role,
    material: build.material,
    lifecycle: build.lifecycle,
    witnesses: build.witnesses,
  }, {
    owner: "BuildCommandHeader",
    role: "command-bar",
    material: "flat",
    lifecycle: "persistent",
    witnesses: ["build-compact", "build-standard", "build-page-actions", "build-page-command-form"],
  });

  assert.deepEqual(
    registryModule.dashboardOwnedRegionProps("build-command-header"),
    {
      "data-dashboard-region": "build-command-header",
      "data-dashboard-surface-role": "command-bar",
      "data-dashboard-material": "flat",
    },
  );
});

test("covers analogous persistent command chrome rather than one Build-only exception", () => {
  assert.equal(registryLoadError, null, registryLoadError?.stack);
  assert.deepEqual(
    registryModule.DASHBOARD_OWNED_REGION_REGISTRY
      .filter(({ role }) => role === "command-bar")
      .map(({ id }) => id)
      .sort(),
    [
      "build-command-header",
      "build-page-navigation",
      "global-command-crown",
      "present-action-dock",
      "view-playback-controls",
    ],
  );
});

test("registers the disclosed Present action dock as conditional command chrome", () => {
  assert.equal(registryLoadError, null, registryLoadError?.stack);
  const dock = registryModule.dashboardOwnedRegionFor("present-action-dock");

  assert.equal(dock.lifecycle, "conditional");
  assert.equal(dock.role, "command-bar");
});

test("registers conditional menus nested inside persistent command chrome", () => {
  assert.equal(registryLoadError, null, registryLoadError?.stack);
  const menu = registryModule.dashboardOwnedRegionFor("build-page-action-menu");

  assert.deepEqual({
    selector: menu.selector,
    role: menu.role,
    material: menu.material,
    lifecycle: menu.lifecycle,
    parentId: menu.parentId,
    witnesses: menu.witnesses,
  }, {
    selector: ".build-page-action-menu",
    role: "menu",
    material: "flat",
    lifecycle: "conditional",
    parentId: "build-page-navigation",
    witnesses: ["build-page-actions", "build-page-command-form"],
  });
});

test("partitions shared drawer and dialog classes into concrete owned boundaries", () => {
  assert.equal(registryLoadError, null, registryLoadError?.stack);
  const drawers = registryModule.DASHBOARD_OWNED_REGION_REGISTRY
    .filter(({ role }) => role === "drawer");

  assert.deepEqual(drawers.map(({ id }) => id).sort(), [
    "build-more-drawer",
    "dashboard-map-drawer",
    "look-drawer",
  ]);
  assert.equal(drawers.some(({ selector }) => selector === ".right-side-drawer"), false);
  assert.equal(
    registryModule.dashboardOwnedRegionFor("dashboard-dialog").selector,
    ".dashboard-dialog:not(.right-side-drawer)",
  );
  assert.equal(
    registryModule.DASHBOARD_OWNED_REGION_REGISTRY
      .some(({ role, selector }) => role === "panel" && selector === ".dashboard-map-panel"),
    false,
  );
});

test("only the two data-register regions permit Ledger ruling", () => {
  assert.equal(registryLoadError, null, registryLoadError?.stack);
  const registers = registryModule.DASHBOARD_OWNED_REGION_REGISTRY
    .filter(({ material }) => material === "ledger-register");

  assert.deepEqual(
    registers.map(({ selector }) => selector).sort(),
    [".chart-table-view", ".source-viewer-table-wrap"],
  );
  assert.equal(registers.every(({ role }) => role === "table"), true);
  assert.deepEqual(
    registers.map(({ id }) => registryModule.dashboardOwnedRegionProps(id)),
    [
      {
        "data-dashboard-region": "chart-table-register",
        "data-dashboard-surface-role": "table",
        "data-dashboard-material": "ledger-register",
      },
      {
        "data-dashboard-region": "source-viewer-table-register",
        "data-dashboard-surface-role": "table",
        "data-dashboard-material": "ledger-register",
      },
    ],
  );
  assert.deepEqual(
    EXPECTED_ROLES
      .filter((role) => role !== "table")
      .filter((role) => registryModule.DASHBOARD_OWNED_REGION_REGISTRY
        .some((region) => region.role === role && region.material === "ledger-register")),
    [],
  );
});

test("the two register owners project their registry contract onto the painted production roots", async () => {
  const [chartSource, viewerSource] = await Promise.all([
    readFile(new URL("../src/components/charts/TableChartView.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/source-viewer/SourceCsvViewer.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(chartSource, /dashboardOwnedRegionProps\("chart-table-register"\)/);
  assert.match(viewerSource, /dashboardOwnedRegionProps\("source-viewer-table-register"\)/);
});

test("journeys derive their owned region witnesses from the separate registry", () => {
  assert.equal(registryLoadError, null, registryLoadError?.stack);
  const buildRegions = registryModule.dashboardOwnedRegionIdsForJourney("build-standard");

  assert.ok(buildRegions.includes("app-frame-shell"));
  assert.ok(buildRegions.includes("global-command-crown"));
  assert.ok(buildRegions.includes("build-workspace-shell"));
  assert.ok(buildRegions.includes("build-command-header"));
  assert.ok(buildRegions.includes("build-page-navigation"));
});
