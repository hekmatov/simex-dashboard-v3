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
  removeDashboardPanel,
} from "../src/static-content/staticPanelTransaction.js";
import { IMAGE_ASSET_LIMITS } from "../src/static-content/image/imageAssetValidation.js";

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

test("replacing an Image source removes only the superseded source and manifest ownership", () => {
  const dashboard = imageDashboard({
    panels: [panel("image-panel", "image", "image-source", "Response map")],
    sources: { "image-source": imageSource(3, "asset-old") },
    assets: {
      "asset-old": assetManifest("a"),
      "manifest-only": assetManifest("b"),
    },
  });
  const prepared = prepareStaticPanelTransaction({
    dashboard,
    operation: "update",
    panelId: "image-panel",
    panel: panel("image-panel", "image", "replacement-source", "Updated response map"),
    source: imageSource(1, "asset-new"),
    assets: { "asset-new": assetManifest("c", "staged") },
  });

  assert.equal(Object.hasOwn(prepared.candidateDashboard.dataSources, "image-source"), false);
  assert.deepEqual(Object.keys(prepared.candidateDashboard.assets).sort(), [
    "asset-new",
    "manifest-only",
  ]);
  assert.equal(prepared.candidateDashboard.dataSources["replacement-source"].origin.assetId, "asset-new");
});

test("panel deletion retains shared static ownership until the final sibling is removed", () => {
  const dashboard = imageDashboard({
    panels: [
      panel("image-a", "image", "source-a", "Response A"),
      panel("image-b", "image", "source-b", "Response B"),
    ],
    sources: {
      "source-a": imageSource(1, "asset-shared"),
      "source-b": imageSource(1, "asset-shared"),
    },
    assets: { "asset-shared": assetManifest("d") },
  });

  const first = removeDashboardPanel(dashboard, "image-a");
  assert.equal(first.removedChartId, "image-a");
  assert.equal(Object.hasOwn(dashboard.dataSources, "source-a"), false);
  assert.equal(Object.hasOwn(dashboard.dataSources, "source-b"), true);
  assert.equal(Object.hasOwn(dashboard.assets, "asset-shared"), true);

  removeDashboardPanel(dashboard, "image-b");
  assert.equal(Object.hasOwn(dashboard.dataSources, "source-b"), false);
  assert.equal(Object.hasOwn(dashboard.assets, "asset-shared"), false);
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

test("a staged Image transaction can commit atomically to session state without invoking durable persistence", async () => {
  const dashboard = fixtureDashboard();
  let durableCommits = 0;
  let sessionCommits = 0;
  const controller = createSerializedDashboardCommitController({
    initialDashboard: dashboard,
    commit: async () => {
      durableCommits += 1;
      throw new Error("staged Image must not enter the v3 persistence boundary");
    },
  });
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
        storageState: "staged",
      },
    },
  });

  const result = await commitStaticPanelTransaction(prepared, {
    controller,
    commitPrepared: (transaction) => controller.commitPreparedWith(
      transaction,
      async (candidate) => {
        sessionCommits += 1;
        return candidate;
      },
    ),
  });

  assert.equal(result.dashboard.dataSources["image-source"].kind, "staticImage");
  assert.equal(result.dashboard.assets["asset-map"].storageState, "staged");
  assert.equal(controller.getCurrent().dataSources["image-source"].revision, 1);
  assert.equal(sessionCommits, 1);
  assert.equal(durableCommits, 0);
});

test("Image transaction admits only the finalized source asset and retains unrelated saved inventory", () => {
  const dashboard = imageDashboard({
    panels: [panel("saved-image", "image", "saved-source", "Saved")],
    sources: { "saved-source": imageSource(1, "asset-saved") },
    assets: { "asset-saved": assetManifest("d") },
  });
  const prepared = prepareStaticPanelTransaction({
    dashboard,
    operation: "create",
    destination: { pageId: "page-a", sectionId: "section-a" },
    panel: panel("image-panel", "image", "image-source", "Response map"),
    source: imageSource(1, "asset-b"),
    assets: {
      "asset-a": assetManifest("a", "staged"),
      "asset-b": assetManifest("b", "staged"),
    },
  });
  assert.deepEqual(Object.keys(prepared.candidateDashboard.assets).sort(), ["asset-b", "asset-saved"]);
  assert.deepEqual(prepared.candidateDashboard.assets["asset-saved"], dashboard.assets["asset-saved"]);
});

test("direct over-budget Image transaction is rejected before dashboard or store mutation", () => {
  const dashboard = fixtureDashboard();
  const before = structuredClone(dashboard);
  const assets = {};
  for (let index = 0; index < 16; index += 1) {
    assets[`asset-${index}`] = {
      ...assetManifest(String(index % 10), "durable"),
      byteLength: 12 * 1024 * 1024,
    };
  }
  dashboard.assets = assets;
  dashboard.dataSources = {
    ...dashboard.dataSources,
    ...Object.fromEntries(Object.keys(assets).map((assetId, index) => [
      `source-${index}`,
      imageSource(1, assetId),
    ])),
  };
  dashboard.pages[0].sections[0].panels.push(...Object.keys(assets).map((assetId, index) => ({
    id: `image-${index}`,
    chart: panel(`image-${index}`, "image", `source-${index}`, `Image ${index}`),
  })));
  const mutationSnapshot = structuredClone(dashboard);

  assert.throws(() => prepareStaticPanelTransaction({
    dashboard,
    operation: "create",
    destination: { pageId: "page-a", sectionId: "section-a" },
    panel: panel("over-budget", "image", "over-budget-source", "Over budget"),
    source: imageSource(1, "asset-new"),
    assets: {
      "asset-new": { ...assetManifest("f", "staged"), byteLength: IMAGE_ASSET_LIMITS.maxBytes },
    },
  }), /200 MiB authored-asset budget/i);
  assert.deepEqual(dashboard, mutationSnapshot);
  assert.notDeepEqual(dashboard, before);
});

test("replacement prunes superseded ownership before final-candidate budget validation", () => {
  const assets = ceilingAssets({ replacedBytes: IMAGE_ASSET_LIMITS.maxBytes });
  const dashboard = imageDashboard({
    panels: [panel("image-panel", "image", "old-source", "Old image")],
    sources: { "old-source": imageSource(1, "asset-old") },
    assets,
  });
  const prepared = prepareStaticPanelTransaction({
    dashboard,
    operation: "update",
    panelId: "image-panel",
    panel: panel("image-panel", "image", "new-source", "New image"),
    source: imageSource(1, "asset-new"),
    assets: {
      "asset-new": { ...assetManifest("f", "staged"), byteLength: IMAGE_ASSET_LIMITS.maxBytes },
    },
  });

  assert.equal(Object.hasOwn(prepared.candidateDashboard.assets, "asset-old"), false);
  assert.equal(Object.hasOwn(prepared.candidateDashboard.assets, "asset-new"), true);
  assert.equal(
    Object.values(prepared.candidateDashboard.assets).reduce((sum, entry) => sum + entry.byteLength, 0),
    IMAGE_ASSET_LIMITS.dashboardBudgetBytes,
  );
});

test("genuinely over-budget replacement rejects the final candidate atomically", () => {
  const assets = ceilingAssets({ replacedBytes: 8 * 1024 * 1024 });
  const dashboard = imageDashboard({
    panels: [panel("image-panel", "image", "old-source", "Old image")],
    sources: { "old-source": imageSource(1, "asset-old") },
    assets,
  });
  const before = structuredClone(dashboard);

  assert.throws(() => prepareStaticPanelTransaction({
    dashboard,
    operation: "update",
    panelId: "image-panel",
    panel: panel("image-panel", "image", "new-source", "New image"),
    source: imageSource(1, "asset-new"),
    assets: {
      "asset-new": { ...assetManifest("f", "staged"), byteLength: IMAGE_ASSET_LIMITS.maxBytes },
    },
  }), /200 MiB authored-asset budget/i);
  assert.deepEqual(dashboard, before);
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

function imageSource(revision = 1, assetId = "asset-map") {
  return {
    kind: "staticImage",
    sourceVersion: 1,
    revision,
    origin: { kind: "asset", assetId },
    alt: "Response map",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
}

function imageDashboard({ panels, sources, assets }) {
  return {
    configVersion: 4,
    dataSources: structuredClone(sources),
    assets: structuredClone(assets),
    chronoGroups: [],
    pages: [{
      id: "page-a",
      sections: [{
        id: "section-a",
        panels: panels.map((chart) => ({ id: chart.id, chart })),
      }],
    }],
  };
}

function assetManifest(seed, storageState = "durable") {
  return {
    mediaType: "image/png",
    byteLength: 20,
    width: 4,
    height: 5,
    sha256: seed.repeat(64),
    storageState,
  };
}

function ceilingAssets({ replacedBytes }) {
  const assets = {
    "asset-old": { ...assetManifest("a"), byteLength: replacedBytes },
  };
  let remaining = IMAGE_ASSET_LIMITS.dashboardBudgetBytes - replacedBytes;
  let index = 0;
  while (remaining > 0) {
    const byteLength = Math.min(IMAGE_ASSET_LIMITS.maxBytes, remaining);
    assets[`asset-ceiling-${index}`] = {
      ...assetManifest(((index + 1) % 10).toString()),
      byteLength,
    };
    remaining -= byteLength;
    index += 1;
  }
  return assets;
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
