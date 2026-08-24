import assert from "node:assert/strict";
import test from "node:test";

import {
  chartsForPlaybackPage,
  createPlaybackChartCollectionSelector,
} from "../src/charting/time/playbackPageScope.js";

const dashboard = {
  pages: [{
    id: "page-a",
    sections: [{
      panels: [
        { id: "placement-a", chart: { id: "chart-a" } },
        { id: "chart-b" },
      ],
    }],
  }, {
    id: "page-c",
    sections: [{ panels: [{ id: "chart-c" }] }],
  }],
};

test("playback page scope exposes only canonical charts on the active page", () => {
  assert.deepEqual(
    chartsForPlaybackPage(dashboard, "page-a").map(({ id }) => id),
    ["chart-a", "chart-b"],
  );
  assert.deepEqual(
    chartsForPlaybackPage(dashboard, "page-c").map(({ id }) => id),
    ["chart-c"],
  );
  assert.deepEqual(chartsForPlaybackPage(dashboard, "missing"), []);
});

test("initial playback scope falls back to the first page without mutating the dashboard", () => {
  const before = structuredClone(dashboard);
  assert.deepEqual(
    chartsForPlaybackPage(dashboard, null).map(({ id }) => id),
    ["chart-a", "chart-b"],
  );
  assert.deepEqual(dashboard, before);
});

test("playback chart collections retain identity across unrelated dashboard renders", () => {
  const select = createPlaybackChartCollectionSelector();
  const first = select(dashboard, "page-a");
  const unrelatedRender = select({ ...dashboard, globalStyles: { density: "compact" } }, "page-a");
  const nextPage = select(dashboard, "page-c");

  assert.strictEqual(unrelatedRender.charts, first.charts);
  assert.strictEqual(unrelatedRender.pageCharts, first.pageCharts);
  assert.strictEqual(nextPage.charts, first.charts);
  assert.notStrictEqual(nextPage.pageCharts, first.pageCharts);
  assert.deepEqual(nextPage.pageCharts.map(({ id }) => id), ["chart-c"]);
});
