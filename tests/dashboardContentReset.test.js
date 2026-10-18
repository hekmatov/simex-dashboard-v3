import assert from "node:assert/strict";
import test from "node:test";

import { createBlankDashboardContent, discardBuildSessionDrafts } from "../src/lib/dashboardContentReset.js";

test("post-restoration asset cleanup failure does not turn the completed Build restore into a failed reset", async () => {
  const retained = new Set(["manager", "qmd", "qmd-panel", "image", "chart"]);
  const warnings = await discardBuildSessionDrafts({
    getActiveRetainers: () => ({ records: [...retained].map((ownerId) => ({ ownerId })) }),
    async discardOwner(owner, { reason }) {
      assert.equal(reason, "build-baseline-restoration");
      if (!retained.has(owner)) return;
      retained.delete(owner); // Coordinator retires the draft before asset cleanup.
      if (owner === "image") throw new Error("Unused image rollback failed");
    },
  });
  assert.equal(retained.size, 0);
  assert.deepEqual(warnings.map(({ owner, message }) => ({ owner, message })), [
    { owner: "image", message: "Unused image rollback failed" },
  ]);
});

test("Build restore drains multiple drafts sharing one owner after its first cleanup fails", async () => {
  const drafts = new Map([["manager-a", "manager"], ["manager-b", "manager"], ["image-a", "image"]]);
  const warnings = await discardBuildSessionDrafts({
    getActiveRetainers: () => ({ records: [...drafts.keys()].map((ownerId) => ({ ownerId })) }),
    async discardOwner(owner) {
      for (const [id, draftOwner] of [...drafts]) {
        if (draftOwner !== owner) continue;
        drafts.delete(id);
        if (id === "manager-a") throw new Error("First manager draft asset cleanup failed");
      }
    },
  });
  assert.equal(drafts.size, 0);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].owner, "manager");
});

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
