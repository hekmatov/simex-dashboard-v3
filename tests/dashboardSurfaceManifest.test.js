import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_SURFACE_MANIFEST,
  summarizeDashboardSurfaceManifest,
} from "./e2e/support/dashboard-surface-manifest.js";
import {
  collapseDashboardDensityFindings,
  classifyDashboardDensitySnapshot,
  DASHBOARD_DENSITY_CATEGORIES,
  DASHBOARD_DENSITY_ROLE_OVERRIDES,
  DASHBOARD_DENSITY_SETTLE_STYLE,
  dashboardDensityBoxesStable,
} from "./e2e/support/dashboard-density-audit.js";

const REQUIRED_FAMILIES = [
  "landing",
  "home",
  "view",
  "build",
  "dashboard-look",
  "chart-authoring",
  "chart-editor",
  "static-content",
  "source-content",
  "temporal",
  "scenario-passport",
  "present",
  "audience",
  "source-viewer",
  "operation-status",
  "recovery",
  "desktop-gate",
  "image-editor",
  "structure-management",
  "package-management",
  "content-action",
  "fullscreen",
  "chart-state",
];

const REQUIRED_EXECUTABLE_STATES = Object.freeze({
  "dashboard-map-structure": "structure-tree",
  "dashboard-map-inspector": "context-inspector",
  "build-unit-orbit": "selected-chart",
  "build-page-actions": "page-actions",
  "build-page-orbit": "page-command-orbit",
  "section-command-dialog": "move-section",
  "chart-wizard-destination": "destination",
  "chart-wizard-data-source": "data-source",
  "chart-wizard-source-listbox": "managed-source-options",
  "chart-wizard-chart-type": "chart-type",
  "chart-wizard-map-and-prepare": "map-and-prepare",
  "chart-wizard-configure": "configure-pie",
  "chart-wizard-review-issues": "review-issues",
  "full-chart-editor-configure": "configure",
  "chart-quick-editor": "quick-edit",
  "chart-color-palette": "color-options",
  "chart-conversion-dialog": "compatible-change",
  "text-image-destination": "destination",
  "text-image-type-picker": "type-picker",
  "text-image-composer": "composer",
  "text-image-advanced": "advanced-qmd",
  "static-image-source-editor": "source-and-crop",
  "source-content-standard": "catalogue-and-detail",
  "chrono-studio-library": "library",
  "chrono-group-editor": "name-and-period",
  "scene-studio-details": "create-details",
  "scene-studio-select": "select-charts-and-frames",
  "scene-observation-dialog": "observation-detail",
  "scene-studio-arrange": "arrange-and-configure",
  "scene-unit-orbit": "scene-chart-selected",
  "focused-chart-dialog": "single-chart-focus",
  "chart-comparison-dialog": "two-chart-comparison",
  "chart-state-recovery-harness": "error-and-partial",
  "operation-status-notice": "completed-scenario-save",
  "build-below-desktop-gate": "below-1024",
  "present-below-desktop-gate": "below-1024",
});

test("surface manifest accounts for every approved desktop family and viewport", () => {
  const summary = summarizeDashboardSurfaceManifest(DASHBOARD_SURFACE_MANIFEST);

  assert.equal(summary.total, DASHBOARD_SURFACE_MANIFEST.length);
  assert.equal(summary.duplicateIds.length, 0);
  assert.deepEqual(summary.invalidEntries, []);
  assert.deepEqual(
    REQUIRED_FAMILIES.filter((family) => !summary.families.includes(family)),
    [],
  );
  assert.deepEqual(
    [1024, 1280, 1440, 1920].filter((width) => !summary.viewportWidths.includes(width)),
    [],
  );
  assert.deepEqual(summary.audienceViewports, ["1280x720", "1920x1080"]);
  assert.ok(summary.executable >= REQUIRED_FAMILIES.length);
  assert.ok(summary.coverageAliases >= 1);
  assert.ok(summary.intentionallyOutOfScope >= 1);
});

test("every required distinct state is executable and every alias declares bounded equivalence", () => {
  const byId = new Map(DASHBOARD_SURFACE_MANIFEST.map((entry) => [entry.id, entry]));

  for (const [id, state] of Object.entries(REQUIRED_EXECUTABLE_STATES)) {
    assert.equal(byId.get(id)?.disposition, "executable", `${id} must be rendered, not aliased`);
    assert.equal(byId.get(id)?.state, state, `${id} must exercise the curated ${state} state`);
  }
  for (const entry of DASHBOARD_SURFACE_MANIFEST.filter(({ disposition }) => disposition === "coverage-alias")) {
    assert.ok(entry.equivalence?.basis, `${entry.id} must state why its geometry is equivalent`);
    assert.ok(entry.equivalence?.categories?.length, `${entry.id} must bound the categories covered by its alias`);
  }
  assert.ok(DASHBOARD_DENSITY_CATEGORIES.includes("desktop-support-contract"));
  assert.ok(DASHBOARD_DENSITY_CATEGORIES.includes("operational-contrast"));
  assert.ok(DASHBOARD_DENSITY_CATEGORIES.includes("visible-semantics"));
  assert.doesNotMatch(
    DASHBOARD_DENSITY_CATEGORIES.join(" "),
    /keyboard|focus|tab[-_ ]?order|\baria\b|aria[-_]|assistive/i,
  );
});

test("density classifier reports every geometry category without excluded interaction fields", () => {
  const snapshot = {
    surface: { id: "fixture", owner: "fixture-owner" },
    viewport: { width: 1024, height: 768 },
    controls: [
      { id: "primary", role: "standard", expectedHeight: 32, rect: { x: 0, y: 0, width: 100, height: 44 } },
      { id: "secondary", role: "standard", expectedHeight: 32, rect: { x: 110, y: 0, width: 100, height: 32 } },
    ],
    choices: [
      { id: "choice", singleLine: true, centrelineDelta: 4, glyphHeight: 20, rowHeight: 44 },
    ],
    rhythms: [
      { id: "form", gaps: [7, 13], panelPadding: [20, 20, 20, 20] },
    ],
    wraps: [
      { id: "toolbar", unexpected: true, rowCount: 2 },
    ],
    whitespace: [
      { id: "toolbar", strandedInlineSpace: 240, crowded: true },
    ],
    overlaps: [
      { first: "primary", second: "secondary", area: 16 },
    ],
    clippedElements: [
      { id: "clipped", axes: ["inline"] },
    ],
    scrollContainers: [
      { id: "dialog-body", overflowX: 96, overflowY: 0, allowsHorizontal: false },
    ],
    repeatedTitles: [
      { owner: "editor", text: "Axes", ids: ["heading", "legend"] },
    ],
    occupancies: [
      { id: "editor-header", occupiedRatio: 0.28, crowded: true },
    ],
    operationalContrastCandidates: [
      {
        id: "muted-status",
        text: "Save failed",
        ratio: 1.4,
        foreground: "rgb(128, 128, 128)",
        background: "rgb(140, 140, 140)",
        state: "available",
      },
    ],
    visibleSemanticsCandidates: [
      { id: "broken-title", text: "[object Object]", signal: "object-stringification" },
    ],
  };

  const result = classifyDashboardDensitySnapshot(snapshot);
  const categories = new Set(result.findings.map(({ category }) => category));

  assert.deepEqual(
    [
      "role-size",
      "centreline",
      "rhythm",
      "wrap",
      "whitespace",
      "overlap",
      "clipping",
      "overflow",
      "repeated-title",
      "same-role-variance",
      "occupancy",
      "operational-contrast",
      "visible-semantics",
    ].filter((category) => !categories.has(category)),
    [],
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /keyboard|focus|tab[-_ ]?order|focus[-_ ]?ring|aria[-_ ]?(?:label|description|role|state)|assistive/i,
  );
});

test("role overrides preserve content geometry and classify compact graphical utilities explicitly", () => {
  const roleFor = (selectorFragment) => DASHBOARD_DENSITY_ROLE_OVERRIDES
    .find(({ selector }) => selector.includes(selectorFragment))?.role;

  assert.equal(roleFor("select[multiple]"), "content");
  assert.equal(roleFor(".source-content-breadcrumb"), "content");
  assert.equal(roleFor(".source-content-row"), "content");
  assert.equal(roleFor(".settings-color-preset-grid > button"), "content");
  assert.equal(roleFor(".chart-type-card"), "content");
  assert.equal(roleFor(".build-tree-move-handle"), "utility");
  assert.equal(roleFor(".settings-color-swatch"), "utility");
  assert.equal(roleFor(".build-more-command-list button"), "compact");
  assert.equal(roleFor(".dashboard-map-region-switch button"), "compact");
  assert.equal(roleFor(".source-content-workspace button:not"), "standard");
});

test("render settling disables transitions and requires repeatable geometry", () => {
  assert.match(DASHBOARD_DENSITY_SETTLE_STYLE, /animation:\s*none\s*!important/);
  assert.match(DASHBOARD_DENSITY_SETTLE_STYLE, /transition:\s*none\s*!important/);
  assert.equal(
    dashboardDensityBoxesStable(
      [{ x: 10, y: 20, width: 400, height: 600 }],
      [{ x: 10.1, y: 20, width: 400, height: 600.2 }],
    ),
    true,
  );
  assert.equal(
    dashboardDensityBoxesStable(
      [{ x: 10, y: 20, width: 400, height: 600 }],
      [{ x: 12, y: 20, width: 400, height: 600 }],
    ),
    false,
  );
});

test("density classifier does not call scroll-reachable block content clipped", () => {
  const result = classifyDashboardDensitySnapshot({
    surface: { id: "scroll-fixture", owner: "fixture-owner" },
    controls: [],
    choices: [],
    rhythms: [],
    wraps: [],
    whitespace: [],
    overlaps: [],
    clippedElements: [
      { id: "below-fold-control", axes: ["viewport-block"], scrollReachable: true },
    ],
    scrollContainers: [],
    repeatedTitles: [],
    occupancies: [],
  });

  assert.equal(result.findings.some(({ category }) => category === "clipping"), false);
});

test("an inner hidden clipping owner is a finding even when an outer scroller is reachable", () => {
  const result = classifyDashboardDensitySnapshot({
    surface: { id: "inner-clip-fixture", owner: "fixture-owner" },
    controls: [],
    choices: [],
    rhythms: [],
    wraps: [],
    whitespace: [],
    overlaps: [],
    clippedElements: [
      {
        id: "help-copy@hidden-owner",
        clippingOwner: "hidden-owner",
        axes: ["block"],
        scrollReachable: true,
      },
    ],
    scrollContainers: [],
    repeatedTitles: [],
    occupancies: [],
  });

  assert.equal(result.findings.some(({ category }) => category === "clipping"), true);
});

test("choice geometry grades both glyph axes and permits helper copy below the base row", () => {
  const base = {
    surface: { id: "choice-fixture", owner: "fixture-owner" },
    controls: [],
    rhythms: [],
    wraps: [],
    whitespace: [],
    overlaps: [],
    clippedElements: [],
    scrollContainers: [],
    repeatedTitles: [],
    occupancies: [],
  };
  const wideGlyph = classifyDashboardDensitySnapshot({
    ...base,
    choices: [{
      id: "wide-glyph",
      singleLine: true,
      centrelineDelta: 0,
      glyphWidth: 20,
      glyphHeight: 16,
      rowHeight: 28,
      hasSupplementalCopy: false,
    }],
  });
  const helperRow = classifyDashboardDensitySnapshot({
    ...base,
    choices: [{
      id: "helper-row",
      singleLine: true,
      centrelineDelta: 0.5,
      glyphWidth: 16,
      glyphHeight: 16,
      rowHeight: 46.8,
      hasSupplementalCopy: true,
    }],
  });

  assert.equal(wideGlyph.findings.some(({ category }) => category === "centreline"), true);
  assert.equal(helperRow.findings.some(({ category }) => category === "centreline"), false);
});

test("multiline choices still align the glyph to the first text line", () => {
  const result = classifyDashboardDensitySnapshot({
    surface: { id: "multiline-choice", owner: "fixture-owner" },
    controls: [],
    choices: [{
      id: "multiline-label",
      singleLine: false,
      centrelineDelta: 3,
      glyphWidth: 16,
      glyphHeight: 16,
      rowHeight: 52,
      hasSupplementalCopy: true,
    }],
    rhythms: [],
    wraps: [],
    whitespace: [],
    overlaps: [],
    clippedElements: [],
    scrollContainers: [],
    repeatedTitles: [],
    occupancies: [],
  });

  assert.equal(result.findings.some(({ category }) => category === "centreline"), true);
});

test("audit summary collapses repeated per-instance candidates without losing measured occurrences", () => {
  const repeated = [
    {
      id: "surface-a:role-size:1",
      surfaceId: "surface-a",
      owner: "shared-owner",
      category: "role-size",
      priority: "P2",
      evidence: "button.icon:nth(0) is 32px high; utility expects 24px (±2px).",
      recommendation: "Move button.icon:nth(0) to the shared utility height instead of preserving a local minimum.",
    },
    {
      id: "surface-b:role-size:2",
      surfaceId: "surface-b",
      owner: "shared-owner",
      category: "role-size",
      priority: "P2",
      evidence: "button.icon:nth(7) is 32px high; utility expects 24px (±2px).",
      recommendation: "Move button.icon:nth(7) to the shared utility height instead of preserving a local minimum.",
    },
  ];

  const collapsed = collapseDashboardDensityFindings(repeated);

  assert.equal(collapsed.length, 1);
  assert.equal(collapsed[0].systemic, true);
  assert.equal(collapsed[0].occurrenceCount, 2);
  assert.deepEqual(collapsed[0].surfaceIds, ["surface-a", "surface-b"]);
  assert.equal(collapsed[0].instanceIds.length, 2);
});
