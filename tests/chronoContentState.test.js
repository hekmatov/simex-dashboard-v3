import assert from "node:assert/strict";
import test from "node:test";

import {
  createChronoContentState,
  reduceChronoContent,
  selectChronoGroupContent,
  selectChronoStudioCards,
  selectSceneContent,
  selectSceneStudioSections,
  selectTemporalDraftOwners,
  withTemporalOwnerScope,
} from "../src/components/time/chronoContentState.js";

const pages = [
  {
    id: "biomedical",
    label: "Biomedical",
    sections: [{ id: "signals", title: "Signals", panels: [{ chart: { id: "chart-a", title: "Admissions" } }] }],
  },
  {
    id: "operations",
    label: "Operations",
    sections: [{ id: "logistics", title: "Logistics", panels: [{ chart: { id: "chart-b", title: "Deliveries" } }] }],
  },
];
const chronoGroups = [{
  id: "chrono-a",
  name: "Municipal outbreak playback",
  chartIds: ["chart-a", "chart-b"],
  period: { startEpochMs: Date.UTC(2027, 4, 1), endEpochMs: Date.UTC(2027, 4, 3) },
  secondsPerFrame: 2,
}];
const scenes = [
  { id: "scene-a", name: "Admission reveal", chronoGroupId: "chrono-a", pageId: "biomedical", members: [{ chartId: "chart-a", width: 1 }] },
  { id: "scene-b", name: "Delivery reveal", chronoGroupId: "chrono-a", pageId: "operations", members: [{ chartId: "chart-b", width: 1 }] },
];

test("studio selection opens read-first content before edit", () => {
  let state = createChronoContentState({ chronoGroups, scenes, pages, studio: "chrono" });
  state = reduceChronoContent(state, { type: "OPEN_CONTENT", itemType: "chronoGroup", itemId: "chrono-a" });
  assert.equal(state.view, "content");
  assert.equal(state.selectedItemId, "chrono-a");
  assert.equal(state.operation, null);

  state = reduceChronoContent(state, { type: "START_EDIT" });
  assert.equal(state.view, "editor");
  assert.deepEqual(state.operation, { intent: "edit", itemType: "chronoGroup", itemId: "chrono-a", parentChronoGroupId: null });
});

test("Chrono Group content and Scene Studio are grouped by owning page", () => {
  const state = createChronoContentState({ chronoGroups, scenes, pages, studio: "scene" });
  assert.deepEqual(selectSceneStudioSections(state).map(({ pageId }) => pageId), ["biomedical", "operations"]);
  assert.deepEqual(selectChronoGroupContent(state, "chrono-a").pageSections.map(({ sceneIds }) => sceneIds), [["scene-a"], ["scene-b"]]);
});

test("creation ownership and return navigation preserve read context", () => {
  let state = createChronoContentState({ chronoGroups, scenes, pages, studio: "chrono", query: "outbreak", scrollTop: 260, focusId: "chrono-a" });
  state = reduceChronoContent(state, { type: "START_CREATE_CHRONO_GROUP" });
  assert.deepEqual(state.operation, { intent: "create", itemType: "chronoGroup", itemId: null, parentChronoGroupId: null });

  state = reduceChronoContent(state, { type: "RETURN_TO_STUDIO" });
  assert.equal(state.view, "library");
  assert.equal(state.query, "outbreak");
  assert.equal(state.scrollTop, 260);
  assert.equal(state.focusId, "chrono-a");

  state = reduceChronoContent(state, { type: "OPEN_CONTENT", itemType: "chronoGroup", itemId: "chrono-a" });
  state = reduceChronoContent(state, { type: "START_CREATE_SCENE" });
  assert.deepEqual(state.operation, { intent: "create", itemType: "scene", itemId: null, parentChronoGroupId: "chrono-a" });
  assert.equal(state.studio, "scene");

  state = reduceChronoContent(state, { type: "RETURN_TO_CONTENT" });
  assert.equal(state.studio, "chrono");
  assert.equal(state.view, "content");
  assert.equal(state.selectedItemId, "chrono-a");
});

test("selectors derive saved content without duplicating it into navigation state", () => {
  const state = createChronoContentState({ chronoGroups, scenes, pages, studio: "chrono" });
  assert.equal(selectChronoStudioCards(state)[0].name, "Municipal outbreak playback");
  assert.equal(selectSceneContent(state, "scene-a").chronoGroupName, "Municipal outbreak playback");
  assert.notStrictEqual(state.chronoGroups, chronoGroups);
});

test("durable temporal review findings make Chrono and Scene cards visibly need attention", () => {
  const findings = [
    { itemType: "chronoGroup", itemId: "chrono-a", code: "source-temporal-review", message: "Cases changed; review this Chrono Group." },
    { itemType: "scene", itemId: "scene-a", code: "present-temporal-review", message: "Cases changed; review this Scene presentation." },
  ];
  const state = createChronoContentState({ chronoGroups, scenes, pages, findings });
  assert.equal(selectChronoStudioCards(state)[0].status, "needs-attention");
  assert.match(selectChronoGroupContent(state, "chrono-a").statusReasons[0], /Cases changed/);
  assert.equal(selectSceneStudioSections(state).flatMap(({ scenes: items }) => items).find(({ id }) => id === "scene-a").status, "needs-attention");
  assert.match(selectSceneContent(state, "scene-a").statusReasons[0], /Scene presentation/);
});

test("reopening the active Scene Studio preserves its current browse context", () => {
  let state = createChronoContentState({
    chronoGroups,
    scenes: [scenes[1]],
    pages,
    studio: "scene",
    pageId: "biomedical",
  });
  state = reduceChronoContent(state, { type: "SET_PAGE_FILTER", pageId: "operations" });
  state = reduceChronoContent(state, { type: "OPEN_CONTENT", itemType: "scene", itemId: "scene-b" });
  state = reduceChronoContent(state, { type: "SET_STUDIO", studio: "scene" });

  assert.equal(state.pageId, "operations");
  assert.deepEqual(selectSceneStudioSections(state).map(({ pageId }) => pageId), ["operations"]);
});

test("initial Page context belongs only to the Studio that received it", () => {
  let state = createChronoContentState({
    chronoGroups,
    scenes,
    pages,
    studio: "scene",
    pageId: "biomedical",
  });

  state = reduceChronoContent(state, { type: "SET_STUDIO", studio: "chrono" });

  assert.equal(state.pageId, null);
  assert.deepEqual(selectChronoStudioCards(state).map(({ id }) => id), ["chrono-a"]);
});

test("temporal owner adapters use local auxiliary draft IDs and publish only meaningful pending lifecycles", () => {
  const cleanChrono = withTemporalOwnerScope({ status: "clean" }, "chrono", "local-chrono");
  const dirtyChrono = { ...cleanChrono, status: "dirty", stage: "period" };
  const suspendedScene = withTemporalOwnerScope({
    status: "suspended",
    suspendedStatus: "error",
    restoration: { stage: "details", focusId: "scene-frame-source", scrollTop: 420 },
  }, "scene", "local-scene");

  assert.deepEqual(selectTemporalDraftOwners({ chronoGroup: cleanChrono }), []);
  assert.deepEqual(selectTemporalDraftOwners({ chronoGroup: dirtyChrono, scene: suspendedScene }), [{
    draftId: "chrono:local-chrono",
    kind: "chrono",
    scopeId: "local-chrono",
    targetId: "period",
    status: "dirty",
    activity: "active",
    surface: "chrono-studio",
    restoration: null,
  }, {
    draftId: "scene:local-scene",
    kind: "scene",
    scopeId: "local-scene",
    targetId: "details",
    status: "error",
    activity: "suspended",
    surface: "scene-studio",
    restoration: { stage: "details", focusId: "scene-frame-source", scrollTop: 420 },
  }]);
});

test("Needs attention repair retains the Frame source destination in the Scene operation", () => {
  let state = createChronoContentState({ chronoGroups, scenes, pages, studio: "scene" });
  state = reduceChronoContent(state, { type: "OPEN_CONTENT", itemType: "scene", itemId: "scene-a" });
  state = reduceChronoContent(state, {
    type: "START_REPAIR",
    itemType: "scene",
    itemId: "scene-a",
    stage: "details",
    focusId: "scene-frame-source",
  });
  assert.deepEqual(state.operation, {
    intent: "repair",
    itemType: "scene",
    itemId: "scene-a",
    parentChronoGroupId: null,
    stage: "details",
    focusId: "scene-frame-source",
  });
});
