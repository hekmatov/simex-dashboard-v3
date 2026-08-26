import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeDashboardTemporalConfig,
  validateCanonicalDashboardTemporalConfig,
} from "../src/charting/time/dashboardTemporalConfig.js";
import { migrateDashboardTimezoneToUtc } from "../src/charting/time/normalizeTemporalConfig.js";
import {
  deriveTemporalContentItems,
  deriveTemporalNeedsAttention,
} from "../src/charting/time/temporalNeedsAttention.js";

const START = Date.UTC(2027, 0, 1);
const END = Date.UTC(2027, 0, 3);

test("canonical dashboard temporal config preserves optional valid review metadata and rejects malformed values", () => {
  const config = {
    timezone: "UTC",
    chronoGroups: [{
      id: "group-a", name: "Group A", period: { start: "2027-01-01", end: "2027-01-03" },
      matching: { policy: "exact" }, secondsPerFrame: 1,
      members: [{ chartId: "chart-a", timeRole: "observation" }],
      temporalReview: { status: "needs-review", sourceIds: ["cases"] },
    }],
  };
  assert.strictEqual(validateCanonicalDashboardTemporalConfig(config), config);
  assert.deepEqual(normalizeDashboardTemporalConfig(config).chronoGroups[0].temporalReview, config.chronoGroups[0].temporalReview);
  assert.throws(() => validateCanonicalDashboardTemporalConfig({
    ...config,
    chronoGroups: [{ ...config.chronoGroups[0], temporalReview: { status: "degraded", sourceIds: ["cases"] } }],
  }), /needs-review|status/i);
});

test("live V3 timezone migration uses canonical runtime keys and preserves saved temporal ownership", () => {
  const live = {
    configVersion: 3,
    id: "dashboard-live",
    chronoGroups: [{
      id: "group-a",
      period: { start: "2027-01-01", end: "2027-01-03" },
      members: [{ chartId: "chart-a" }],
    }],
    scenes: [{
      id: "scene-a",
      chronoGroupId: "group-a",
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
  assert.deepEqual(migrated.chronoGroups, live.chronoGroups);
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
    chronoGroups: [{
      id: "group-a",
      period: { start: "2027-01-01", end: "2027-01-03" },
      matching: { policy: "exact" },
      members: [{ chartId: "chart-a" }],
    }],
    scenes: [{
      id: "scene-a",
      chronoGroupId: "group-a",
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

test("Chrono content items receive derived findings from the live dashboard truth", () => {
  const dashboard = {
    timezone: "UTC",
    pages: [{ id: "page-a", title: "Page A" }],
    chronoGroups: [{
      id: "group-a",
      name: "Group A",
      period: { start: "2027-01-01", end: "2027-01-03" },
      matching: { policy: "exact" },
      members: [{ chartId: "chart-a" }, { chartId: "deleted-chart" }],
    }],
    scenes: [{
      id: "scene-a",
      name: "Scene A",
      chronoGroupId: "group-a",
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
  };
  const items = deriveTemporalContentItems({
    dashboard,
    charts: [{
      id: "chart-a",
      pageId: "page-a",
      interpolationAllowed: true,
      variables: [{ observations: [{ epochMs: START, value: 1 }] }],
    }],
  });

  const group = items.find(({ id }) => id === "group-a");
  const scene = items.find(({ id }) => id === "scene-a");
  assert.deepEqual(group.needsAttention.map(({ code }) => code), ["missing-chart"]);
  assert.deepEqual(scene.needsAttention.map(({ code }) => code), ["selected-frame-missing"]);
  assert.equal(group.sceneCount, 1);
  assert.equal(scene.pageLabel, "Page A");
});
