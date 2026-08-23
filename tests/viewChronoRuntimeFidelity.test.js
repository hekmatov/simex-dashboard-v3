import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const availability = await vite.ssrLoadModule("/src/components/playback/playbackAvailability.js");
const controller = await vite.ssrLoadModule("/src/components/playback/ChronoController.jsx");
const providerRuntime = await vite.ssrLoadModule("/src/components/playback/PlaybackProvider.jsx");
await vite.close();

const DAY = 86_400_000;
const MAY_1 = Date.parse("2027-05-01T00:00:00.000Z");
const MAY_2 = MAY_1 + DAY;
const MAY_4 = MAY_1 + 3 * DAY;

test("time-proportional seek maps arbitrary rail epochs to the nearest real frame", () => {
  const clock = [MAY_1, MAY_2, MAY_4];
  assert.equal(controller.nearestClockIndex(clock, MAY_1 + 1.4 * DAY), 1);
  assert.equal(controller.nearestClockIndex(clock, MAY_1 + 2.6 * DAY), 2);
});

test("frame availability derives per-chart provenance from real observations", () => {
  const chart = {
    id: "cases",
    title: "Confirmed cases",
    typeId: "line",
    sourceId: "cases-source",
    roles: {
      measurements: [{ field: "value" }],
      observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" },
    },
  };
  const evidence = availability.buildFrameAvailabilityEvidence({
    activeEpochMs: MAY_2,
    clock: [MAY_1, MAY_2, MAY_4],
    group: { period: { start: "2027-05-01", end: "2027-05-04" } },
    members: [
      { chartId: "cases", timeRole: "observation" },
      { chartId: "static-note" },
    ],
    charts: [chart, { id: "static-note", title: "Response note", sourceId: "note" }],
    loadedData: { "cases-source": [{ date: "2027-05-01", value: 1 }, { date: "2027-05-04", value: 4 }] },
    profiles: {
      "cases-source": {
        columns: [
          { name: "date", type: "temporal", temporal: { interpretation: "temporal", format: "YYYY-MM-DD", timezone: "date-only" } },
          { name: "value", type: "numeric" },
        ],
      },
    },
    contexts: { cases: { matching: { policy: "interpolate" } } },
    timezone: "UTC",
  });
  assert.deepEqual(evidence.map(({ chartId, seriesId, status }) => ({ chartId, seriesId, status })), [
    { chartId: "cases", seriesId: "C1", status: "interpolated" },
    { chartId: "static-note", seriesId: "C2", status: "static" },
  ]);
  assert.equal(evidence[0].observedFrameCount, 2);
});

test("default Page playback keeps the discovered temporal role for live availability evidence", () => {
  const chart = {
    id: "cases",
    title: "Confirmed cases",
    typeId: "line",
    sourceId: "cases-source",
    roles: {
      measurements: [{ field: "value" }],
      observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" },
    },
  };
  const playback = providerRuntime.buildDefaultPagePlayback([chart], {
    charts: [chart],
    loadedData: { "cases-source": [{ date: "2027-05-01", value: 1 }, { date: "2027-05-04", value: 4 }] },
    profiles: {
      "cases-source": {
        columns: [
          { name: "date", type: "temporal", temporal: { interpretation: "temporal", format: "YYYY-MM-DD", timezone: "date-only" } },
          { name: "value", type: "numeric" },
        ],
      },
    },
    timezone: "UTC",
  });
  assert.deepEqual(playback.group.members, [{ chartId: "cases", timeRole: "observation" }]);
  assert.deepEqual(playback.clock, [MAY_1, MAY_4]);
});

test("live composition uses numeric cadence, real evidence, accessible overlay controls, and focus/comparison suspension", async () => {
  const [chrono, provider, surface, overlay, workspace, panel, styles] = await Promise.all([
    readFile(new URL("../src/components/playback/ChronoController.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/playback/PlaybackProvider.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/playback/PlaybackSurface.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/playback/ChronoDateOverlay.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/DashboardModeWorkspace.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ChartPanel.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(chrono, /type:\s*"number"[\s\S]*min:\s*"0\.001"/);
  assert.doesNotMatch(chrono, /\[1, 2\.5, 5\]/);
  assert.match(chrono, /frameAvailability\.map/);
  assert.match(provider, /buildFrameAvailabilityEvidence/);
  assert.match(surface, /ChronoDateOverlay/);
  assert.match(overlay, /aria-label": "Move Chrono date overlay"/);
  assert.match(overlay, /aria-label": "Resize Chrono date overlay"/);
  assert.match(overlay, /onKeyDown/);
  assert.match(styles, /\.chrono-date-resize/);
  assert.doesNotMatch(styles, /\.chrono-date-overlay\s*\{[^}]*resize:\s*both/s);
  assert.match(workspace, /suspended=\{chronoSuspended\}/);
  assert.match(panel, /data-chrono-availability/);
});
