import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveGroupPeriodChangeConsequence,
  deriveTemporalNeedsAttention,
} from "../src/charting/time/temporalNeedsAttention.js";

const DAY_MS = 24 * 60 * 60 * 1_000;
const START = Date.UTC(2027, 0, 1);
const END = START + (4 * DAY_MS);

function codes(findings) {
  return findings.map(({ code }) => code);
}

test("Needs attention derives structural, data, frame, interpolation, and schema drift findings", () => {
  const charts = [{
    id: "chart-a",
    pageId: "page-a",
    schemaRevision: "2",
    interpolationAllowed: false,
    variables: [{
      id: "value",
      observations: [{ epochMs: START - DAY_MS, value: 1 }],
    }],
  }, {
    id: "chart-b",
    pageId: "page-b",
    schemaRevision: "1",
    interpolationAllowed: true,
    variables: [{
      id: "value",
      observations: [{ epochMs: START, value: 1 }],
    }],
  }];
  const groups = [{
    id: "group-1",
    period: { startEpochMs: START, endEpochMs: END },
    matching: "Interpolate",
    members: [{ chartId: "chart-a" }, { chartId: "missing-chart" }],
  }];
  const scenes = [{
    id: "scene-1",
    groupId: "group-1",
    pageId: "page-a",
    period: { startEpochMs: START, endEpochMs: END },
    chartIds: ["chart-b", "missing-chart"],
    frameRule: {
      type: "source",
      chartId: "chart-b",
      mode: "selected",
      selectedEpochMs: [START + DAY_MS],
    },
    present: { chartIds: [], layout: "single" },
  }];

  const findings = deriveTemporalNeedsAttention({
    timeZone: "Mars/Olympus",
    groups,
    scenes,
    charts,
    schemaRevisions: { "chart-a": "1", "chart-b": "1" },
  });

  assert.deepEqual(codes(findings), [
    "invalid-time-zone",
    "member-no-observations",
    "unsupported-interpolation",
    "missing-chart",
    "cross-page-chart",
    "missing-chart",
    "selected-frame-missing",
    "zero-frame-ledger",
    "invalid-present-subset",
    "schema-drift",
  ]);
  assert.equal(findings.every((finding) => finding.stage && finding.message), true);
});

test("persisted temporal review metadata projects into group and Scene findings with accepted layouts", () => {
  const findings = deriveTemporalNeedsAttention({
    timeZone: "UTC",
    groups: [{
      id: "group-review", period: { startEpochMs: START, endEpochMs: END }, matching: "Concurrent only",
      members: [], temporalReview: { status: "needs-review", sourceIds: ["cases"] },
    }],
    scenes: [{
      id: "scene-review", chronoGroupId: "group-review", pageId: "page-a",
      period: { startEpochMs: START, endEpochMs: END }, chartIds: ["chart-a", "chart-b"],
      frameRule: { type: "calendar", interval: 1, unit: "day" },
      temporalReview: { status: "needs-review", sourceIds: ["cases"] },
      present: {
        chartIds: ["chart-a", "chart-b"], layout: "vertical-divider",
        temporalReview: { status: "degraded", sourceIds: ["cases"] },
      },
    }],
    charts: [
      { id: "chart-a", pageId: "page-a", variables: [{ observations: [{ epochMs: START, value: 1 }] }] },
      { id: "chart-b", pageId: "page-a", variables: [{ observations: [{ epochMs: START, value: 1 }] }] },
    ],
  });
  assert.deepEqual(findings.filter(({ code }) => code.includes("temporal-review")).map(({ code, targetType, targetId }) => ({ code, targetType, targetId })), [
    { code: "source-temporal-review", targetType: "group", targetId: "group-review" },
    { code: "source-temporal-review", targetType: "scene", targetId: "scene-review" },
    { code: "present-temporal-review", targetType: "scene", targetId: "scene-review" },
  ]);
  assert.equal(findings.some(({ code }) => code === "invalid-present-subset"), false);
});

test("group-period shortening returns edit-or-clamp consequences without mutating scenes", () => {
  const scenes = [{
    id: "scene-before",
    groupId: "group-1",
    period: { startEpochMs: START - DAY_MS, endEpochMs: END },
  }, {
    id: "scene-after",
    groupId: "group-1",
    period: { startEpochMs: START, endEpochMs: END + DAY_MS },
  }, {
    id: "scene-safe",
    groupId: "group-1",
    period: { startEpochMs: START, endEpochMs: END },
  }];
  const before = structuredClone(scenes);

  assert.deepEqual(deriveGroupPeriodChangeConsequence({
    groupId: "group-1",
    nextPeriod: { startEpochMs: START, endEpochMs: END },
    scenes,
  }), {
    consequence: "edit-or-clamp",
    affectedSceneIds: ["scene-before", "scene-after"],
  });
  assert.deepEqual(scenes, before);
});

test("valid temporal objects produce no Needs attention findings", () => {
  const charts = [{
    id: "chart-a",
    pageId: "page-a",
    schemaRevision: "1",
    interpolationAllowed: true,
    variables: [{
      id: "value",
      observations: [{ epochMs: START, value: 1 }],
    }],
  }];
  const groups = [{
    id: "group-1",
    period: { startEpochMs: START, endEpochMs: END },
    matching: "Concurrent only",
    members: [{ chartId: "chart-a" }],
  }];
  const scenes = [{
    id: "scene-1",
    groupId: "group-1",
    pageId: "page-a",
    period: { startEpochMs: START, endEpochMs: END },
    chartIds: ["chart-a"],
    frameRule: { type: "source", chartId: "chart-a", mode: "all" },
    present: { chartIds: ["chart-a"], layout: "single" },
  }];

  assert.deepEqual(deriveTemporalNeedsAttention({
    timeZone: "UTC",
    groups,
    scenes,
    charts,
    schemaRevisions: { "chart-a": "1" },
  }), []);
});

test("an unresolved Frame source derives one repairable Frame source finding", () => {
  const findings = deriveTemporalNeedsAttention({
    timeZone: "UTC",
    groups: [{
      id: "group-1",
      period: { startEpochMs: START, endEpochMs: END },
      matching: "Concurrent only",
      members: [{ chartId: "chart-b" }],
    }],
    scenes: [{
      id: "scene-1",
      chronoGroupId: "group-1",
      pageId: "page-a",
      period: { startEpochMs: START, endEpochMs: END },
      chartIds: ["chart-b"],
      frames: { mode: "unresolved", reason: "source-chart-moved", previousChartId: "chart-a" },
      present: { chartIds: ["chart-b"], layout: "single" },
    }],
    charts: [{ id: "chart-b", pageId: "page-a", variables: [{ observations: [{ epochMs: START, value: 1 }] }] }],
  });

  assert.deepEqual(findings.filter(({ code }) => code === "unresolved-frame-source"), [{
    code: "unresolved-frame-source",
    targetType: "scene",
    targetId: "scene-1",
    stage: "frame-source",
    message: 'Scene "scene-1" needs a replacement Frame source because chart "chart-a" moved.',
  }]);
  assert.equal(findings.some(({ code }) => code === "invalid-frame-rule"), false);
});
