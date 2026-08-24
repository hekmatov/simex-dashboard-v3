import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { validateDashboardConfig } from "../src/charting/config/dashboardBundleV3.js";
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
