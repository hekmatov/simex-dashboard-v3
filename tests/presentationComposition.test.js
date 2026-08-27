import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const compositionModule = await vite.ssrLoadModule(
  "/src/components/presentation/CompositionControls.jsx",
).catch(() => null);
const controllerModule = await vite.ssrLoadModule(
  "/src/components/presentation/PresentationController.jsx",
).catch(() => null);
await vite.close();

const mutationModule = await import(
  "../src/lib/sceneDatePositionMutation.js"
).catch(() => null);

const savedPosition = Object.freeze({
  xPermille: 680,
  yPermille: 40,
  widthPermille: 280,
});

test("date-position draft clamps drag and keyboard movement to the Audience canvas", () => {
  assert.equal(typeof compositionModule?.createCompositionDraft, "function");
  let draft = compositionModule.createCompositionDraft(savedPosition);
  draft = compositionModule.reduceCompositionDraft(draft, {
    type: "SET_DATE_POSITION",
    value: { xPermille: 940.4, yPermille: -18, widthPermille: 300.8 },
  });
  assert.deepEqual(draft.value, {
    xPermille: 699,
    yPermille: 0,
    widthPermille: 301,
  });
  assert.equal(draft.status, "dirty");

  assert.deepEqual(compositionModule.moveDatePositionByKeyboard(draft.value, {
    key: "ArrowRight",
    shiftKey: false,
  }), { xPermille: 699, yPermille: 0, widthPermille: 301 });
  assert.deepEqual(compositionModule.moveDatePositionByKeyboard(draft.value, {
    key: "ArrowDown",
    shiftKey: true,
  }), { xPermille: 699, yPermille: 1, widthPermille: 301 });
});

test("Cancel restores the saved baseline and save failure retains a retryable dirty draft", () => {
  let draft = compositionModule.createCompositionDraft(savedPosition);
  draft = compositionModule.reduceCompositionDraft(draft, {
    type: "SET_DATE_POSITION",
    value: { xPermille: 120, yPermille: 250, widthPermille: 420 },
  });
  draft = compositionModule.reduceCompositionDraft(draft, { type: "SAVE_REQUESTED" });
  assert.equal(draft.status, "saving");
  draft = compositionModule.reduceCompositionDraft(draft, {
    type: "SAVE_FAILED",
    error: new Error("storage failed"),
  });
  assert.equal(draft.status, "error");
  assert.equal(draft.dirty, true);
  assert.equal(draft.error.retryable, true);
  assert.match(draft.error.message, /storage failed/);
  assert.deepEqual(draft.value, {
    xPermille: 120,
    yPermille: 250,
    widthPermille: 420,
  });

  draft = compositionModule.reduceCompositionDraft(draft, { type: "CANCEL" });
  assert.equal(draft.status, "clean");
  assert.equal(draft.dirty, false);
  assert.deepEqual(draft.value, savedPosition);
});

test("successful save accepts only the persisted position as the next clean baseline", () => {
  let draft = compositionModule.createCompositionDraft(savedPosition);
  draft = compositionModule.reduceCompositionDraft(draft, {
    type: "SET_DATE_POSITION",
    value: { xPermille: 125, yPermille: 250, widthPermille: 375 },
  });
  draft = compositionModule.reduceCompositionDraft(draft, { type: "SAVE_REQUESTED" });
  draft = compositionModule.reduceCompositionDraft(draft, {
    type: "SAVE_SUCCEEDED",
    value: { xPermille: 125, yPermille: 250, widthPermille: 375 },
  });

  assert.equal(draft.status, "clean");
  assert.equal(draft.dirty, false);
  assert.deepEqual(draft.baseline, {
    xPermille: 125,
    yPermille: 250,
    widthPermille: 375,
  });
});

test("the Scene mutation changes one camelCase datePosition and preserves every unrelated field", () => {
  assert.equal(typeof mutationModule?.mutateSceneDatePosition, "function");
  const dashboard = dashboardFixture();
  const beforeSibling = structuredClone(dashboard.scenes[1]);
  const beforeTarget = structuredClone(dashboard.scenes[0]);
  const result = mutationModule.mutateSceneDatePosition(
    dashboard,
    "scene-a",
    { xPermille: 125, yPermille: 250, widthPermille: 375 },
  );

  assert.deepEqual(result, { xPermille: 125, yPermille: 250, widthPermille: 375 });
  assert.deepEqual(dashboard.scenes[1], beforeSibling);
  assert.deepEqual(dashboard.scenes[0], {
    ...beforeTarget,
    audience: {
      ...beforeTarget.audience,
      datePosition: { xPermille: 125, yPermille: 250, widthPermille: 375 },
    },
  });
  assert.equal(Object.hasOwn(dashboard.scenes[0].audience.datePosition, "x_permille"), false);
});

test("the targeted mutation rejects missing or no-longer-valid Scenes without partial writes", () => {
  const dashboard = dashboardFixture();
  const before = structuredClone(dashboard);
  assert.throws(() => mutationModule.mutateSceneDatePosition(
    dashboard,
    "missing",
    savedPosition,
  ), /does not exist/i);
  assert.deepEqual(dashboard, before);

  dashboard.scenes[0].members = [];
  const invalidBefore = structuredClone(dashboard);
  assert.throws(() => mutationModule.mutateSceneDatePosition(
    dashboard,
    "scene-a",
    { xPermille: 100, yPermille: 100, widthPermille: 200 },
  ), /at least one chart/i);
  assert.deepEqual(dashboard, invalidBefore);
});

test("unsaved date edits never enter the strict state while saved camelCase maps to snake_case", () => {
  const dashboard = dashboardFixture();
  const scene = dashboard.scenes[0];
  const playback = {
    activeScene: scene,
    activeSceneId: scene.id,
    activeGroup: dashboard.chronoGroups[0],
    activeGroupId: "group-a",
    activeIndex: 0,
    clock: [Date.parse(scene.period.start)],
    speed: 1,
    traceMode: "reveal",
  };
  const draft = compositionModule.reduceCompositionDraft(
    compositionModule.createCompositionDraft(scene.audience.datePosition),
    {
      type: "SET_DATE_POSITION",
      value: { xPermille: 125, yPermille: 250, widthPermille: 375 },
    },
  );
  const projected = controllerModule.buildPresentationState({
    dashboard,
    activePageId: "page-a",
    displayedChartIds: ["chart-a"],
    layout: "solo",
    playback,
    presentableItemIndex: new Map([
      ["chart-a", { descriptor: { kind: "chart", chart_id: "chart-a" } }],
    ]),
    audienceFacts: {},
  });

  assert.equal(draft.dirty, true);
  assert.deepEqual(projected.audience.date_position, {
    x_permille: 680,
    y_permille: 40,
    width_permille: 280,
  });
});

test("composition controls expose an explicit dirty Save/Cancel boundary for saved Scenes only", () => {
  const html = renderToStaticMarkup(React.createElement(compositionModule.default, {
    scene: dashboardFixture().scenes[0],
    onSaveSceneDatePosition() {},
  }));
  assert.match(html, /data-presentation-composition-id="date-position"/);
  assert.match(html, /data-presentation-control-id="date-position-save"/);
  assert.match(html, /data-presentation-control-id="date-position-cancel"/);
  assert.match(html, /Audience date position/);
  assert.doesNotMatch(html, /session_override|matching override/i);
});

function dashboardFixture() {
  const chart = { id: "chart-a", pageId: "page-a", title: "Cases" };
  const scene = {
    id: "scene-a",
    name: "Response scene",
    pageId: "page-a",
    chronoGroupId: "group-a",
    period: {
      start: "2027-01-01T00:00:00.000Z",
      end: "2027-01-02T23:59:59.999Z",
    },
    members: [{ chartId: "chart-a", width: 1 }],
    frames: { mode: "calendar", interval: { value: 1, unit: "day" } },
    present: { chartIds: ["chart-a"], layout: "single" },
    audience: { datePosition: structuredClone(savedPosition) },
    note: "preserve me",
  };
  return {
    id: "dashboard-a",
    configVersion: 3,
    pages: [{ id: "page-a", sections: [{ id: "section-a", panels: [chart] }] }],
    chronoGroups: [{
      id: "group-a",
      period: { start: "2027-01-01", end: "2027-01-31" },
      members: [{ chartId: "chart-a" }],
    }],
    scenes: [scene, { ...structuredClone(scene), id: "scene-b", name: "Sibling" }],
  };
}
