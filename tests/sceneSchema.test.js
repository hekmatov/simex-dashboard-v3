import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSceneDefaults,
  validateScene,
} from "../src/charting/time/sceneSchema.js";

const JAN_1 = "2027-01-01T00:00:00.000Z";
const JAN_31 = "2027-01-31T00:00:00.000Z";
const JAN_10 = "2027-01-10T00:00:00.000Z";
const JAN_20 = "2027-01-20T00:00:00.000Z";

function context() {
  return {
    chronoGroups: [{
      id: "group-1",
      period: { start: JAN_1, end: JAN_31 },
      chartIds: ["chart-a", "chart-b", "chart-c", "chart-d", "chart-e"],
      scenes: [{ id: "scene-existing", name: "Existing scene" }],
    }],
    pages: [{ id: "page-1" }, { id: "page-2" }],
    charts: [
      { id: "chart-a", pageId: "page-1" },
      { id: "chart-b", pageId: "page-1" },
      { id: "chart-c", pageId: "page-1" },
      { id: "chart-d", pageId: "page-1" },
      { id: "chart-e", pageId: "page-1" },
    ],
  };
}

function scene(overrides = {}) {
  return {
    id: "scene-1",
    name: "Executive surveillance",
    pageId: "page-1",
    chronoGroupId: "group-1",
    period: { start: JAN_10, end: JAN_20 },
    frames: {
      mode: "source",
      chartId: "chart-a",
      selection: "selected",
      selectedEpochs: [Date.parse(JAN_10), Date.parse(JAN_20)],
    },
    members: [
      { chartId: "chart-a", width: 2 },
      { chartId: "chart-b", width: 2, matching: "nearest" },
    ],
    present: { chartIds: ["chart-a", "chart-b"], layout: "vertical-divider" },
    secondsPerFrame: 2.5,
    audience: {
      datePosition: { xPermille: 700, yPermille: 40, widthPermille: 260 },
    },
    ...overrides,
  };
}

test("validates the complete source-frame Scene contract without changing it", () => {
  const value = scene();
  assert.strictEqual(validateScene(value, context()), value);
  assert.deepEqual(value.frames.selectedEpochs, [Date.parse(JAN_10), Date.parse(JAN_20)]);
});

test("validates exact Scene and Scene Present temporal review statuses", () => {
  const value = scene({
    temporalReview: { status: "needs-review", sourceIds: ["cases"] },
    present: {
      chartIds: ["chart-a", "chart-b"],
      layout: "vertical-divider",
      temporalReview: { status: "degraded", sourceIds: ["cases"] },
    },
  });
  assert.strictEqual(validateScene(value, context()), value);
  assert.throws(() => validateScene(scene({
    temporalReview: { status: "degraded", sourceIds: ["cases"] },
  }), context()), /needs-review|status/i);
  assert.throws(() => validateScene(scene({
    present: { chartIds: ["chart-a", "chart-b"], layout: "vertical-divider", temporalReview: { status: "needs-review", sourceIds: ["cases"] } },
  }), context()), /degraded|status/i);
});

test("validates calendar bounds, period containment, and positive cadence", () => {
  assert.doesNotThrow(() => validateScene(scene({
    frames: { mode: "calendar", interval: { value: 2, unit: "day" } },
    secondsPerFrame: undefined,
  }), context()));
  assert.throws(() => validateScene(scene({
    period: { start: JAN_1, end: "2027-02-01T00:00:00.000Z" },
  }), context()), /parent Chrono Group/);
  assert.throws(() => validateScene(scene({
    frames: { mode: "calendar", interval: { value: 0, unit: "day" } },
  }), context()), /positive integer/);
  assert.throws(() => validateScene(scene({ secondsPerFrame: 0 }), context()), /secondsPerFrame/);
});

test("requires a source member and valid explicit frame selection", () => {
  assert.throws(() => validateScene(scene({
    frames: { mode: "source", chartId: "chart-c", selection: "all" },
  }), context()), /participating Scene chart/);
  assert.throws(() => validateScene(scene({
    frames: { mode: "source", chartId: "chart-a", selection: "selected", selectedEpochs: [] },
  }), context()), /at least one selected frame/);
  assert.throws(() => validateScene(scene({
    frames: { mode: "source", chartId: "chart-a", selection: "selected", selectedEpochs: [Date.parse(JAN_1)] },
  }), context()), /inside the Scene period/);
});

test("enforces page and group subsets, unique members, and supported widths", () => {
  const wrongPage = context();
  wrongPage.charts[1].pageId = "page-2";
  assert.throws(() => validateScene(scene(), wrongPage), /owning page/);
  assert.throws(() => validateScene(scene({
    members: [{ chartId: "chart-a", width: 2 }, { chartId: "chart-a", width: 3 }],
  }), context()), /duplicate chart/);
  assert.throws(() => validateScene(scene({
    members: [{ chartId: "chart-a", width: 5 }],
    present: { chartIds: ["chart-a"], layout: "single" },
  }), context()), /width/);
});

test("accepts a one-to-four chart Present subset and only count-valid divider shapes", () => {
  assert.doesNotThrow(() => validateScene(scene({
    present: { chartIds: ["chart-a"], layout: "single" },
  }), context()));
  assert.throws(() => validateScene(scene({
    present: { chartIds: ["chart-a", "chart-b"], layout: "grid-2x2" },
  }), context()), /layout/);
  assert.doesNotThrow(() => validateScene(scene({
    present: { chartIds: ["chart-a", "chart-b"], layout: "horizontal-divider" },
  }), context()));

  const five = scene({
    members: ["chart-a", "chart-b", "chart-c", "chart-d", "chart-e"].map((chartId) => ({ chartId, width: 1 })),
    present: { chartIds: ["chart-a", "chart-c", "chart-e"], layout: "large-left" },
  });
  assert.doesNotThrow(() => validateScene(five, context()));
});

test("validates matching overrides, unique names, and exact Audience permille bounds", () => {
  assert.throws(() => validateScene(scene({
    members: [{ chartId: "chart-a", width: 2, matching: "invented" }],
    present: { chartIds: ["chart-a"], layout: "single" },
  }), context()), /matching/);
  assert.throws(() => validateScene(scene({ name: "Existing scene" }), context()), /unique/);
  assert.throws(() => validateScene(scene({
    audience: { datePosition: { xPermille: 800, yPermille: 50, widthPermille: 300 } },
  }), context()), /fit within/);
  assert.throws(() => validateScene(scene({
    audience: { datePosition: { xPermille: 700.5, yPermille: 50, widthPermille: 200 } },
  }), context()), /integer permille/);
});

test("normalization supplies deterministic Audience and small-Scene Present defaults immutably", () => {
  const input = scene({ audience: undefined, present: undefined, secondsPerFrame: undefined });
  const normalized = normalizeSceneDefaults(input);

  assert.notStrictEqual(normalized, input);
  assert.equal(Object.hasOwn(normalized, "secondsPerFrame"), false);
  assert.deepEqual(normalized.present, { chartIds: ["chart-a", "chart-b"], layout: "vertical-divider" });
  assert.deepEqual(normalized.audience, {
    datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 },
  });
  assert.equal(input.audience, undefined);
});

test("V6 round-trips the exact unresolved Frame source union without stale selected epochs", () => {
  const value = scene({
    members: [{ chartId: "chart-b", width: 2 }],
    frames: {
      mode: "unresolved",
      reason: "source-chart-moved",
      previousChartId: "chart-a",
    },
    present: { chartIds: ["chart-b"], layout: "single" },
  });
  const roundTripped = JSON.parse(JSON.stringify(value));

  assert.strictEqual(validateScene(roundTripped, context()), roundTripped);
  assert.deepEqual(roundTripped.frames, {
    mode: "unresolved",
    reason: "source-chart-moved",
    previousChartId: "chart-a",
  });
  assert.throws(() => validateScene(scene({
    frames: {
      mode: "unresolved",
      reason: "source-chart-moved",
      previousChartId: "chart-a",
      selectedEpochs: [Date.parse(JAN_10)],
    },
  }), context()), /unresolved Frame source/i);
});
