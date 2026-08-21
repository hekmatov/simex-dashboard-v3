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
const sceneModule = await vite.ssrLoadModule("/src/components/time/SceneStudio.jsx").catch(() => null);
const twinModule = await vite.ssrLoadModule("/src/components/time/BalancedTwinCanvas.jsx").catch(() => null);
const draftModule = await vite.ssrLoadModule("/src/components/time/sceneDraft.js").catch(() => null);
await vite.close();

const START = "2027-01-01T00:00:00.000Z";
const END = "2027-01-31T00:00:00.000Z";

function fixture() {
  return {
    id: "scene-1",
    name: "Executive surveillance",
    pageId: "page-1",
    groupId: "group-1",
    period: { start: START, end: END },
    frames: { mode: "source", chartId: "chart-a", selection: "all" },
    members: [
      { chartId: "chart-a", width: 2 },
      { chartId: "chart-b", width: 2 },
      { chartId: "chart-c", width: 1 },
    ],
    present: { chartIds: ["chart-a", "chart-b", "chart-c"], layout: "trio" },
    audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } },
  };
}

function validationContext() {
  return {
    groups: [{
      id: "group-1",
      period: { start: START, end: END },
      chartIds: ["chart-a", "chart-b", "chart-c"],
      scenes: [],
    }],
    pages: [{ id: "page-1" }],
    charts: ["chart-a", "chart-b", "chart-c"].map((id) => ({ id, pageId: "page-1" })),
  };
}

test("one Scene draft preserves all semantics across the approved two stages", () => {
  assert.equal(typeof draftModule?.createSceneDraft, "function");
  assert.equal(typeof draftModule?.reduceSceneDraft, "function");
  let draft = draftModule.createSceneDraft(fixture(), validationContext());
  draft = draftModule.reduceSceneDraft(draft, { type: "SET_STAGE", stage: "arrange" });
  draft = draftModule.reduceSceneDraft(draft, { type: "SET_WIDTH", chartId: "chart-a", width: 4 });
  draft = draftModule.reduceSceneDraft(draft, { type: "SET_MATCHING", chartId: "chart-b", matching: "lastKnown" });
  draft = draftModule.reduceSceneDraft(draft, { type: "SET_SECONDS_PER_FRAME", value: 3 });
  draft = draftModule.reduceSceneDraft(draft, {
    type: "SET_DATE_POSITION",
    value: { xPermille: 600, yPermille: 80, widthPermille: 300 },
  });

  assert.equal(draft.stage, "arrange");
  assert.equal(draft.value.members[0].width, 4);
  assert.equal(draft.value.members[1].matching, "lastKnown");
  assert.equal(draft.value.secondsPerFrame, 3);
  assert.deepEqual(draft.value.audience.datePosition, { xPermille: 600, yPermille: 80, widthPermille: 300 });
  assert.deepEqual(draft.baseline, fixture());
});

test("Scene View and Present keep separate deterministic orders and valid membership", () => {
  let draft = draftModule.createSceneDraft(fixture(), validationContext());
  draft = draftModule.reduceSceneDraft(draft, {
    type: "MOVE_CHART",
    board: "scene",
    chartId: "chart-c",
    direction: "earlier",
  });
  draft = draftModule.reduceSceneDraft(draft, {
    type: "MOVE_CHART",
    board: "present",
    chartId: "chart-a",
    direction: "later",
  });
  assert.deepEqual(draft.value.members.map(({ chartId }) => chartId), ["chart-a", "chart-c", "chart-b"]);
  assert.deepEqual(draft.value.present.chartIds, ["chart-b", "chart-a", "chart-c"]);

  const finalMember = draftModule.reduceSceneDraft(draft, { type: "REMOVE_MEMBER", chartId: "chart-a" });
  assert.equal(finalMember.error, null);
  assert.deepEqual(finalMember.value.present.chartIds, ["chart-b", "chart-c"]);
  const removeAllButOne = draftModule.reduceSceneDraft(finalMember, { type: "REMOVE_MEMBER", chartId: "chart-b" });
  const protectedLast = draftModule.reduceSceneDraft(removeAllButOne, { type: "REMOVE_MEMBER", chartId: "chart-c" });
  assert.equal(protectedLast.error.code, "SCENE_MEMBER_REQUIRED");
});

test("Needs-attention and invalid Scene state block Save at the owning stage", () => {
  let draft = draftModule.createSceneDraft(fixture(), validationContext());
  draft = draftModule.reduceSceneDraft(draft, {
    type: "SET_NEEDS_ATTENTION",
    findings: [{ code: "selected-frame-missing", stage: "select", message: "Repair frame" }],
  });
  const blocked = draftModule.reduceSceneDraft(draft, { type: "SAVE_REQUEST" });
  assert.equal(blocked.status, "error");
  assert.equal(blocked.stage, "select");
  assert.equal(blocked.error.code, "SCENE_NEEDS_ATTENTION");

  const invalid = draftModule.createSceneDraft(fixture(), validationContext());
  invalid.value.present.layout = "quad";
  const rejected = draftModule.reduceSceneDraft(invalid, { type: "SAVE_REQUEST" });
  assert.equal(rejected.status, "error");
  assert.equal(rejected.stage, "arrange");
});

test("failed Save, retry, Discard, Stay, and suspension preserve complete state", () => {
  let draft = draftModule.createSceneDraft(fixture(), validationContext());
  draft = draftModule.reduceSceneDraft(draft, { type: "SET_NAME", value: "Updated scene" });
  draft = draftModule.reduceSceneDraft(draft, { type: "SET_STAGE", stage: "arrange" });
  draft = draftModule.reduceSceneDraft(draft, { type: "SAVE_REQUEST" });
  draft = draftModule.reduceSceneDraft(draft, {
    type: "SAVE_FAILED",
    error: { code: "QUOTA_EXHAUSTED", message: "Storage quota exhausted", retryable: true },
  });
  assert.equal(draft.value.name, "Updated scene");
  assert.equal(draft.baseline.name, "Executive surveillance");
  assert.equal(draftModule.reduceSceneDraft(draft, { type: "SAVE_REQUEST" }).status, "saving");

  const restoration = { focusId: "scene-chart-a", scrollTop: 560, stage: "arrange" };
  const suspended = draftModule.reduceSceneDraft(draft, { type: "SUSPEND", restoration });
  const resumed = draftModule.reduceSceneDraft(suspended, { type: "RESUME" });
  assert.deepEqual(resumed.restoration, restoration);
  assert.equal(resumed.stage, "arrange");
  assert.equal(draftModule.reduceSceneDraft(resumed, { type: "STAY" }).status, "dirty");
  assert.equal(draftModule.reduceSceneDraft(resumed, { type: "DISCARD" }).value.name, "Executive surveillance");
});

test("Balanced Twin Canvas exposes equally weighted direct arrangement boards", () => {
  assert.equal(typeof twinModule?.default, "function");
  const html = renderToStaticMarkup(React.createElement(twinModule.default, {
    scene: fixture(),
    charts: validationContext().charts,
    onAction() {},
  }));
  assert.match(html, /balanced-twin-canvas/);
  assert.match(html, /Scene View/);
  assert.match(html, /Present/);
  assert.equal((html.match(/data-chart-id=/g) ?? []).length, 6);
  assert.match(html, /Move earlier/);
  assert.match(html, /Move later/);
});

test("Scene Studio presents Select and Arrange while retaining all settings", () => {
  assert.equal(typeof sceneModule?.default, "function");
  const draft = draftModule.createSceneDraft(fixture(), validationContext());
  const html = renderToStaticMarkup(React.createElement(sceneModule.default, {
    draft,
    charts: validationContext().charts,
    onAction() {},
  }));
  assert.match(html, /Scene draft/);
  assert.match(html, /Select charts and frames/);
  assert.match(html, /Arrange and configure/);
  assert.match(html, /Frame source/);
  assert.match(html, /Save Scene/);

  const arrangeHtml = renderToStaticMarkup(React.createElement(sceneModule.default, {
    draft: { ...draft, stage: "arrange" },
    charts: validationContext().charts,
    onAction() {},
  }));
  assert.match(arrangeHtml, /Audience date position/);
  assert.match(arrangeHtml, /Seconds per frame/);
});
