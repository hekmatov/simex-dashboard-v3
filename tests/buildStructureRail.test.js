import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { analyzeBuildLayoutMove, applyBuildLayoutMoveToDashboard } from "../src/components/build/buildLayoutMove.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: BuildStructureRail },
  moveDialogModule,
  moveConfirmationModule,
  createDialogModule,
] = await Promise.all([
  vite.ssrLoadModule("/src/components/build/BuildStructureRail.jsx"),
  vite.ssrLoadModule("/src/components/build/BuildMoveDialog.jsx").catch(() => null),
  vite.ssrLoadModule("/src/components/build/BuildMoveConfirmationDialog.jsx").catch(() => null),
  vite.ssrLoadModule("/src/components/build/BuildLayoutCreateDialog.jsx").catch(() => null),
]);
await vite.close();

test("Dashboard map tree exposes selected rows as compact direct drag targets", () => {
  const html = renderToStaticMarkup(React.createElement(BuildStructureRail, {
    dashboard: {
      pages: [{ id: "one", label: "One", sections: [{ id: "overview", title: "Overview", panels: [] }] }],
      chronoGroups: [{ id: "period", name: "Period" }],
    },
    selection: { kind: "page", pageId: "one" },
  }));

  assert.match(html, /build-tree-row is-selected/);
  assert.match(html, /role="treeitem"[\s\S]*tabindex="0"/);
  assert.match(html, /build-tree-group/);
  assert.doesNotMatch(html, />Chrono Groups</);
  assert.doesNotMatch(html, />Period</);
  assert.match(html, /<li(?=[^>]*role="treeitem")(?=[^>]*data-build-node-kind="page")(?=[^>]*draggable="true")[^>]*>/);
  assert.match(html, /<li(?=[^>]*role="treeitem")(?=[^>]*data-build-node-kind="section")(?=[^>]*draggable="true")[^>]*>/);
  assert.equal((html.match(/class="build-tree-caret"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /build-tree-move-handle|build-tree-kind-icon/);
});

test("cross-Page moves preserve partial Storylines and name whole-Storyline reanchoring", () => {
  const dashboard = {
    pages: [
      { id: "one", sections: [{ id: "a", panels: [
        { id: "placement-cases", chart: { id: "cases", title: "Cases" } },
        { id: "placement-capacity", chart: { id: "capacity", title: "Capacity" } },
      ] }] },
      { id: "two", sections: [{ id: "b", panels: [] }] },
    ],
    scenes: [{
      id: "morning",
      name: "Morning brief",
      pageId: "one",
      members: [{ chartId: "cases" }, { chartId: "capacity" }],
      frames: { mode: "source", chartId: "cases" },
      present: { chartIds: ["cases"], layout: "single" },
    }],
  };
  const move = { kind: "panel", source: { pageId: "one", sectionId: "a", placementId: "placement-cases" }, target: { pageId: "two", sectionId: "b", index: 0 } };
  const partial = analyzeBuildLayoutMove(dashboard, move);
  assert.equal(partial.requiresConfirmation, false);
  assert.deepEqual(partial.consequences, []);
  assert.deepEqual(applyBuildLayoutMoveToDashboard(dashboard, partial).scenes, dashboard.scenes);
  const whole = structuredClone(dashboard);
  whole.scenes[0].members = [{ chartId: "cases" }];
  const analysis = analyzeBuildLayoutMove(whole, move);
  assert.equal(analysis.consequences[0].type, "scene-page-migration");
  assert.equal(applyBuildLayoutMoveToDashboard(whole, analysis).scenes[0].pageId, "two");
  const html = renderToStaticMarkup(React.createElement(moveConfirmationModule.default, {
    analysis,
    onCancel() {},
    onConfirm() {},
  }));

  assert.match(html, /Morning brief/);
  assert.match(html, /Cases/);
  assert.match(html, /whole Scene move to the destination Page/);
  assert.doesNotMatch(html, /Frame source becomes unresolved|Present fallback/);
  assert.match(html, />Confirm move</);
  assert.match(html, />Cancel</);
});

test("Move dialog exposes a single-pointer destination path and exact actions", () => {
  assert.equal(typeof moveDialogModule?.default, "function");
  const BuildMoveDialog = moveDialogModule.default;
  const html = renderToStaticMarkup(React.createElement(BuildMoveDialog, {
    open: true,
    dashboard: {
      pages: [{ id: "one", label: "One", sections: [{ id: "a", title: "A", panels: [] }] }, { id: "two", label: "Two", sections: [{ id: "b", title: "B", panels: [] }] }],
    },
    source: { kind: "section", pageId: "one", sectionId: "a" },
    sourceLabel: "A",
    onCancel() {},
    onMove() {},
  }));

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-label="Destination"/);
  assert.match(html, />Move A</);
  assert.match(html, />Move</);
  assert.match(html, />Cancel</);
});

test("layout creation dialog keeps incomplete names local until valid submit", () => {
  assert.equal(typeof createDialogModule?.default, "function");
  assert.equal(createDialogModule?.validBuildLayoutCreationName("   "), false);
  assert.equal(createDialogModule?.validBuildLayoutCreationName("Response"), true);
  const html = renderToStaticMarkup(React.createElement(createDialogModule.default, {
    open: true,
    kind: "section",
    onSubmit() {},
    onCancel() {},
  }));
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-label="Section name"/);
  assert.match(html, />Create section</);
  assert.match(html, />Cancel</);
});

test("Move dialogs trap Tab focus inside their active controls", () => {
  const first = { focusCalls: 0, focus() { this.focusCalls += 1; } };
  const last = { focusCalls: 0, focus() { this.focusCalls += 1; } };
  const container = { querySelectorAll() { return [first, last]; } };
  const forward = { key: "Tab", shiftKey: false, target: last, prevented: false, preventDefault() { this.prevented = true; } };
  const backward = { key: "Tab", shiftKey: true, target: first, prevented: false, preventDefault() { this.prevented = true; } };

  assert.equal(moveDialogModule.trapDialogTabKey(forward, container), true);
  assert.equal(forward.prevented, true);
  assert.equal(first.focusCalls, 1);
  assert.equal(moveDialogModule.trapDialogTabKey(backward, container), true);
  assert.equal(backward.prevented, true);
  assert.equal(last.focusCalls, 1);
});
