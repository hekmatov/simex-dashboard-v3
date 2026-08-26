import assert from "node:assert/strict";
import test from "node:test";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import { loadDashboardConfigProgressively } from "../src/lib/loadDashboard.js";

test("progressive dashboard loading publishes chart-local source states without rejecting the dashboard", async () => {
  const originalFetch = globalThis.fetch;
  const failingSource = {
    kind: "csv",
    path: "data/progressive-failure.csv",
    provenance: { label: "Unavailable fixture" },
  };
  const failingRows = [{ value: 9 }];
  const failingProfile = {
    sourceId: "progressive_failure",
    kind: "csv",
    path: failingSource.path,
    provenance: failingSource.provenance,
    ...profileDataset(failingRows),
  };
  const dashboard = {
    configVersion: 5,
    id: "progressive-loader-fixture",
    title: "Progressive loader fixture",
    dataSources: {
      progressive_ready: {
        kind: "inline",
        rows: [{ value: 7 }],
        provenance: { label: "Ready fixture" },
      },
      progressive_failure: failingSource,
    },
    contentLibrary: {
      mediaItems: {},
      sourceEntries: {
        progressive_failure: {
          sourceId: "progressive_failure",
          origin: "linked-project",
          ownership: "builder",
          displayName: "Unavailable fixture",
          provenance: { fileName: "progressive-failure.csv" },
          health: "ready",
        },
      },
    },
    pages: [{
      id: "runtime",
      sections: [{ id: "sources", panels: [] }],
    }],
  };
  const updates = [];
  globalThis.fetch = async () => new Response("", { status: 503 });

  try {
    const loaded = await loadDashboardConfigProgressively(
      dashboard,
      { progressive_failure: failingProfile },
      null,
      { onUpdate: (update) => updates.push(update) },
    );

    assert.deepEqual(updates[0].dataSourceStates, {
      progressive_ready: { status: "loading" },
      progressive_failure: { status: "loading" },
    });
    assert.deepEqual(updates[0].loadedData, {});
    assert.deepEqual(loaded.loadedData.progressive_ready, [{ value: 7 }]);
    assert.equal(loaded.dataSourceStates.progressive_ready.status, "ready");
    assert.equal(loaded.dataSourceStates.progressive_failure.status, "error");
    assert.equal(Object.hasOwn(loaded.loadedData, "progressive_failure"), false);
    assert.equal(loaded.contentLibrary.sourceEntries.progressive_failure.health, "ready");
    assert.deepEqual(loaded.runtimeContentHealth.sourceEntries.progressive_failure, {
      health: "needs-relink",
      repair: { action: "relink" },
    });
    assert.deepEqual(loaded.dataSources.progressive_failure, failingSource);
    assert.deepEqual(loaded.datasetProfiles.progressive_failure, failingProfile);
    assert.ok(updates.length >= 3);
    assert.notStrictEqual(updates[0].dataSourceStates, loaded.dataSourceStates);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
