import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDefaultChronoLedger,
  buildSceneFrameLedger,
} from "../src/charting/time/frameLedger.js";

const DAY_MS = 24 * 60 * 60 * 1_000;
const JAN_1 = Date.UTC(2027, 0, 1);
const JAN_2 = JAN_1 + DAY_MS;
const JAN_3 = JAN_2 + DAY_MS;
const JAN_4 = JAN_3 + DAY_MS;

const charts = [{
  id: "chart-a",
  variables: [{
    id: "a",
    observations: [
      { epochMs: JAN_1, value: 1 },
      { epochMs: JAN_2, value: null },
      { epochMs: JAN_3, value: 3 },
      { epochMs: JAN_3, value: 4 },
    ],
  }],
}, {
  id: "chart-b",
  variables: [{
    id: "b",
    observations: [
      { epochMs: JAN_3, value: 30 },
      { epochMs: JAN_4, value: 40 },
    ],
  }],
}];

test("Default Chrono is the sorted unique observation union without artificial boundaries", () => {
  const ledger = buildDefaultChronoLedger({
    pageCharts: charts,
    period: { startEpochMs: JAN_1 - 1, endEpochMs: JAN_4 + 1 },
    timeZone: "UTC",
  });

  assert.deepEqual(ledger, [JAN_1, JAN_3, JAN_4]);
  assert.equal(Object.isFrozen(ledger), true);
});

test("source ledgers support all available and explicit selected frames", () => {
  const baseScene = {
    id: "scene-1",
    period: { startEpochMs: JAN_1, endEpochMs: JAN_4 },
  };

  assert.deepEqual(buildSceneFrameLedger({
    scene: {
      ...baseScene,
      frameRule: { type: "source", chartId: "chart-a", mode: "all" },
    },
    charts,
    timeZone: "UTC",
  }), {
    frames: [JAN_1, JAN_3],
    missingSelectedFrames: [],
  });

  assert.deepEqual(buildSceneFrameLedger({
    scene: {
      ...baseScene,
      frameRule: {
        type: "source",
        chartId: "chart-a",
        mode: "selected",
        selectedEpochMs: [JAN_3, JAN_2, JAN_1],
      },
    },
    charts,
    timeZone: "UTC",
  }), {
    frames: [JAN_1, JAN_3],
    missingSelectedFrames: [JAN_2],
  });
});

test("calendar day frames use fixed 24-hour steps and always include scene boundaries", () => {
  const start = Date.parse("2027-03-13T05:00:00.000Z");
  const end = Date.parse("2027-03-15T04:00:00.000Z");
  const ledger = buildSceneFrameLedger({
    scene: {
      period: { startEpochMs: start, endEpochMs: end },
      frameRule: { type: "calendar", unit: "day", interval: 1 },
    },
    charts: [],
    timeZone: "America/New_York",
  });

  assert.deepEqual(ledger.frames, [start, start + DAY_MS, end]);
});

test("calendar month frames use dashboard-zone arithmetic and clamp month ends without drift", () => {
  const ledger = buildSceneFrameLedger({
    scene: {
      period: {
        startEpochMs: Date.parse("2027-01-31T17:00:00.000Z"),
        endEpochMs: Date.parse("2027-04-30T16:00:00.000Z"),
      },
      frameRule: { type: "calendar", unit: "month", interval: 1 },
    },
    charts: [],
    timeZone: "America/New_York",
  });

  assert.deepEqual(ledger.frames.map((epochMs) => new Date(epochMs).toISOString()), [
    "2027-01-31T17:00:00.000Z",
    "2027-02-28T17:00:00.000Z",
    "2027-03-31T16:00:00.000Z",
    "2027-04-30T16:00:00.000Z",
  ]);
});

test("calendar year frames clamp Feb 29 and recover it in the next leap year", () => {
  const ledger = buildSceneFrameLedger({
    scene: {
      period: {
        startEpochMs: Date.parse("2024-02-29T12:00:00.000Z"),
        endEpochMs: Date.parse("2028-02-29T12:00:00.000Z"),
      },
      frameRule: { type: "calendar", unit: "year", interval: 1 },
    },
    charts: [],
    timeZone: "UTC",
  });

  assert.deepEqual(ledger.frames.map((epochMs) => new Date(epochMs).toISOString()), [
    "2024-02-29T12:00:00.000Z",
    "2025-02-28T12:00:00.000Z",
    "2026-02-28T12:00:00.000Z",
    "2027-02-28T12:00:00.000Z",
    "2028-02-29T12:00:00.000Z",
  ]);
});

test("calendar rules reject non-positive and non-integer intervals", () => {
  for (const interval of [0, -1, 1.5]) {
    assert.throws(() => buildSceneFrameLedger({
      scene: {
        period: { startEpochMs: JAN_1, endEpochMs: JAN_4 },
        frameRule: { type: "calendar", unit: "day", interval },
      },
      charts: [],
      timeZone: "UTC",
    }), /positive integer/);
  }
});
