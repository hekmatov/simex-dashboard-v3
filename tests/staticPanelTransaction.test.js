import assert from "node:assert/strict";
import test from "node:test";

import { validateDashboardChartReferences } from "../src/charting/config/dashboardSemanticReferences.js";
import { createSerializedDashboardCommitController } from "../src/lib/dashboardCommitController.js";
import {
  createStaticContentDraft,
  finalizeStaticContentDraft,
  reduceStaticContentDraft,
} from "../src/static-content/forms/staticContentDraft.js";
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

test("semantically identical static source keys do not advance the saved revision", () => {
  const previous = imageSource(7);
  const reordered = {
    rotation: 0,
    crop: { height: 1000, width: 1000, y: 0, x: 0 },
    fit: "contain",
    decorative: false,
    alt: "Response map",
    origin: { assetId: "asset-map", kind: "asset" },
    revision: 1,
    sourceVersion: 1,
    kind: "staticImage",
  };

  assert.equal(nextStaticSourceRevision(previous, reordered), 7);
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

test("prepared transaction snapshots reject post-validation nested mutation", () => {
  const prepared = prepareStaticPanelTransaction({
    dashboard: fixtureDashboard(),
    operation: "update",
    panelId: "text-panel",
    panel: panel("text-panel", "freeText", "text-source", "Situation"),
    source: textSource("Validated situation"),
  });

  assert.throws(() => {
    prepared.baseDashboard.dataSources["text-source"].qmd = "mutated base";
  }, TypeError);
  assert.throws(() => {
    prepared.candidateDashboard.dataSources["text-source"].qmd = "mutated candidate";
  }, TypeError);
  assert.equal(prepared.baseDashboard.dataSources["text-source"].qmd, "Old situation");
  assert.equal(prepared.candidateDashboard.dataSources["text-source"].qmd, "Validated situation");
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

test("two same-type draft sessions create distinct panel-source pairs and retain identity across type changes", () => {
  let firstDraft = createStaticContentDraft({
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  firstDraft = reduceStaticContentDraft(firstDraft, {
    type: "setContentType",
    contentTypeId: "freeText",
  });
  const firstIdentity = {
    panelId: firstDraft.panel.id,
    sourceId: firstDraft.panel.sourceId,
  };
  firstDraft = reduceStaticContentDraft(firstDraft, {
    type: "setContentType",
    contentTypeId: "image",
  });
  firstDraft = reduceStaticContentDraft(firstDraft, {
    type: "setContentType",
    contentTypeId: "freeText",
  });
  assert.deepEqual(
    { panelId: firstDraft.panel.id, sourceId: firstDraft.panel.sourceId },
    firstIdentity,
  );

  let secondDraft = createStaticContentDraft({
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  secondDraft = reduceStaticContentDraft(secondDraft, {
    type: "setContentType",
    contentTypeId: "freeText",
  });
  assert.notEqual(secondDraft.panel.id, firstDraft.panel.id);
  assert.notEqual(secondDraft.panel.sourceId, firstDraft.panel.sourceId);

  const first = finishTextDraft(firstDraft, "First note", "First content");
  const second = finishTextDraft(secondDraft, "Second note", "Second content");
  const firstPrepared = prepareStaticPanelTransaction({
    dashboard: fixtureDashboard(),
    operation: "create",
    destination: first.destination,
    panel: first.panel,
    source: first.source,
  });
  const secondPrepared = prepareStaticPanelTransaction({
    dashboard: firstPrepared.candidateDashboard,
    operation: "create",
    destination: second.destination,
    panel: second.panel,
    source: second.source,
  });

  assert.equal(secondPrepared.candidateDashboard.pages[0].sections[0].panels.length, 3);
  assert.equal(Object.keys(secondPrepared.candidateDashboard.dataSources).length, 3);
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

function finishTextDraft(draft, title, qmd) {
  let next = reduceStaticContentDraft(draft, { type: "setStage", stage: "content" });
  next = reduceStaticContentDraft(next, { type: "updateSource", updates: { qmd } });
  next = reduceStaticContentDraft(next, { type: "setPanel", updates: { title } });
  next = reduceStaticContentDraft(next, { type: "setStage", stage: "preview-and-add" });
  return finalizeStaticContentDraft(next);
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
