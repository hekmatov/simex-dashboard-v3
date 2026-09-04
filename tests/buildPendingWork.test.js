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

test("every adopted authored dirty key maps to one stable pending-work descriptor", () => {
  const ids = new Map();
  const projectedKeys = AUTHORED_DIRTY_KEYS.filter(
    (key) => !new Set(["inlineRename", "scenario", "dashboardMetadata"]).has(key),
  );
  for (const key of projectedKeys) {
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
  assert.equal(ids.size, projectedKeys.length);
});

test("deferred dashboard configuration never masquerades as source content", () => {
  const [pending] = selectBuildPendingWork({
    authoredDirty: { configuration: true },
    actions: actionHarness(),
  });

  assert.deepEqual(
    { id: pending?.id, label: pending?.label, origin: pending?.origin },
    { id: "configuration", label: "Configuration changes", origin: "dashboard-configuration" },
  );
});

test("atomic Passport and dashboard metadata flags never publish Pending Work while adopted owners remain unchanged", () => {
  const owner = {
    draftId: "chart-edit:panel-a",
    kind: "chart-edit",
    scopeId: "panel-a",
    targetId: "panel-a",
    status: "dirty",
    activity: "active",
    surface: "quick",
  };
  const pending = selectBuildPendingWork({
    authoredDirty: {
      scenario: true,
      dashboardMetadata: true,
      chartEditor: true,
    },
    coordinator: { slots: { chart: owner } },
    actions: {
      ...actionHarness(),
      ownerById: { [owner.draftId]: { focus() {} } },
    },
  });

  assert.deepEqual(pending.map(({ id, kind }) => ({ id, kind })), [{
    id: owner.draftId,
    kind: owner.kind,
  }]);
});

test("incomplete inline rename stays local and never publishes a duplicate global descriptor", () => {
  assert.deepEqual(selectBuildPendingWork({ authoredDirty: { inlineRename: true } }), []);
  assert.deepEqual(selectBuildPendingWork({
    authoredDirty: { inlineRename: true, structure: true },
    layoutDraft: {
      draftId: "layout:dashboard-1",
      kind: "layout",
      scopeId: "dashboard-1",
      status: "dirty",
      activity: "active",
    },
  }).map(({ id }) => id), ["layout:dashboard-1"]);
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

test("adopted Text/Image creation and edit owners bypass the legacy staticContent projection", () => {
  const owners = [
    { draftId: "text-image-create:draft-a", kind: "text-image-create", scopeId: "draft-a", status: "dirty", activity: "active", surface: "composer" },
    { draftId: "text-image-edit:placement-a", kind: "text-image-edit", scopeId: "placement-a", status: "error", activity: "suspended", surface: "advanced", restoration: { focusId: "static-qmd-source", scrollTop: 390 } },
  ];
  const pending = selectBuildPendingWork({
    authoredDirty: { staticContent: true },
    owners,
    actions: { ownerById: Object.fromEntries(owners.map((owner) => [owner.draftId, { focus() {}, resume() {}, save() {}, discard() {} }])) },
  });
  assert.deepEqual(pending.map(({ id, activation }) => ({ id, activation })), [
    { id: "text-image-create:draft-a", activation: "focus" },
    { id: "text-image-edit:placement-a", activation: "resume" },
  ]);
  assert.doesNotMatch(pending.map(({ id }) => id).join(" "), /(^|\s)text-image($|\s)/);
});

test("Source Content owners keep exact create/edit identities and bypass pendingContent projections", () => {
  const log = [];
  const create = {
    draftId: "source-content-create:manager-media-local",
    kind: "source-content-create",
    scopeId: "manager-media-local",
    status: "dirty",
    activity: "active",
    surface: "source-content-catalogue",
  };
  const edit = {
    draftId: "source-content-edit:cases",
    kind: "source-content-edit",
    scopeId: "cases",
    status: "error",
    activity: "suspended",
    surface: "source-content-dialog",
    restoration: { focusIndex: 4, scrollTop: 260 },
  };
  const actions = {
    ...actionHarness(log),
    ownerById: {
      [create.draftId]: {
        focus: () => log.push(`focus:${create.draftId}`),
        discard: () => log.push(`discard:${create.draftId}`),
      },
      [edit.draftId]: {
        resume: () => log.push(`resume:${edit.draftId}`),
        discard: () => log.push(`discard:${edit.draftId}`),
      },
    },
  };

  const pending = selectBuildPendingWork({
    authoredDirty: { pendingContent: true },
    owners: [create, edit],
    parkedAuxiliaries: [{
      surface: "source-content",
      draftId: "auxiliary-source-content",
      dirty: true,
      status: "suspended",
    }],
    actions,
  });

  assert.deepEqual(pending.map(({ id, label, activation }) => ({ id, label, activation })), [{
    id: create.draftId,
    label: "New Source Content draft",
    activation: "focus",
  }, {
    id: edit.draftId,
    label: "Source Content changes",
    activation: "resume",
  }]);
  assert.equal(typeof pending[0].discard, "function");
  assert.equal(typeof pending[1].discard, "function");
  pending[0].resume();
  pending[1].resume();
  assert.deepEqual(log, [`focus:${create.draftId}`, `resume:${edit.draftId}`]);

  for (const status of ["saving", "error", "dirty"]) {
    const [same] = selectBuildPendingWork({ owners: [{ ...create, status }], actions });
    assert.equal(same.id, create.draftId);
    assert.equal(same.state, status);
  }
  assert.deepEqual(selectBuildPendingWork({ owners: [{ ...create, status: "clean" }], actions }), []);
});

test("retained ineligible Source Content suppresses legacy pendingContent without publishing a row", () => {
  const retained = {
    draftId: "source-content-create:manager-media-invalid",
    kind: "source-content-create",
    scopeId: "manager-media-invalid",
    status: "dirty",
    activity: "active",
    surface: "source-content-catalogue",
    eligible: false,
  };

  assert.deepEqual(selectBuildPendingWork({
    authoredDirty: { pendingContent: true },
    retainedSourceOwners: [retained],
  }), []);
  assert.deepEqual(selectBuildPendingWork({
    authoredDirty: { pendingContent: true },
    owners: [retained],
    retainedSourceOwners: [retained],
  }), []);

  const eligible = { ...retained, eligible: true };
  assert.deepEqual(selectBuildPendingWork({
    authoredDirty: { pendingContent: true },
    owners: [eligible],
    retainedSourceOwners: [eligible],
  }).map(({ id, label }) => ({ id, label })), [{
    id: retained.draftId,
    label: "New Source Content draft",
  }]);
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
