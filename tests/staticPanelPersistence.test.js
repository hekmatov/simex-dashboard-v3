import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import {
  integrateCreatedChart,
  integrateSavedChart,
  validateDashboardConfig,
} from "../src/charting/config/dashboardBundleV3.js";
import { createSerializedDashboardCommitController } from "../src/lib/dashboardCommitController.js";
import { loadDashboardConfig } from "../src/lib/loadDashboard.js";
import {
  createStaticContentDraft,
  finalizeStaticContentDraft,
} from "../src/static-content/forms/staticContentDraft.js";
import { prepareStaticPanelTransaction } from "../src/static-content/staticPanelTransaction.js";

function createDashboard() {
  return {
    configVersion: 3,
    id: "static-persistence-test",
    title: "Static persistence test",
    timezone: "UTC",
    dataSources: {},
    datasetProfiles: {},
    chronoGroups: [],
    pages: [
      {
        id: "overview",
        title: "Overview",
        sections: [{ id: "summary", title: "Summary", panels: [] }],
      },
    ],
  };
}

test("App persistence validation accepts a provisional v3 typed static transaction", () => {
  const draft = createStaticContentDraft({
    stage: "preview-and-add",
    contentTypeId: "freeText",
    destination: { pageId: "overview", sectionId: "summary" },
    panel: createChartDraft({
      typeId: "freeText",
      id: "static-situation",
      sourceId: "static-situation-source",
      title: "Situation report",
    }),
    source: { kind: "staticText", qmd: "## Situation\n\nStable." },
  });
  const finalized = finalizeStaticContentDraft(draft);
  const prepared = prepareStaticPanelTransaction({
    dashboard: createDashboard(),
    operation: "create",
    destination: finalized.destination,
    panel: finalized.panel,
    source: finalized.source,
    assets: finalized.assets,
  });

  assert.equal(prepared.candidateDashboard.configVersion, 3);
  assert.equal(Object.hasOwn(prepared.candidateDashboard, "assets"), false);
  assert.strictEqual(
    validateDashboardConfig(prepared.candidateDashboard, {
      allowBrowserAssetIds: true,
      allowTypedStaticSources: true,
    }),
    prepared.candidateDashboard,
  );
});

test("the App-owned persistence boundary enables provisional typed static validation", async () => {
  const vite = await createServer({
    root: process.cwd(),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  let validateConfigurationForPersistence;
  try {
    ({ validateConfigurationForPersistence } = await vite.ssrLoadModule("/src/App.jsx"));
  } finally {
    await vite.close();
  }
  const draft = createStaticContentDraft({
    stage: "preview-and-add",
    contentTypeId: "freeText",
    destination: { pageId: "overview", sectionId: "summary" },
    panel: createChartDraft({
      typeId: "freeText",
      id: "static-app-boundary",
      sourceId: "static-app-boundary-source",
      title: "App boundary",
    }),
    source: { kind: "staticText", qmd: "App-owned validation." },
  });
  const finalized = finalizeStaticContentDraft(draft);
  const candidate = prepareStaticPanelTransaction({
    dashboard: createDashboard(),
    operation: "create",
    destination: finalized.destination,
    panel: finalized.panel,
    source: finalized.source,
  }).candidateDashboard;

  assert.equal(typeof validateConfigurationForPersistence, "function");
  assert.strictEqual(
    validateConfigurationForPersistence(candidate, {}),
    candidate,
  );
  assert.throws(
    () => validateConfigurationForPersistence({ ...candidate, assets: {} }, {}),
    /Unknown dashboard configuration property "assets"/,
  );
});

test("provisional App session hydration excludes typed static sources from tabular loading", async () => {
  const draft = createStaticContentDraft({
    stage: "preview-and-add",
    contentTypeId: "freeText",
    destination: { pageId: "overview", sectionId: "summary" },
    panel: createChartDraft({
      typeId: "freeText",
      id: "static-session-hydration",
      sourceId: "static-session-hydration-source",
      title: "Session hydration",
    }),
    source: { kind: "staticText", qmd: "No dataset hydration required." },
  });
  const finalized = finalizeStaticContentDraft(draft);
  const candidate = prepareStaticPanelTransaction({
    dashboard: createDashboard(),
    operation: "create",
    destination: finalized.destination,
    panel: finalized.panel,
    source: finalized.source,
  }).candidateDashboard;

  const hydrated = await loadDashboardConfig(candidate, {}, null, {
    allowTypedStaticSources: true,
  });

  assert.equal(hydrated.dataSources[finalized.panel.sourceId].kind, "staticText");
  assert.equal(Object.hasOwn(hydrated.loadedData, finalized.panel.sourceId), false);
  assert.equal(Object.hasOwn(hydrated.datasetProfiles, finalized.panel.sourceId), false);
});

test("ordinary chart create and edit commits survive a staged Image through the App v3 bridge", async () => {
  const vite = await createServer({
    root: process.cwd(),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  let commitSessionImageDashboardForV3Persistence;
  try {
    ({ commitSessionImageDashboardForV3Persistence } = await vite.ssrLoadModule("/src/App.jsx"));
  } finally {
    await vite.close();
  }

  const dashboard = createDashboard();
  dashboard.dataSources.status = {
    kind: "inline",
    rows: [{ label: "Ready", value: 12 }],
  };
  const staged = prepareStaticPanelTransaction({
    dashboard,
    operation: "create",
    destination: { pageId: "overview", sectionId: "summary" },
    panel: createChartDraft({
      typeId: "image",
      id: "readiness-image",
      sourceId: "readiness-image-source",
      title: "Readiness image",
    }),
    source: {
      kind: "staticImage",
      sourceVersion: 1,
      revision: 1,
      origin: { kind: "asset", assetId: "asset-readiness" },
      alt: "Readiness by district",
      decorative: false,
      fit: "contain",
      crop: { x: 0, y: 0, width: 1000, height: 1000 },
      rotation: 0,
    },
    assets: {
      "asset-readiness": {
        mediaType: "image/png",
        byteLength: 80,
        width: 2,
        height: 3,
        sha256: "a".repeat(64),
        storageState: "staged",
      },
    },
  });
  const persisted = [];
  const commit = (candidate) => commitSessionImageDashboardForV3Persistence(
    candidate,
    async (v3Candidate) => {
      validateDashboardConfig(v3Candidate, {
        allowBrowserAssetIds: true,
        allowTypedStaticSources: true,
      });
      persisted.push(structuredClone(v3Candidate));
      return structuredClone(v3Candidate);
    },
  );
  const controller = createSerializedDashboardCommitController({ initialDashboard: dashboard, commit });
  await controller.commitPreparedWith(staged, async (candidate) => candidate);

  const chart = readinessChart();
  const created = await controller.mutate((current) => integrateCreatedChart(
    current,
    { chart },
    { pageId: "overview", sectionId: "summary" },
  ));
  const saved = await controller.mutate((current) => integrateSavedChart(current, {
    chart: { ...chart, title: "Updated readiness" },
    chronoGroups: [],
  }));

  assert.equal(created.dataSources["readiness-image-source"].kind, "staticImage");
  assert.equal(saved.pages[0].sections[0].panels.at(-1).title, "Updated readiness");
  assert.equal(saved.assets["asset-readiness"].storageState, "staged");
  assert.equal(persisted.length, 2);
  for (const candidate of persisted) {
    assert.equal(Object.hasOwn(candidate, "assets"), false);
    assert.equal(Object.hasOwn(candidate.dataSources, "readiness-image-source"), false);
    assert.equal(
      candidate.pages[0].sections[0].panels.some(({ id }) => id === "readiness-image"),
      false,
    );
  }
  assert.equal(persisted[0].pages[0].sections[0].panels.at(-1).id, chart.id);
  assert.equal(persisted[1].pages[0].sections[0].panels.at(-1).title, "Updated readiness");
});

function readinessChart() {
  return {
    configVersion: 3,
    id: "readiness-share",
    typeId: "pie",
    title: "Readiness share",
    description: "Current exercise readiness.",
    sourceId: "status",
    roles: {
      category: { field: "label" },
      value: { field: "value" },
    },
    transformations: {
      filters: [],
      grouping: null,
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
    },
    presentation: {
      background: { color: "#FFFFFF", transparent: false },
      title: { align: "left" },
      collection: null,
    },
    interaction: { zoom: { enabled: false }, timeSync: null },
    layout: { size: "standard" },
  };
}
