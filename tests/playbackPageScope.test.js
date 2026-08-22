import assert from "node:assert/strict";
import test from "node:test";

import { chartsForPlaybackPage } from "../src/charting/time/playbackPageScope.js";

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
