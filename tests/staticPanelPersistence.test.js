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
import { commitDurableStaticPanelTransaction } from "../src/static-content/assets/durableStaticPanelCommit.js";
import { sha256HexSync } from "../src/static-content/assets/assetPayloadEnvelope.js";

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

test("App persistence validation accepts a canonical V6 typed static transaction", () => {
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
    placement: finalized.placement,
    mediaItem: finalized.mediaItem,
    assets: finalized.assets,
    stagedAssetIds: finalized.stagedAssetIds,
  });

  assert.equal(prepared.candidateDashboard.configVersion, 6);
  assert.equal(Object.hasOwn(prepared.candidateDashboard, "assets"), false);
  assert.strictEqual(
    validateDashboardConfig(prepared.candidateDashboard, {
      allowBrowserAssetIds: true,
      allowTypedStaticSources: true,
    }),
    prepared.candidateDashboard,
  );
});

test("the App-owned persistence boundary admits canonical V6 typed static validation", async () => {
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
    placement: finalized.placement,
    mediaItem: finalized.mediaItem,
  }).candidateDashboard;

  assert.equal(typeof validateConfigurationForPersistence, "function");
  assert.strictEqual(
    validateConfigurationForPersistence(candidate, {}),
    candidate,
  );
  const canonical = { ...candidate, assets: {} };
  assert.strictEqual(
    validateConfigurationForPersistence(canonical, {}),
    canonical,
  );
});

test("dashboard V6 hydration excludes typed static sources from tabular loading without an opt-in flag", async () => {
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
  const dashboard = createDashboard();
  dashboard.dataSources.status = {
    kind: "inline",
    rows: [{ state: "Ready", count: 4 }],
  };
  const candidate = prepareStaticPanelTransaction({
    dashboard,
    operation: "create",
    destination: finalized.destination,
    panel: finalized.panel,
    placement: finalized.placement,
    mediaItem: finalized.mediaItem,
  }).candidateDashboard;

  const hydrated = await loadDashboardConfig(candidate, {}, null);

  assert.equal(hydrated.configVersion, 6);
  assert.equal(hydrated.dataSources[finalized.panel.sourceId].kind, "staticText");
  assert.equal(Object.hasOwn(hydrated.loadedData, finalized.panel.sourceId), false);
  assert.equal(Object.hasOwn(hydrated.datasetProfiles, finalized.panel.sourceId), false);
  assert.deepEqual(hydrated.dataSourceStates.status, { status: "ready" });
  assert.deepEqual(hydrated.dataSourceStates[finalized.panel.sourceId], { status: "ready" });
});

test("dashboard loading exposes missing and corrupt local Image bytes as source-scoped state", async () => {
  const dashboard = createDashboard();
  dashboard.configVersion = 5;
  dashboard.contentLibrary = { mediaItems: {}, sourceEntries: {} };
  const sha256 = "a".repeat(64);
  const assetId = "asset-local";
  dashboard.assets = {
    [assetId]: {
      mediaType: "image/png",
      byteLength: 80,
      width: 2,
      height: 3,
      sha256,
      storageState: "missing",
    },
    "asset-unused": {
      mediaType: "image/png",
      byteLength: 80,
      width: 2,
      height: 3,
      sha256,
      storageState: "missing",
    },
  };
  dashboard.dataSources.briefing = {
    kind: "staticImage",
    sourceVersion: 2,
    mediaId: "media-briefing",
    alt: "Briefing",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
  dashboard.contentLibrary.mediaItems["media-briefing"] = {
    mediaId: "media-briefing",
    revision: 1,
    current: { kind: "asset", assetId },
    displayName: "Briefing",
    defaultDescription: "Briefing",
    origin: "uploaded",
    health: "ready",
    dimensions: { width: 2, height: 3 },
    byteLength: 80,
    mediaType: "image/png",
  };
  dashboard.contentLibrary.mediaItems["media-unused"] = {
    mediaId: "media-unused",
    revision: 2,
    current: { kind: "asset", assetId: "asset-unused" },
    displayName: "Unused QMD media",
    defaultDescription: "Unused QMD media",
    origin: "uploaded",
    health: "ready",
    dimensions: { width: 2, height: 3 },
    byteLength: 80,
    mediaType: "image/png",
  };
  dashboard.pages[0].sections[0].panels.push(createChartDraft({
    typeId: "image",
    id: "briefing-image",
    sourceId: "briefing",
    title: "Briefing",
  }));

  const missing = await loadDashboardConfig(dashboard, {}, null);
  assert.deepEqual(missing.dataSourceStates.briefing, {
    status: "error",
    code: "authored-asset-missing",
  });
  assert.equal(missing.contentLibrary.mediaItems["media-briefing"].health, "ready");
  assert.deepEqual(missing.runtimeContentHealth.mediaItems["media-briefing"], {
    health: "missing",
    repair: { action: "replace" },
  });
  assert.equal(missing.contentLibrary.mediaItems["media-unused"].health, "ready");
  assert.deepEqual(missing.runtimeContentHealth.mediaItems["media-unused"], {
    health: "missing",
    repair: { action: "replace" },
  });

  dashboard.assets[assetId].storageState = "durable";
  dashboard.assets["asset-unused"].storageState = "durable";
  const corrupt = await loadDashboardConfig(dashboard, {}, null, {
    readAuthoredAsset: async () => {
      throw Object.assign(new Error("hash mismatch"), { code: "AUTHORED_ASSET_CORRUPT" });
    },
  });
  assert.deepEqual(corrupt.dataSourceStates.briefing, {
    status: "error",
    code: "authored-asset-corrupt",
  });
  assert.equal(corrupt.contentLibrary.mediaItems["media-briefing"].health, "ready");
  assert.deepEqual(corrupt.runtimeContentHealth.mediaItems["media-briefing"], {
    health: "corrupt",
    repair: { action: "replace" },
  });
  assert.equal(corrupt.contentLibrary.mediaItems["media-unused"].health, "ready");
  assert.deepEqual(corrupt.runtimeContentHealth.mediaItems["media-unused"], {
    health: "corrupt",
    repair: { action: "replace" },
  });
});

test("ordinary chart create and edit commits survive a staged Image through durable V6 persistence", async () => {
  const dashboard = createDashboard();
  dashboard.dataSources.status = {
    kind: "inline",
    rows: [{ label: "Ready", value: 12 }],
  };
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const sha256 = sha256HexSync(bytes);
  const assetId = `asset-${sha256}`;
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
    ...imageCommitInput({ assetId, sha256, byteLength: bytes.byteLength, mediaId: "media-readiness-image" }),
  });
  const persisted = [];
  const durableRecords = new Map();
  const store = {
    async stage(input) {
      durableRecords.set(assetId, { status: "staged", input });
      return { assetId };
    },
    async commit(id) {
      durableRecords.get(id).status = "durable";
    },
    async rollback(id) {
      durableRecords.delete(id);
    },
  };
  const commit = async (candidate) => {
    validateDashboardConfig(candidate);
    persisted.push(structuredClone(candidate));
    return structuredClone(candidate);
  };
  const controller = createSerializedDashboardCommitController({ initialDashboard: staged.baseDashboard, commit });
  await commitDurableStaticPanelTransaction({
    prepared: staged,
    store,
    readSessionAsset: () => ({
      assetId,
      bytes,
      mediaType: "image/png",
      byteLength: bytes.byteLength,
      width: 2,
      height: 3,
      sha256,
    }),
    commitPrepared: (transaction) => controller.commitPrepared(transaction),
    transactionId: "static-save",
  });

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
  assert.equal(saved.assets[assetId].storageState, "durable");
  assert.equal(durableRecords.get(assetId).status, "durable");
  assert.equal(persisted.length, 3);
  for (const candidate of persisted) {
    assert.equal(candidate.configVersion, 6);
    assert.equal(candidate.assets[assetId].storageState, "durable");
    assert.equal(candidate.dataSources["readiness-image-source"].kind, "staticImage");
  }
  assert.equal(persisted[1].pages[0].sections[0].panels.at(-1).id, chart.id);
  assert.equal(persisted[2].pages[0].sections[0].panels.at(-1).title, "Updated readiness");
});

test("post-replacement durable commit failure leaves the new referenced bytes staged for recovery", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const sha256 = sha256HexSync(bytes);
  const assetId = `asset-${sha256}`;
  const prepared = prepareStaticPanelTransaction({
    dashboard: createDashboard(),
    operation: "create",
    destination: { pageId: "overview", sectionId: "summary" },
    panel: createChartDraft({
      typeId: "image",
      id: "recoverable-image",
      sourceId: "recoverable-image-source",
      title: "Recoverable image",
    }),
    ...imageCommitInput({ assetId, sha256, byteLength: bytes.byteLength, mediaId: "media-recoverable-image", alt: "Recoverable" }),
  });
  const records = new Map();
  const events = [];
  let committedDashboard = null;
  const store = {
    async stage() {
      records.set(assetId, { status: "staged", transactionIds: ["static-recovery"] });
      events.push("stage");
      return { assetId };
    },
    async verify() { events.push("verify"); },
    async commitMany() {
      events.push("commit-many");
      throw new Error("injected authored commit failure");
    },
    async rollback() { events.push("rollback"); records.delete(assetId); },
  };
  let discarded = 0;

  await assert.rejects(commitDurableStaticPanelTransaction({
    prepared,
    store,
    readSessionAsset: () => ({
      assetId,
      bytes,
      mediaType: "image/png",
      byteLength: bytes.byteLength,
      width: 2,
      height: 3,
      sha256,
    }),
    discardSessionAsset: () => { discarded += 1; },
    commitPrepared: async (transaction) => {
      events.push("dashboard-commit");
      committedDashboard = structuredClone(transaction.candidateDashboard);
      return { dashboard: committedDashboard, committedRevision: 1 };
    },
    transactionId: "static-recovery",
  }), (error) => {
    assert.match(error.message, /authored commit failure/);
    assert.equal(error.dashboardCommitted, true);
    return true;
  });

  assert.equal(committedDashboard.assets[assetId].storageState, "durable");
  assert.equal(records.get(assetId).status, "staged");
  assert.equal(discarded, 0);
  assert.deepEqual(events, ["stage", "verify", "dashboard-commit", "commit-many"]);
});

test("durable Image save stages only the finalized replacement, never superseded draft bytes", async () => {
  const bytesA = new Uint8Array([1, 1, 1, 1]);
  const bytesB = new Uint8Array([2, 2, 2, 2]);
  const idA = `asset-${sha256HexSync(bytesA)}`;
  const idB = `asset-${sha256HexSync(bytesB)}`;
  const manifest = (bytes, storageState = "staged") => ({
    mediaType: "image/png",
    byteLength: bytes.byteLength,
    width: 2,
    height: 3,
    sha256: sha256HexSync(bytes),
    storageState,
  });
  const prepared = prepareStaticPanelTransaction({
    dashboard: createDashboard(),
    operation: "create",
    destination: { pageId: "overview", sectionId: "summary" },
    panel: createChartDraft({
      typeId: "image",
      id: "replacement-image",
      sourceId: "replacement-source",
      title: "Replacement",
    }),
    ...imageCommitInput({
      assetId: idB,
      sha256: sha256HexSync(bytesB),
      byteLength: bytesB.byteLength,
      mediaId: "media-replacement",
      alt: "Replacement B",
      assets: { [idB]: manifest(bytesB) },
      stagedAssetIds: [idB],
    }),
  });
  assert.deepEqual(Object.keys(prepared.candidateDashboard.assets), [idB]);
  const staged = [];
  await commitDurableStaticPanelTransaction({
    prepared,
    store: {
      async stage({ bytes }) {
        const assetId = `asset-${sha256HexSync(bytes)}`;
        staged.push(assetId);
        return { assetId };
      },
      async verify() {},
      async commit() {},
      async rollback() {},
    },
    readSessionAsset(assetId) {
      const bytes = assetId === idA ? bytesA : bytesB;
      return { assetId, bytes, ...manifest(bytes) };
    },
    async commitPrepared(transaction) {
      return { dashboard: transaction.candidateDashboard };
    },
  });
  assert.deepEqual(staged, [idB]);
});

function imageCommitInput({
  assetId,
  sha256,
  byteLength,
  mediaId,
  alt = "Readiness by district",
  assets,
  stagedAssetIds = [assetId],
}) {
  return {
    placement: {
      kind: "staticImage",
      sourceVersion: 2,
      mediaId,
      alt,
      decorative: false,
      fit: "contain",
      crop: { x: 0, y: 0, width: 1000, height: 1000 },
      rotation: 0,
    },
    mediaItem: {
      mediaId,
      revision: 1,
      current: { kind: "asset", assetId },
      displayName: alt,
      defaultDescription: alt,
      origin: "uploaded",
      health: "ready",
      dimensions: { width: 2, height: 3 },
      byteLength,
      mediaType: "image/png",
    },
    assets: assets ?? {
      [assetId]: {
        mediaType: "image/png",
        byteLength,
        width: 2,
        height: 3,
        sha256,
        storageState: "staged",
      },
    },
    stagedAssetIds,
  };
}

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
