import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { AUTHORED_DIRTY_KEYS } from "../src/components/build/buildDirtyState.js";
import { selectBuildPendingWork } from "../src/components/build/buildPendingWork.js";

function actionHarness(log = []) {
  return {
    resumeByKey: Object.fromEntries(AUTHORED_DIRTY_KEYS.map((key) => [
      key,
      () => log.push(`resume:${key}`),
    ])),
    resumeAuxiliary: (surface, draftId) => log.push(`aux:${surface}:${draftId}`),
    saveLayout: () => log.push("save:layout"),
    discardLayout: () => log.push("discard:layout"),
  };
}

test("every authored dirty key maps to one stable pending-work descriptor", () => {
  const ids = new Map();
  for (const key of AUTHORED_DIRTY_KEYS) {
    const log = [];
    const [entry] = selectBuildPendingWork({
      authoredDirty: { [key]: true },
      actions: actionHarness(log),
    });

    assert.ok(entry, `${key} must map to pending work`);
    assert.equal(typeof entry.id, "string");
    assert.equal(typeof entry.kind, "string");
    assert.equal(typeof entry.label, "string");
    assert.equal(entry.state, "dirty");
    assert.equal(typeof entry.origin, "string");
    assert.equal(typeof entry.priority, "number");
    assert.equal(typeof entry.resume, "function");
    assert.equal(selectBuildPendingWork({
      authoredDirty: { [key]: true },
      actions: actionHarness(),
    })[0].id, entry.id, `${key} needs a stable id`);
    ids.set(key, entry.id);
    entry.resume();
    assert.deepEqual(log, [`resume:${key}`]);
  }
  assert.equal(ids.size, AUTHORED_DIRTY_KEYS.length);
});

test("layout, chart, and parked auxiliary equivalents deduplicate with correct actions", () => {
  const log = [];
  const pending = selectBuildPendingWork({
    authoredDirty: {
      structure: true,
      chartEditor: true,
      pendingContent: true,
      chronoGroup: true,
    },
    coordinator: {
      slots: {
        layout: { draftId: "layout-slot", status: "dirty" },
        chart: { draftId: "chart-panel-a", targetId: "panel-a", status: "dirty" },
      },
    },
    layoutDraft: { draftId: "layout-dashboard", status: "dirty" },
    parkedAuxiliaries: [
      { surface: "source-content", draftId: "aux-source", dirty: false },
      { surface: "chrono-group", draftId: "aux-chrono", dirty: true },
    ],
    actions: actionHarness(log),
  });

  assert.deepEqual(pending.map(({ id }) => id), [
    "layout",
    "chart-editor",
    "source-content",
    "chrono-group",
  ]);
  assert.equal(new Set(pending.map(({ id }) => id)).size, pending.length);

  const layout = pending.find(({ id }) => id === "layout");
  assert.equal(typeof layout.save, "function");
  assert.equal(typeof layout.discard, "function");
  layout.save();
  layout.discard();
  pending.find(({ id }) => id === "source-content").resume();
  pending.find(({ id }) => id === "chrono-group").resume();
  assert.deepEqual(log, [
    "save:layout",
    "discard:layout",
    "aux:source-content:aux-source",
    "aux:chrono-group:aux-chrono",
  ]);
});

test("clean slots are absent while paused auxiliaries remain resumable", () => {
  const log = [];
  const pending = selectBuildPendingWork({
    coordinator: {
      slots: {
        layout: { draftId: "layout-clean", status: "clean" },
        chart: { draftId: "chart-clean", status: "clean" },
      },
    },
    parkedAuxiliaries: [
      { surface: "scene", draftId: "aux-scene", dirty: false },
    ],
    actions: actionHarness(log),
  });

  assert.deepEqual(pending.map(({ id, state }) => ({ id, state })), [
    { id: "scene", state: "paused" },
  ]);
  pending[0].resume();
  assert.deepEqual(log, ["aux:scene:aux-scene"]);
});

test("the conditional pending row slides in and disables motion when requested", async () => {
  const css = await readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8");
  assert.match(css, /\.build-pending-work\s*\{[^}]*animation:\s*build-pending-work-enter/s);
  assert.match(css, /@keyframes\s+build-pending-work-enter/);
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.build-pending-work\s*\{[^}]*animation:\s*none/s,
  );
});
