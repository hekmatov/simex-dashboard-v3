import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChronoGroupReview,
  createChronoGroupDraft,
} from "../src/components/time/chronoGroupDraft.js";
import {
  SCENE_STAGES,
  createSceneDraft,
  reduceSceneDraft,
} from "../src/components/time/sceneDraft.js";
import {
  createChronoContentState,
  reduceChronoContent,
  selectSceneStudioSections,
} from "../src/components/time/chronoContentState.js";

const period = { startEpochMs: 100, endEpochMs: 300 };
const charts = [
  {
    id: "chart-a",
    label: "Admissions",
    pageId: "biomedical",
    pageLabel: "Biomedical",
    sectionLabel: "Signals",
    variables: [{ id: "count", label: "Count", observations: [{ epochMs: 100, value: 2 }, { epochMs: 300, value: 5 }] }],
  },
  {
    id: "chart-b",
    label: "Capacity",
    pageId: "biomedical",
    pageLabel: "Biomedical",
    sectionLabel: "Capacity",
    variables: [{ id: "beds", label: "Beds", observations: [{ epochMs: 200, value: 8 }] }],
  },
  {
    id: "chart-c",
    label: "Freight",
    pageId: "operations",
    pageLabel: "Operations",
    sectionLabel: "Freight",
    variables: [{ id: "units", label: "Units", observations: [{ epochMs: 200, value: 3 }] }],
  },
];

test("Sketch 005 review derives affected pages, frames, member evidence, and only genuine repair targets", () => {
  const draft = createChronoGroupDraft({
    group: {
      id: "chrono-a",
      name: "Outbreak",
      period,
      chartIds: ["chart-a", "chart-b"],
      defaultMatching: "Concurrent only",
      secondsPerFrame: 2,
    },
    charts,
  });

  assert.deepEqual(buildChronoGroupReview(draft), {
    affectedPages: ["Biomedical"],
    frameCount: 3,
    members: [
      { chartId: "chart-a", label: "Admissions", observationCount: 2, repairStage: null },
      { chartId: "chart-b", label: "Capacity", observationCount: 1, repairStage: null },
    ],
    gaps: [],
    sceneConsequences: [],
  });
});

function sceneFixture() {
  return {
    id: "scene-a",
    name: "Morning reveal",
    chronoGroupId: "chrono-a",
    pageId: "biomedical",
    period,
    frames: { mode: "calendar", selection: "all" },
    members: [{ chartId: "chart-a", width: 1 }, { chartId: "chart-b", width: 1 }],
    present: { chartIds: ["chart-a", "chart-b"], layout: "vertical-divider" },
    audience: { datePosition: { horizontal: "right", vertical: "top" } },
  };
}

const validationContext = {
  chronoGroups: [
    { id: "chrono-a", name: "Outbreak", chartIds: ["chart-a", "chart-b"], period },
    { id: "chrono-b", name: "Operations", chartIds: ["chart-c"], period: { startEpochMs: 200, endEpochMs: 400 } },
  ],
  charts,
  pages: [{ id: "biomedical" }, { id: "operations" }],
};

test("Sketch 006 amendment makes Scene details the first of three live stages", () => {
  let state = createSceneDraft(sceneFixture(), validationContext);
  assert.deepEqual(SCENE_STAGES, ["details", "select", "arrange"]);
  assert.equal(state.stage, "details");

  state = reduceSceneDraft(state, { type: "SET_STAGE", stage: "select" });
  assert.equal(state.stage, "select");
  state = reduceSceneDraft(state, { type: "SET_STAGE", stage: "arrange" });
  assert.equal(state.stage, "arrange");
});

test("Scene validation returns identity problems to details", () => {
  let state = createSceneDraft({ ...sceneFixture(), name: "" }, validationContext);
  state = reduceSceneDraft(state, { type: "SET_STAGE", stage: "arrange" });
  state = reduceSceneDraft(state, { type: "SAVE_REQUEST" });
  assert.equal(state.stage, "details");
  assert.equal(state.status, "error");
});

test("Sketch 006 page and parent changes recompute dependent Scene fields", () => {
  let state = createSceneDraft(sceneFixture(), validationContext);
  state = reduceSceneDraft(state, { type: "SET_PAGE", pageId: "operations" });
  assert.equal(state.value.pageId, "operations");
  assert.equal(state.value.chronoGroupId, null);
  assert.deepEqual(state.value.members, []);

  state = reduceSceneDraft(state, { type: "SET_CHRONO_GROUP", chronoGroupId: "chrono-b" });
  assert.equal(state.value.chronoGroupId, "chrono-b");
  assert.deepEqual(state.value.period, { startEpochMs: 200, endEpochMs: 400 });
  assert.deepEqual(state.value.members, [{ chartId: "chart-c", width: 1 }]);
  assert.deepEqual(state.value.present.chartIds, ["chart-c"]);
});

test("Sketch 006 Calendar and source-frame choices retain their own selections", () => {
  let state = createSceneDraft(sceneFixture(), validationContext);
  state = reduceSceneDraft(state, { type: "SET_FRAME_MODE", mode: "source" });
  state = reduceSceneDraft(state, { type: "SET_FRAME_SOURCE", chartId: "chart-b" });
  state = reduceSceneDraft(state, { type: "SET_FRAME_SELECTION", selection: "selected", selectedEpochs: [200] });
  state = reduceSceneDraft(state, { type: "SET_FRAME_MODE", mode: "calendar" });
  state = reduceSceneDraft(state, { type: "SET_FRAME_MODE", mode: "source" });
  assert.deepEqual(state.value.frames, {
    mode: "source",
    chartId: "chart-b",
    selection: "selected",
    selectedEpochs: [200],
  });
});

test("Sketch 006 narrows the Scene period and retains Calendar interval controls", () => {
  const boundedContext = {
    ...validationContext,
    chronoGroups: [{ ...validationContext.chronoGroups[0], period: { start: "2027-05-01", end: "2027-05-03" } }],
  };
  let state = createSceneDraft({ ...sceneFixture(), period: { start: "2027-05-01T00:00:00.000Z", end: "2027-05-03T23:59:59.999Z" } }, boundedContext);
  state = reduceSceneDraft(state, {
    type: "SET_PERIOD",
    start: "2027-05-02",
    end: "2027-05-02",
  });
  assert.deepEqual(state.value.period, {
    start: "2027-05-02T00:00:00.000Z",
    end: "2027-05-02T23:59:59.999Z",
  });

  state = reduceSceneDraft(state, { type: "SET_CALENDAR_INTERVAL", value: 3, unit: "month" });
  assert.deepEqual(state.value.frames, { mode: "calendar", interval: { value: 3, unit: "month" } });
  state = reduceSceneDraft(state, { type: "SET_FRAME_MODE", mode: "source" });
  state = reduceSceneDraft(state, { type: "SET_FRAME_MODE", mode: "calendar" });
  assert.deepEqual(state.value.frames, { mode: "calendar", interval: { value: 3, unit: "month" } });
});

test("Sketch 006 supports first, last, and explicit insertion targets independently per canvas", () => {
  let state = createSceneDraft(sceneFixture(), validationContext);
  state = reduceSceneDraft(state, { type: "MOVE_CHART", board: "scene", chartId: "chart-b", direction: "first" });
  assert.deepEqual(state.value.members.map(({ chartId }) => chartId), ["chart-b", "chart-a"]);
  assert.deepEqual(state.value.present.chartIds, ["chart-a", "chart-b"]);

  state = reduceSceneDraft(state, { type: "MOVE_CHART", board: "present", chartId: "chart-a", direction: "last" });
  assert.deepEqual(state.value.present.chartIds, ["chart-b", "chart-a"]);

  state = reduceSceneDraft(state, { type: "MOVE_CHART", board: "scene", chartId: "chart-b", targetIndex: 1 });
  assert.deepEqual(state.value.members.map(({ chartId }) => chartId), ["chart-a", "chart-b"]);
});

test("Sketch 012 page filtering is live and survives a content round trip", () => {
  const state0 = createChronoContentState({
    studio: "scene",
    pages: [{ id: "biomedical", label: "Biomedical" }, { id: "operations", label: "Operations" }],
    chronoGroups: [{ id: "chrono-a", name: "Outbreak" }],
    scenes: [
      { id: "scene-a", name: "Morning", chronoGroupId: "chrono-a", pageId: "biomedical" },
      { id: "scene-b", name: "Freight", chronoGroupId: "chrono-a", pageId: "operations" },
    ],
  });
  const state1 = reduceChronoContent(state0, { type: "SET_PAGE_FILTER", pageId: "operations" });
  assert.deepEqual(selectSceneStudioSections(state1).map(({ pageId }) => pageId), ["operations"]);

  const state2 = reduceChronoContent(state1, { type: "OPEN_CONTENT", itemType: "scene", itemId: "scene-b" });
  const state3 = reduceChronoContent(state2, { type: "RETURN_TO_STUDIO" });
  assert.equal(state3.pageId, "operations");
  assert.deepEqual(selectSceneStudioSections(state3).map(({ pageId }) => pageId), ["operations"]);
});

test("Sketch 012 keeps independent browse context for Chrono and Scene Studios", () => {
  let state = createChronoContentState({ studio: "scene", query: "scene search", pageId: "biomedical" });
  state = reduceChronoContent(state, { type: "SET_STUDIO", studio: "chrono" });
  assert.equal(state.query, "");
  assert.equal(state.pageId, "biomedical");
  state = reduceChronoContent(state, { type: "SET_QUERY", query: "group search" });
  state = reduceChronoContent(state, { type: "SET_STUDIO", studio: "scene" });
  assert.equal(state.query, "scene search");
  state = reduceChronoContent(state, { type: "SET_STUDIO", studio: "chrono" });
  assert.equal(state.query, "group search");
});
