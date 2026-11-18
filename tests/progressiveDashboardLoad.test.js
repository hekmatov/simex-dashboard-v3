import assert from "node:assert/strict";
import test from "node:test";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import { loadBrowserCsv } from "../src/lib/loadBrowserCsv.js";
import { parseCsvText } from "../src/lib/loadCsv.js";
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
  let released = false;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    assert.equal(released, true);
    return new Response("", { status: 503 });
  };

  try {
    const loaded = await loadDashboardConfigProgressively(
      dashboard,
      { progressive_failure: failingProfile },
      null,
      {
        onUpdate: (update) => updates.push(update),
        beforeSourceLoads() {
          assert.equal(updates.length, 1);
          assert.equal(requests, 0);
          released = true;
        },
      },
    );

    assert.deepEqual(updates[0].dataSourceStates, {
      progressive_ready: { status: "loading" },
      progressive_failure: { status: "loading" },
    });
    assert.deepEqual(updates[0].loadedData, {});
    assert.deepEqual(loaded.loadedData.progressive_ready, [{ value: 7 }]);
    assert.equal(loaded.dataSourceStates.progressive_ready.status, "ready");
    assert.equal(loaded.dataSourceStates.progressive_failure.status, "error");
    assert.equal(released, true);
    assert.equal(requests, 1);
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

test("large configured CSVs return the normal parser results and source-local errors through a worker", async () => {
  const originalFetch = globalThis.fetch;
  const originalWorker = globalThis.Worker;
  const field = "x".repeat(1024 * 1024);
  let csv = `count,label\n7,"${field}"\n`;
  let workers = 0;
  let terminations = 0;
  globalThis.fetch = async () => new Response(csv);
  globalThis.Worker = class extends EventTarget {
    constructor(url, options) {
      super();
      assert.match(url.pathname, /parseCsv\.worker\.js$/);
      assert.equal(options.type, "module");
      workers++;
    }
    postMessage({ text, label }) {
      queueMicrotask(() => {
        let data;
        try { data = { rows: parseCsvText(text, label) }; }
        catch (error) { data = { error: error.message }; }
        this.dispatchEvent(new MessageEvent("message", { data }));
      });
    }
    terminate() { terminations++; }
  };
  try {
    assert.deepEqual(await loadBrowserCsv("data/large.csv"), [{ count: 7, label: field }]);
    csv = `count,label\n7,"${field}",extra\n`;
    await assert.rejects(loadBrowserCsv("data/large.csv"), /CSV parse error in data\/large\.csv:/);
    csv = "count,label\n5,small\n";
    assert.deepEqual(await loadBrowserCsv("data/small.csv"), [{ count: 5, label: "small" }]);
    assert.equal(workers, 2);
    assert.equal(terminations, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = originalWorker;
  }
});
