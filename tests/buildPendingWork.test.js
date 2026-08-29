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
    "chrono:aux-chrono",
  ]);
  assert.equal(new Set(pending.map(({ id }) => id)).size, pending.length);

  const layout = pending.find(({ id }) => id === "layout");
  assert.equal(typeof layout.save, "function");
  assert.equal(typeof layout.discard, "function");
  layout.save();
  layout.discard();
  pending.find(({ id }) => id === "source-content").resume();
  pending.find(({ id }) => id === "chrono:aux-chrono").resume();
  assert.deepEqual(log, [
    "save:layout",
    "discard:layout",
    "aux:source-content:aux-source",
    "aux:chrono-group:aux-chrono",
  ]);
});

test("clean slots are absent while non-temporal paused auxiliaries remain resumable", () => {
  const log = [];
  const pending = selectBuildPendingWork({
    coordinator: {
      slots: {
        layout: { draftId: "layout-clean", status: "clean" },
        chart: { draftId: "chart-clean", status: "clean" },
      },
    },
    parkedAuxiliaries: [
      { surface: "time-content", draftId: "aux-library", dirty: false },
    ],
    actions: actionHarness(log),
  });

  assert.deepEqual(pending.map(({ id, state }) => ({ id, state })), [
    { id: "auxiliary:aux-library", state: "paused" },
  ]);
  pending[0].resume();
  assert.deepEqual(log, ["aux:time-content:aux-library"]);
});

test("an adopted chart edit owner projects one stable row and bypasses both legacy chart paths", () => {
  const log = [];
  const actions = {
    ...actionHarness(log),
    ownerById: {
      "chart-edit:panel-a": {
        focus: () => log.push("focus:full"),
        resume: () => log.push("resume:full"),
        save: () => log.push("save:chart"),
        discard: () => log.push("discard:chart"),
      },
    },
  };
  const base = {
    draftId: "chart-edit:panel-a",
    kind: "chart-edit",
    scopeId: "panel-a",
    targetId: "panel-a",
    status: "dirty",
    activity: "active",
    surface: "full",
    restoration: { surface: "full", focusId: "chart-stage-configure-chart", scrollTop: 420 },
  };

  const active = selectBuildPendingWork({
    authoredDirty: { chartEditor: true },
    coordinator: { slots: { chart: base } },
    actions,
  });

  assert.equal(active.length, 1);
  assert.deepEqual(active[0], {
    id: "chart-edit:panel-a",
    kind: "chart-edit",
    scopeId: "panel-a",
    targetId: "panel-a",
    label: "Chart changes",
    origin: "full",
    priority: 20,
    state: "dirty",
    activity: "active",
    surface: "full",
    restoration: base.restoration,
    activation: "focus",
    resume: actions.ownerById["chart-edit:panel-a"].focus,
    save: actions.ownerById["chart-edit:panel-a"].save,
    discard: actions.ownerById["chart-edit:panel-a"].discard,
  });
  active[0].resume();

  for (const status of ["saving", "error"]) {
    const [entry] = selectBuildPendingWork({
      authoredDirty: { chartEditor: true },
      coordinator: {
        slots: {
          chart: { ...base, status, activity: "suspended" },
        },
      },
      actions,
    });
    assert.equal(entry.id, "chart-edit:panel-a");
    assert.equal(entry.state, status);
    assert.equal(entry.activity, "suspended");
    assert.equal(entry.activation, "resume");
    assert.strictEqual(entry.resume, actions.ownerById[entry.id].resume);
  }

  assert.deepEqual(log, ["focus:full"]);
  assert.deepEqual(selectBuildPendingWork({
    authoredDirty: { chartEditor: false },
    coordinator: { slots: { chart: { ...base, status: "clean" } } },
    actions,
  }), []);
});

test("adopted chart creation bypasses the legacy wizard key without colliding with chart edit identity", () => {
  const create = selectBuildPendingWork({
    authoredDirty: { chartWizard: true },
    coordinator: {
      slots: {
        chart: {
          draftId: "chart-create:draft-a",
          kind: "chart-create",
          scopeId: "draft-a",
          targetId: "draft-a",
          status: "dirty",
          activity: "suspended",
          surface: "create",
          restoration: { focusId: "chart-stage-review-and-create", scrollTop: 300 },
        },
      },
    },
    actions: {
      ...actionHarness(),
      ownerById: { "chart-create:draft-a": { resume() {} } },
    },
  });

  assert.deepEqual(create.map(({ id, kind }) => ({ id, kind })), [{
    id: "chart-create:draft-a",
    kind: "chart-create",
  }]);
  assert.notEqual(create[0].id, "chart-edit:draft-a");
});

test("distinct adopted chart creation and edit owners coexist without legacy duplicates", () => {
  const edit = {
    draftId: "chart-edit:panel-a",
    kind: "chart-edit",
    scopeId: "panel-a",
    targetId: "panel-a",
    status: "dirty",
    activity: "active",
    surface: "quick",
  };
  const create = {
    draftId: "chart-create:draft-a",
    kind: "chart-create",
    scopeId: "draft-a",
    targetId: "draft-a",
    status: "dirty",
    activity: "suspended",
    surface: "create",
  };

  const pending = selectBuildPendingWork({
    authoredDirty: { chartEditor: true, chartWizard: true },
    coordinator: { slots: { chart: edit } },
    chartOwners: [edit, create],
    actions: {
      ...actionHarness(),
      ownerById: {
        [edit.draftId]: { focus() {} },
        [create.draftId]: { resume() {} },
      },
    },
  });

  assert.deepEqual(pending.map(({ id }) => id), [edit.draftId, create.draftId]);
  assert.equal(new Set(pending.map(({ id }) => id)).size, 2);
  assert.doesNotMatch(pending.map(({ id }) => id).join(" "), /chart-editor|chart-wizard/);
});

test("a failed chart removal preserves operation metadata for the exact retry action", () => {
  const [pending] = selectBuildPendingWork({
    coordinator: {
      slots: {
        chart: {
          draftId: "chart-edit:panel-a",
          kind: "chart-edit",
          scopeId: "panel-a",
          targetId: "panel-a",
          status: "error",
          activity: "active",
          surface: "quick",
          operation: "remove",
        },
      },
    },
    actions: {
      ownerById: {
        "chart-edit:panel-a": { save() {} },
      },
    },
  });

  assert.equal(pending.operation, "remove");
});

test("stable layout, Chrono, and Scene owners replace transitional dirty projections without duplicates", () => {
  const log = [];
  const owners = [{
    draftId: "layout:dashboard-1",
    kind: "layout",
    scopeId: "dashboard-1",
    status: "dirty",
    activity: "active",
    surface: "dashboard-map",
    targetId: "section-a",
  }, {
    draftId: "chrono:local-chrono-draft",
    kind: "chrono",
    scopeId: "local-chrono-draft",
    status: "error",
    activity: "suspended",
    surface: "chrono-studio",
    restoration: { focusId: "chrono-period", scrollTop: 310 },
  }, {
    draftId: "scene:local-scene-draft",
    kind: "scene",
    scopeId: "local-scene-draft",
    status: "saving",
    activity: "active",
    surface: "scene-studio",
  }];
  const actions = {
    ...actionHarness(log),
    ownerById: Object.fromEntries(owners.map((owner) => [owner.draftId, {
      focus: () => log.push(`focus:${owner.draftId}`),
      resume: () => log.push(`resume:${owner.draftId}`),
      save: () => log.push(`save:${owner.draftId}`),
      discard: () => log.push(`discard:${owner.draftId}`),
    }])),
  };

  const pending = selectBuildPendingWork({
    authoredDirty: { structure: true, chronoGroup: true, scene: true },
    coordinator: { slots: { layout: owners[0], chart: null } },
    owners: owners.slice(1),
    layoutDraft: owners[0],
    parkedAuxiliaries: [
      { surface: "chrono-group", draftId: "local-chrono-draft", dirty: true },
      { surface: "scene", draftId: "local-scene-draft", dirty: true },
    ],
    actions,
  });

  assert.deepEqual(pending.map(({ id }) => id), owners.map(({ draftId }) => draftId));
  assert.equal(new Set(pending.map(({ id }) => id)).size, 3);
  assert.deepEqual(pending.map(({ activation }) => activation), ["focus", "resume", "focus"]);
  pending[0].resume();
  pending[1].resume();
  assert.deepEqual(log, ["focus:layout:dashboard-1", "resume:chrono:local-chrono-draft"]);
  assert.doesNotMatch(pending.map(({ id }) => id).join(" "), /^(layout|chrono-group|scene)$/);
});

test("clean Chrono and Scene owners and clean temporal auxiliary opens publish nothing", () => {
  const cleanOwners = [
    { draftId: "chrono:chrono-draft", kind: "chrono", scopeId: "chrono-draft", status: "clean", activity: "active" },
    { draftId: "scene:scene-draft", kind: "scene", scopeId: "scene-draft", status: "clean", activity: "active" },
  ];
  assert.deepEqual(selectBuildPendingWork({
    owners: cleanOwners,
    parkedAuxiliaries: [
      { surface: "chrono-group", draftId: "chrono-draft", dirty: false, status: "clean" },
      { surface: "scene", draftId: "scene-draft", dirty: false, status: "clean" },
    ],
  }), []);
});

test("layout-owned Scene consequences publish only the layout transaction descriptor", () => {
  const layoutDraft = {
    draftId: "layout:dashboard-1",
    kind: "layout",
    scopeId: "dashboard-1",
    status: "dirty",
    activity: "active",
    sceneConsequences: [{ type: "scene-frame-source-unresolved", sceneId: "scene-a" }],
  };
  assert.deepEqual(selectBuildPendingWork({
    layoutDraft,
    authoredDirty: { structure: true },
  }).map(({ id, kind }) => ({ id, kind })), [{
    id: "layout:dashboard-1",
    kind: "layout",
  }]);
});

test("an unscoped live layout prop cannot duplicate its normalized coordinator owner", () => {
  const pending = selectBuildPendingWork({
    coordinator: {
      slots: {
        layout: {
          draftId: "layout:dashboard-1",
          kind: "layout",
          scopeId: "dashboard-1",
          status: "dirty",
          activity: "active",
        },
        chart: null,
      },
    },
    layoutDraft: {
      draftId: "layout:dashboard-1",
      kind: "layout",
      status: "dirty",
      targetId: "section-a",
    },
    authoredDirty: { structure: true },
  });

  assert.deepEqual(pending.map(({ id, kind }) => ({ id, kind })), [{
    id: "layout:dashboard-1",
    kind: "layout",
  }]);
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
