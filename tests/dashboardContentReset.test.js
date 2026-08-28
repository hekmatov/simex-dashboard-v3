import assert from "node:assert/strict";
import test from "node:test";

import { createBlankDashboardContent } from "../src/lib/dashboardContentReset.js";

test("blanking dashboard content removes every authored and source-owned collection while preserving dashboard identity and Look", () => {
  const dashboard = {
    configVersion: 3,
    id: "exercise-dashboard",
    title: "Exercise dashboard",
    description: "Preserved identity",
    timezone: "Europe/Amsterdam",
    programLabel: "Preparedness programme",
    scenarioLabel: "Exercise A",
    home: { enabled: false },
    globalStyles: {
      dashboardStyle: "editorial",
      dashboardColorProfile: "common-ground",
      panelColors: { panelBackgroundColor: "#ffffff" },
    },
    layout: { maxCanvasWidth: 1440 },
    pages: [{ id: "overview", sections: [{ id: "signals", panels: [{ id: "chart-placement" }] }] }],
    dataSources: { cases: { kind: "dataset", type: "uploadedCsv", csvText: "x,y\n1,2\n" } },
    datasetProfiles: { cases: { columns: [{ name: "x", type: "number" }] } },
    contentLibrary: {
      mediaItems: { "media-a": { mediaId: "media-a", assetId: "asset-a" } },
      sourceEntries: { cases: { sourceId: "cases", kind: "dataset" } },
    },
    assets: { "asset-a": { assetId: "asset-a", mimeType: "image/png" } },
    chronoGroups: [{ id: "response", members: [{ chartId: "chart-placement" }] }],
    scenes: [{ id: "briefing", members: [{ chartId: "chart-placement" }] }],
    loadedData: { cases: [{ x: 1, y: 2 }] },
    dataSourceStates: { cases: { status: "ready" } },
    chartDataStates: { "chart-placement": { status: "ready" } },
  };

  const blank = createBlankDashboardContent(dashboard);

  assert.deepEqual(blank.pages, []);
  assert.deepEqual(blank.home, { enabled: true });
  assert.deepEqual(blank.dataSources, {});
  assert.deepEqual(blank.datasetProfiles, {});
  assert.deepEqual(blank.contentLibrary, { mediaItems: {}, sourceEntries: {} });
  assert.deepEqual(blank.assets, {});
  assert.deepEqual(blank.chronoGroups, []);
  assert.deepEqual(blank.scenes, []);
  assert.equal(Object.hasOwn(blank, "loadedData"), false);
  assert.equal(Object.hasOwn(blank, "dataSourceStates"), false);
  assert.equal(Object.hasOwn(blank, "chartDataStates"), false);
  assert.equal(blank.id, "exercise-dashboard");
  assert.equal(blank.title, "Exercise dashboard");
  assert.equal(blank.programLabel, "Preparedness programme");
  assert.equal(blank.scenarioLabel, "Exercise A");
  assert.deepEqual(blank.globalStyles, dashboard.globalStyles);
  assert.deepEqual(blank.layout, dashboard.layout);
  assert.notEqual(blank.globalStyles, dashboard.globalStyles);
  assert.notEqual(blank.home, dashboard.home);
  assert.deepEqual(dashboard.home, { enabled: false });
  assert.equal(dashboard.pages.length, 1);
});
