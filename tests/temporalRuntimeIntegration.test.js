import assert from "node:assert/strict";
import test from "node:test";

import { normalizeDashboardTemporalConfig } from "../src/charting/time/dashboardTemporalConfig.js";
import { migrateDashboardTimezoneToUtc } from "../src/charting/time/migrateTemporalConfig.js";
import { deriveTemporalNeedsAttention } from "../src/charting/time/temporalNeedsAttention.js";

const START = Date.UTC(2027, 0, 1);
const END = Date.UTC(2027, 0, 3);

test("live V3 timezone migration uses canonical runtime keys and preserves saved temporal ownership", () => {
  const live = {
    configVersion: 3,
    id: "dashboard-live",
    timeSyncGroups: [{
      id: "group-a",
      period: { start: "2027-01-01", end: "2027-01-03" },
      members: [{ chartId: "chart-a" }],
    }],
    scenes: [{
      id: "scene-a",
      groupId: "group-a",
      period: {
        start: "2027-01-01T01:00:00+01:00",
        end: "2027-01-03T01:00:00+01:00",
      },
      frames: {
        mode: "source",
        chartId: "chart-a",
        selection: "selected",
        selectedEpochs: [START],
      },
    }],
    pages: [],
  };

  const migrated = migrateDashboardTimezoneToUtc(live);
  assert.equal(migrated.timezone, "UTC");
  assert.equal(Object.hasOwn(migrated, "timeZone"), false);
  assert.deepEqual(migrated.timeSyncGroups, live.timeSyncGroups);
  assert.deepEqual(migrated.scenes[0].period, {
    start: "2027-01-01T00:00:00.000Z",
    end: "2027-01-03T00:00:00.000Z",
  });
  assert.deepEqual(migrateDashboardTimezoneToUtc(migrated), migrated);
  assert.deepEqual(live.scenes[0].period, {
    start: "2027-01-01T01:00:00+01:00",
    end: "2027-01-03T01:00:00+01:00",
  });

  const boundary = normalizeDashboardTemporalConfig(live);
  assert.equal(boundary.timezone, "UTC");
  assert.equal(boundary.scenes[0].period.start, "2027-01-01T00:00:00.000Z");
});

test("Needs-attention accepts live V3 groups, scenes, frames, and timezone vocabulary", () => {
  const charts = [{
    id: "chart-a",
    pageId: "page-a",
    interpolationAllowed: true,
    variables: [{
      id: "value",
      observations: [{ epochMs: START, value: 1 }],
    }],
  }];
  const findings = deriveTemporalNeedsAttention({
    timezone: "UTC",
    timeSyncGroups: [{
      id: "group-a",
      period: { start: "2027-01-01", end: "2027-01-03" },
      matching: { policy: "exact" },
      members: [{ chartId: "chart-a" }],
    }],
    scenes: [{
      id: "scene-a",
      groupId: "group-a",
      pageId: "page-a",
      period: {
        start: "2027-01-01T00:00:00.000Z",
        end: "2027-01-03T00:00:00.000Z",
      },
      members: [{ chartId: "chart-a", width: 2 }],
      frames: {
        mode: "source",
        chartId: "chart-a",
        selection: "selected",
        selectedEpochs: [START, END],
      },
      present: { chartIds: ["chart-a"], layout: "single" },
    }],
    charts,
  });

  assert.deepEqual(findings.map(({ code }) => code), ["selected-frame-missing"]);
  assert.equal(findings[0].targetId, "scene-a");
  assert.equal(findings[0].stage, "frames");
});
