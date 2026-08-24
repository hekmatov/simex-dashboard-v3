import assert from "node:assert/strict";
import test from "node:test";

import { validateDashboardChartReferences } from "../src/charting/config/dashboardSemanticReferences.js";
import { createSerializedDashboardCommitController } from "../src/lib/dashboardCommitController.js";
import {
  commitStaticPanelTransaction,
  nextStaticSourceRevision,
  prepareStaticPanelTransaction,
} from "../src/static-content/staticPanelTransaction.js";

test("source revision begins at one and increments only when saved source content changes", () => {
  const source = textSource("Old situation", 3);
  assert.equal(nextStaticSourceRevision(null, textSource("New situation")), 1);
  assert.equal(nextStaticSourceRevision(source, { ...source }), 3);
  assert.equal(nextStaticSourceRevision(source, { ...source, qmd: "New situation" }), 4);
  assert.equal(nextStaticSourceRevision(source, { ...source, sourceVersion: 2 }), 4);
});

test("a prepared transaction contains one complete panel-source-manifest dashboard candidate", () => {
  const dashboard = fixtureDashboard();
  const prepared = prepareStaticPanelTransaction({
    dashboard,
    operation: "create",
    destination: { pageId: "page-a", sectionId: "section-a" },
    panel: panel("image-panel", "image", "image-source", "Response map"),
    source: imageSource(1),
    assets: {
      "asset-map": {
        mediaType: "image/png",
        byteLength: 20,
        width: 4,
        height: 5,
        sha256: "c".repeat(64),
        storageState: "durable",
      },
    },
  });

  assert.equal(prepared.kind, "static-panel-transaction");
  assert.equal(prepared.committedRevision, 1);
  assert.equal(prepared.candidateDashboard.pages[0].sections[0].panels.length, 2);
  assert.equal(prepared.candidateDashboard.dataSources["image-source"].revision, 1);
  assert.equal(prepared.candidateDashboard.assets["asset-map"].storageState, "durable");
  assert.equal(dashboard.pages[0].sections[0].panels.length, 1);
  assert.equal(Object.hasOwn(dashboard.dataSources, "image-source"), false);
});

test("a text transaction keeps a v3 dashboard portable when no asset manifest is needed", () => {
  const { assets: _unusedAssets, ...dashboard } = fixtureDashboard();
  const prepared = prepareStaticPanelTransaction({
    dashboard,
    operation: "update",
    panelId: "text-panel",
    panel: panel("text-panel", "freeText", "text-source", "Situation"),
    source: textSource("Portable situation"),
  });

  assert.equal(Object.hasOwn(prepared.candidateDashboard, "assets"), false);
});

test("commit failure leaves the old saved source revision authoritative and retry commits once", async () => {
  const dashboard = fixtureDashboard();
  let attempts = 0;
  const controller = createSerializedDashboardCommitController({
    initialDashboard: dashboard,
    commit: async (candidate) => {
      attempts += 1;
      if (attempts === 1) throw new Error("injected persistence failure");
      return candidate;
    },
  });
  const prepared = prepareStaticPanelTransaction({
    dashboard,
    operation: "update",
    panelId: "text-panel",
    panel: panel("text-panel", "freeText", "text-source", "Situation"),
    source: textSource("New situation"),
  });
  let rollbacks = 0;

  await assert.rejects(
    () => commitStaticPanelTransaction(prepared, {
      controller,
      rollback: async () => { rollbacks += 1; },
    }),
    /injected persistence failure/,
  );
  assert.equal(controller.getCurrent().dataSources["text-source"].revision, 3);
  assert.equal(controller.getCurrent().dataSources["text-source"].qmd, "Old situation");
  assert.equal(rollbacks, 1);

  const result = await commitStaticPanelTransaction(prepared, { controller });
  assert.equal(result.committedRevision, 4);
  assert.equal(result.dashboard.dataSources["text-source"].qmd, "New situation");
  assert.equal(controller.getCurrent().dataSources["text-source"].revision, 4);
  assert.equal(attempts, 2);
});

test("prepared commits compare and persist portable dashboard state without runtime projections", async () => {
  const dashboard = {
    ...fixtureDashboard(),
    loadedData: { "text-source": [{ qmd: "runtime-only" }] },
    dataSourceStates: { "text-source": { status: "ready" } },
  };
  const { loadedData, dataSourceStates, ...portable } = dashboard;
  const controller = createSerializedDashboardCommitController({
    initialDashboard: portable,
    commit: async (candidate) => candidate,
  });
  const prepared = prepareStaticPanelTransaction({
    dashboard,
    operation: "update",
    panelId: "text-panel",
    panel: panel("text-panel", "freeText", "text-source", "Situation"),
    source: textSource("Portable situation"),
  });

  const result = await commitStaticPanelTransaction(prepared, { controller });
  assert.equal(result.dashboard.dataSources["text-source"].qmd, "Portable situation");
  assert.equal(Object.hasOwn(result.dashboard, "loadedData"), false);
  assert.equal(Object.hasOwn(result.dashboard, "dataSourceStates"), false);
});

test("semantic reference validation dispatches typed static sources without CSV column preparation", () => {
  const dashboard = fixtureDashboard();
  const structure = {
    panels: [{
      chart: dashboard.pages[0].sections[0].panels[0].chart,
      pageId: "page-a",
      sectionId: "section-a",
    }],
  };
  let columnLookups = 0;
  const entries = validateDashboardChartReferences(
    structure,
    dashboard.dataSources,
    {
      assets: dashboard.assets,
      columnTypesForSource() {
        columnLookups += 1;
        throw new Error("static sources must not request columns");
      },
    },
  );
  assert.equal(entries[0].source.kind, "staticText");
  assert.equal(columnLookups, 0);
});

function fixtureDashboard() {
  return {
    dataSources: {
      "text-source": textSource("Old situation", 3),
    },
    assets: {},
    pages: [{
      id: "page-a",
      sections: [{
        id: "section-a",
        panels: [{
          id: "text-panel",
          chart: panel("text-panel", "freeText", "text-source", "Situation"),
        }],
      }],
    }],
  };
}

function textSource(qmd, revision = 1) {
  return {
    kind: "staticText",
    sourceVersion: 1,
    revision,
    renderingPolicy: "portable-qmd-v1",
    qmd,
  };
}

function imageSource(revision = 1) {
  return {
    kind: "staticImage",
    sourceVersion: 1,
    revision,
    origin: { kind: "asset", assetId: "asset-map" },
    alt: "Response map",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
}

function panel(id, typeId, sourceId, title) {
  return {
    configVersion: 3,
    id,
    typeId,
    title,
    description: "",
    sourceId,
    roles: {},
    transformations: {
      filters: [],
      grouping: null,
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
    },
    presentation: {
      title: { align: "left" },
      description: { visible: false },
    },
    interaction: {
      zoom: { enabled: false, rangeSelector: false },
      timeSync: null,
    },
    layout: { size: "standard" },
  };
}
