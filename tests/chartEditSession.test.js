import assert from "node:assert/strict";
import test from "node:test";

import * as chartEditSessionModel from "../src/charting/forms/chartEditSession.js";
import {
  chartEditSessionPendingSurface,
  createChartEditSession,
  dismissChartEditSession,
  isChartEditSessionDirty,
  materializeChartEditSessionSave,
  prepareChartEditSessionSave,
  prepareConfirmedChartEditRemoval,
  projectChartEditSessionOwner,
  projectChartEditSessionDashboard,
  reduceChartEditSession,
} from "../src/charting/forms/chartEditSession.js";

test("one stable chart-edit owner spans Quick and Full active, suspended, saving, and error states", () => {
  const clean = createSession();

  assert.deepEqual(clean.owner, {
    kind: "chart-edit",
    scopeId: "placement-a",
  });
  assert.equal(clean.activity, "active");
  assert.equal(projectChartEditSessionOwner(clean), null);

  const quick = changeChart(clean, "quick", { title: "Quick title" });
  const activeQuick = projectChartEditSessionOwner(quick);
  assert.deepEqual(activeQuick, {
    id: "chart-edit:placement-a",
    kind: "chart-edit",
    scopeId: "placement-a",
    targetId: "placement-a",
    label: "Chart changes",
    status: "dirty",
    activity: "active",
    surface: "quick",
    restoration: quick.restoration,
    activation: "focus",
  });

  const full = reduceChartEditSession(quick, { type: "OPEN", surface: "full" });
  assert.equal(projectChartEditSessionOwner(full).id, activeQuick.id);
  assert.equal(projectChartEditSessionOwner(full).surface, "full");
  assert.equal(projectChartEditSessionOwner(full).activation, "focus");

  const suspended = reduceChartEditSession(full, {
    type: "SUSPEND",
    surface: "full",
    restoration: { surface: "full", focusId: "chart-stage-configure-chart", scrollTop: 420 },
  });
  const suspendedOwner = projectChartEditSessionOwner(suspended);
  assert.equal(suspended.activity, "suspended");
  assert.equal(suspendedOwner.id, activeQuick.id);
  assert.equal(suspendedOwner.status, "dirty");
  assert.equal(suspendedOwner.activity, "suspended");
  assert.equal(suspendedOwner.activation, "resume");
  assert.deepEqual(suspendedOwner.restoration, {
    surface: "full",
    focusId: "chart-stage-configure-chart",
    scrollTop: 420,
  });

  const saving = prepareChartEditSessionSave(suspended).session;
  assert.equal(projectChartEditSessionOwner(saving).id, activeQuick.id);
  assert.equal(projectChartEditSessionOwner(saving).status, "saving");
  assert.equal(projectChartEditSessionOwner(saving).activity, "suspended");

  const failed = reduceChartEditSession(saving, {
    type: "PERSISTENCE_FAILED",
    error: { code: "SAVE_FAILED", message: "Retry this Save.", retryable: true },
  });
  assert.equal(projectChartEditSessionOwner(failed).id, activeQuick.id);
  assert.equal(projectChartEditSessionOwner(failed).status, "error");

  assert.equal(
    projectChartEditSessionOwner(reduceChartEditSession(failed, { type: "RESET" })),
    null,
  );
});

test("parent dismissal releases a clean session and retains a changed session", () => {
  const clean = createSession();
  assert.equal(dismissChartEditSession(clean, {
    surface: "quick",
    restoration: {
      surface: "quick",
      focusId: "edit-placement-a",
      scrollTop: 180,
    },
  }), null);

  const changed = changeChart(clean, "quick", { title: "Admissions now" });
  const retained = dismissChartEditSession(changed, {
    surface: "quick",
    restoration: {
      surface: "quick",
      focusId: "chart-field-title",
      scrollTop: 324,
    },
  });

  assert.equal(retained.activeSurface, null);
  assert.equal(retained.suspended, true);
  assert.equal(retained.draft.title, "Admissions now");
  assert.deepEqual(retained.restoration, {
    surface: "quick",
    focusId: "chart-field-title",
    scrollTop: 324,
  });
});

test("clean click-away dismissal creates no suspended or pending chart work", () => {
  const session = createSession();

  const dismissed = reduceChartEditSession(session, {
    type: "SUSPEND",
    surface: "quick",
    restoration: {
      surface: "quick",
      focusId: "edit-placement-a",
      scrollTop: 180,
    },
  });

  assert.equal(dismissed.activeSurface, null);
  assert.equal(dismissed.suspended, false);
  assert.equal(dismissed.status, "clean");
  assert.deepEqual(dismissed.dirtyOrigins, { quick: false, full: false });
  assert.equal(isChartEditSessionDirty(dismissed), false);
  assert.equal(chartEditSessionPendingSurface(dismissed), null);
});

test("changed click-away suspends the quick draft with exact restoration", () => {
  const changed = changeChart(createSession(), "quick", { title: "Admissions now" });

  const suspended = reduceChartEditSession(changed, {
    type: "SUSPEND",
    surface: "quick",
    restoration: {
      surface: "quick",
      focusId: "quick-chart-title",
      scrollTop: 324,
    },
  });

  assert.equal(suspended.activeSurface, null);
  assert.equal(suspended.suspended, true);
  assert.equal(suspended.status, "dirty");
  assert.deepEqual(suspended.restoration, {
    surface: "quick",
    focusId: "quick-chart-title",
    scrollTop: 324,
  });
  assert.equal(suspended.draft.title, "Admissions now");
  assert.equal(chartEditSessionPendingSurface(suspended), "quick");

  const resumed = reduceChartEditSession(suspended, { type: "RESUME" });
  assert.equal(resumed.activeSurface, "quick");
  assert.equal(resumed.suspended, false);
  assert.equal(resumed.draft.title, "Admissions now");
});

test("rendering-only preview applies the draft immediately without mutation or stamping", () => {
  const dashboard = dashboardFixture();
  const before = structuredClone(dashboard);
  const changed = changeChart(createSession(), "quick", {
    title: "Live admissions preview",
  });

  const preview = projectChartEditSessionDashboard(dashboard, changed);

  assert.equal(targetChart(preview).title, "Live admissions preview");
  assert.equal(targetChart(dashboard).title, "Admissions");
  assert.equal(preview.lastUpdated, dashboard.lastUpdated);
  assert.deepEqual(dashboard, before);
  assert.notStrictEqual(targetChart(preview), changed.draft);
  assert.equal(changed.savedChart.title, "Admissions");
});

test("Save uses a narrow intent and promotes only the persisted value to the baseline", () => {
  const changed = changeChart(createSession(), "quick", { title: "Saved admissions" });

  const request = prepareChartEditSessionSave(changed);

  assert.equal(request.session.status, "saving");
  assert.equal(changed.status, "dirty");
  assert.deepEqual(request.intent, {
    kind: "save",
    placementId: "placement-a",
    chart: changed.draft,
    chronoGroupChanges: {
      upsert: [],
      remove: [],
    },
  });
  assert.equal(Object.hasOwn(request.intent, "chronoGroups"), false);
  assert.equal(Object.hasOwn(request.intent, "dashboard"), false);
  request.intent.chart.title = "Mutated outside";
  assert.equal(changed.draft.title, "Saved admissions");

  const saved = reduceChartEditSession(request.session, {
    type: "SAVE_SUCCEEDED",
    chart: changed.draft,
    chronoGroups: changed.chronoGroups,
  });
  assert.equal(saved.status, "clean");
  assert.equal(saved.savedChart.title, "Saved admissions");
  assert.equal(saved.draft.title, "Saved admissions");
  assert.notStrictEqual(saved.savedChart, saved.draft);
  assert.deepEqual(saved.dirtyOrigins, { quick: false, full: false });
  assert.equal(chartEditSessionPendingSurface(saved), null);
});

test("quick Save omits an unchanged Chrono baseline so persistence can rebase on current groups", () => {
  const changed = changeChart(createSession(), "quick", {
    title: "Saved without stale Chrono data",
  });
  const request = prepareChartEditSessionSave(changed);
  const currentGroups = [{
    id: "group-a",
    label: "Concurrent Chrono label",
    chartIds: ["chart-a"],
  }];

  const payload = materializeChartEditSessionSave(
    request.intent,
    currentGroups,
  );

  assert.equal(payload.placementId, "placement-a");
  assert.equal(payload.chart.title, "Saved without stale Chrono data");
  assert.equal(Object.hasOwn(payload, "chronoGroups"), false);
});

test("quick Save rebases committed content into the live layout draft without losing layout order", () => {
  assert.equal(
    typeof chartEditSessionModel.rebaseChartPersistenceIntoLayoutDraft,
    "function",
  );
  const baseline = dashboardFixtureWithLayoutSiblings();
  const layoutDraft = {
    draftId: "layout-dashboard-a",
    kind: "layout",
    targetId: "section-b",
    status: "dirty",
    baseline: structuredClone(baseline),
    value: structuredClone(baseline),
    error: null,
  };
  layoutDraft.value.pages[0].sections.reverse();
  const committed = structuredClone(baseline);
  delete committed.loadedData;
  committed.pages[0].title = "Pending Page title";
  committed.pages[0].sections[0].description = "Pending Section description";
  committed.pages[0].sections[0].panels[0].chart.title = "Durable quick title";
  committed.pages[0].sections[0].panels[1].chart.title = "Concurrent unrelated chart";
  committed.chronoGroups[0].label = "Concurrent Chrono label";
  committed.lastUpdated = "2026-08-29";
  const beforeDraft = structuredClone(layoutDraft);
  const beforeCommitted = structuredClone(committed);

  const rebased = chartEditSessionModel.rebaseChartPersistenceIntoLayoutDraft({
    layoutDraft,
    committedDashboard: committed,
    intent: { kind: "save", placementId: "placement-a" },
  });

  assert.deepEqual(
    rebased.value.pages[0].sections.map(({ id }) => id),
    ["section-b", "section-a"],
  );
  assert.equal(rebased.value.pages[0].title, "Pending Page title");
  assert.equal(
    rebased.value.pages[0].sections.find(({ id }) => id === "section-a").description,
    "Pending Section description",
  );
  assert.equal(chartByPlacement(rebased.value, "placement-a").title, "Durable quick title");
  assert.equal(
    chartByPlacement(rebased.value, "placement-b").title,
    "Concurrent unrelated chart",
  );
  assert.equal(rebased.value.chronoGroups[0].label, "Concurrent Chrono label");
  assert.equal(rebased.value.lastUpdated, "2026-08-29");
  assert.deepEqual(rebased.value.loadedData, baseline.loadedData);
  assert.deepEqual(rebased.baseline, {
    ...committed,
    loadedData: baseline.loadedData,
  });
  assert.equal(rebased.status, "dirty");
  assert.equal(rebased.targetId, "section-b");
  assert.deepEqual(layoutDraft, beforeDraft);
  assert.deepEqual(committed, beforeCommitted);
});

test("quick Save accepts section IDs repeated on different pages", () => {
  const baseline = dashboardFixtureWithRepeatedPageSectionIds();
  const layoutDraft = {
    draftId: "layout-dashboard-a",
    kind: "layout",
    targetId: "page-b",
    status: "dirty",
    baseline: structuredClone(baseline),
    value: structuredClone(baseline),
    error: null,
  };
  layoutDraft.value.pages.reverse();
  const committed = structuredClone(baseline);
  chartByPlacement(committed, "placement-a").title = "Durable quick title";
  chartByPlacement(committed, "placement-c").title = "Concurrent second Page chart";

  const rebased = chartEditSessionModel.rebaseChartPersistenceIntoLayoutDraft({
    layoutDraft,
    committedDashboard: committed,
    intent: { kind: "save", placementId: "placement-a" },
  });

  assert.deepEqual(rebased.value.pages.map(({ id }) => id), ["page-b", "page-a"]);
  assert.deepEqual(
    rebased.value.pages.map(({ sections }) => sections[0].id),
    ["main", "main"],
  );
  assert.equal(chartByPlacement(rebased.value, "placement-a").title, "Durable quick title");
  assert.equal(
    chartByPlacement(rebased.value, "placement-c").title,
    "Concurrent second Page chart",
  );
});

test("chart persistence rebases layout-owned reference removals with unrelated committed members", () => {
  const baseline = dashboardFixtureWithLayoutSiblings();
  baseline.chronoGroups = [{
    id: "group-a",
    label: "Admissions timeline",
    members: [
      { chartId: "chart-a", matchingPolicy: "snap_to_latest" },
      { chartId: "chart-b", matchingPolicy: "snap_to_latest" },
    ],
  }];
  baseline.scenes = [{
    id: "scene-a",
    name: "Admissions reveal",
    members: [
      { chartId: "chart-a", width: 1 },
      { chartId: "chart-b", width: 1 },
    ],
    chartIds: ["chart-a", "chart-b"],
    present: { chartIds: ["chart-a", "chart-b"] },
  }];
  const layoutDraft = {
    draftId: "layout-dashboard-a",
    kind: "layout",
    targetId: "placement-a",
    status: "dirty",
    baseline: structuredClone(baseline),
    value: structuredClone(baseline),
    error: null,
  };
  layoutDraft.value.pages[0].sections[0].panels = layoutDraft.value.pages[0]
    .sections[0].panels.filter(({ id }) => id !== "placement-a");
  layoutDraft.value.chronoGroups[0].members = layoutDraft.value.chronoGroups[0]
    .members.filter(({ chartId }) => chartId !== "chart-a");
  layoutDraft.value.scenes[0].members = layoutDraft.value.scenes[0]
    .members.filter(({ chartId }) => chartId !== "chart-a");
  layoutDraft.value.scenes[0].chartIds = ["chart-b"];
  layoutDraft.value.scenes[0].present.chartIds = ["chart-b"];

  const committed = structuredClone(baseline);
  committed.pages[0].sections[0].panels[1].chart.title = "Durable quick title";
  committed.chronoGroups[0].members[1].matchingPolicy = "exact";
  committed.chronoGroups[0].members.push({
    chartId: "chart-c",
    matchingPolicy: "snap_to_latest",
  });
  committed.scenes[0].members[1].width = 2;
  committed.scenes[0].members.push({ chartId: "chart-c", width: 1 });
  committed.scenes[0].chartIds.push("chart-c");
  committed.scenes[0].present.chartIds.push("chart-c");

  const rebased = chartEditSessionModel.rebaseChartPersistenceIntoLayoutDraft({
    layoutDraft,
    committedDashboard: committed,
    intent: { kind: "save", placementId: "placement-b" },
  });

  assert.deepEqual(rebased.value.chronoGroups[0].members, [
    { chartId: "chart-b", matchingPolicy: "exact" },
    { chartId: "chart-c", matchingPolicy: "snap_to_latest" },
  ]);
  assert.deepEqual(rebased.value.scenes[0].members, [
    { chartId: "chart-b", width: 2 },
    { chartId: "chart-c", width: 1 },
  ]);
  assert.deepEqual(rebased.value.scenes[0].chartIds, ["chart-b", "chart-c"]);
  assert.deepEqual(rebased.value.scenes[0].present.chartIds, ["chart-b", "chart-c"]);
  assert.equal(chartByPlacement(rebased.value, "placement-a"), undefined);
  assert.equal(chartByPlacement(rebased.value, "placement-b").title, "Durable quick title");
});

test("confirmed quick Remove rebases the exact deletion onto the reordered live layout draft", () => {
  assert.equal(
    typeof chartEditSessionModel.rebaseChartPersistenceIntoLayoutDraft,
    "function",
  );
  const baseline = dashboardFixtureWithLayoutSiblings();
  baseline.chronoGroups = [{
    id: "group-a",
    label: "Admissions timeline",
    members: [
      { chartId: "chart-a", matchingPolicy: "snap_to_latest" },
      { chartId: "chart-b", matchingPolicy: "snap_to_latest" },
    ],
  }];
  const layoutDraft = {
    draftId: "layout-dashboard-a",
    kind: "layout",
    targetId: "placement-b",
    status: "dirty",
    baseline: structuredClone(baseline),
    value: structuredClone(baseline),
    error: null,
  };
  layoutDraft.value.pages[0].sections[0].panels.reverse();
  const committed = structuredClone(baseline);
  committed.pages[0].title = "Pending title before Remove";
  committed.pages[0].sections[0].panels = committed.pages[0].sections[0].panels
    .filter(({ id }) => id !== "placement-a");
  committed.pages[0].sections[0].panels[0].chart.title = "Concurrent survivor";
  committed.chronoGroups[0].members = committed.chronoGroups[0].members
    .filter(({ chartId }) => chartId !== "chart-a");
  committed.lastUpdated = "2026-08-29";

  const rebased = chartEditSessionModel.rebaseChartPersistenceIntoLayoutDraft({
    layoutDraft,
    committedDashboard: committed,
    intent: { kind: "remove", placementId: "placement-a" },
  });

  assert.deepEqual(
    rebased.value.pages[0].sections[0].panels.map(({ id }) => id),
    ["placement-b"],
  );
  assert.equal(rebased.value.pages[0].title, "Pending title before Remove");
  assert.equal(chartByPlacement(rebased.value, "placement-b").title, "Concurrent survivor");
  assert.deepEqual(rebased.value.chronoGroups[0].members, [{
    chartId: "chart-b",
    matchingPolicy: "snap_to_latest",
  }]);
  assert.deepEqual(rebased.baseline, committed);
  assert.equal(rebased.status, "dirty");
});

test("confirmed quick Remove accepts section IDs repeated on different pages", () => {
  const baseline = dashboardFixtureWithRepeatedPageSectionIds();
  const layoutDraft = {
    draftId: "layout-dashboard-a",
    kind: "layout",
    targetId: "page-b",
    status: "dirty",
    baseline: structuredClone(baseline),
    value: structuredClone(baseline),
    error: null,
  };
  layoutDraft.value.pages.reverse();
  const committed = structuredClone(baseline);
  committed.pages[0].sections[0].panels = committed.pages[0].sections[0].panels
    .filter(({ id }) => id !== "placement-a");
  chartByPlacement(committed, "placement-c").title = "Concurrent second Page chart";

  const rebased = chartEditSessionModel.rebaseChartPersistenceIntoLayoutDraft({
    layoutDraft,
    committedDashboard: committed,
    intent: { kind: "remove", placementId: "placement-a" },
  });

  assert.deepEqual(rebased.value.pages.map(({ id }) => id), ["page-b", "page-a"]);
  assert.deepEqual(
    rebased.value.pages.map(({ sections }) => sections[0].id),
    ["main", "main"],
  );
  assert.equal(chartByPlacement(rebased.value, "placement-a"), undefined);
  assert.equal(chartByPlacement(rebased.value, "placement-b").title, "Other chart");
  assert.equal(
    chartByPlacement(rebased.value, "placement-c").title,
    "Concurrent second Page chart",
  );
});

test("Reset restores the shared saved chart and Chrono baseline", () => {
  const initial = createSession();
  const changed = reduceChartEditSession(initial, {
    type: "CHANGE",
    surface: "quick",
    draft: { ...initial.draft, title: "Unsaved title" },
    chronoGroups: [{ ...initial.chronoGroups[0], label: "Unsaved group" }],
  });

  const reset = reduceChartEditSession(changed, { type: "RESET" });

  assert.equal(reset.status, "clean");
  assert.deepEqual(reset.draft, reset.savedChart);
  assert.deepEqual(reset.chronoGroups, reset.savedChronoGroups);
  assert.notStrictEqual(reset.draft, reset.savedChart);
  assert.notStrictEqual(reset.chronoGroups, reset.savedChronoGroups);
  assert.deepEqual(reset.dirtyOrigins, { quick: false, full: false });
  assert.equal(chartEditSessionPendingSurface(reset), null);
});

test("confirmed Remove immediately yields only the placement deletion intent", () => {
  const changed = changeChart(createSession(), "quick", {
    title: "Unsaved title that must not be saved first",
  });

  const request = prepareConfirmedChartEditRemoval(changed);

  assert.equal(request.session.status, "saving");
  assert.deepEqual(request.intent, {
    kind: "remove",
    placementId: "placement-a",
  });
  assert.equal(Object.hasOwn(request.intent, "chart"), false);
  assert.equal(Object.hasOwn(request.intent, "dashboard"), false);
  assert.equal(changed.status, "dirty");
  assert.equal(changed.draft.title, "Unsaved title that must not be saved first");
});

test("clean and dirty Remove retain one operation-scoped owner for exact retry", () => {
  for (const seed of [
    createSession(),
    changeChart(createSession(), "quick", { title: "Unsaved title to remove" }),
  ]) {
    const request = prepareConfirmedChartEditRemoval(seed);
    assert.deepEqual(request.session.pendingOperation, {
      kind: "remove",
      intent: request.intent,
    });
    assert.deepEqual(projectChartEditSessionOwner(request.session), {
      id: "chart-edit:placement-a",
      kind: "chart-edit",
      scopeId: "placement-a",
      targetId: "placement-a",
      label: "Chart changes",
      status: "saving",
      activity: "active",
      surface: "quick",
      restoration: request.session.restoration,
      activation: "focus",
      operation: "remove",
    });

    const failed = reduceChartEditSession(request.session, {
      type: "PERSISTENCE_FAILED",
      error: new Error("remove unavailable"),
    });
    const failedOwner = projectChartEditSessionOwner(failed);
    assert.equal(failedOwner.status, "error");
    assert.equal(failedOwner.operation, "remove");
    const suspended = dismissChartEditSession(failed, {
      surface: "quick",
      restoration: { focusId: "chart-field-title", scrollTop: 140 },
    });
    assert.equal(projectChartEditSessionOwner(suspended).activity, "suspended");
    assert.equal(projectChartEditSessionOwner(suspended).operation, "remove");
    assert.equal(
      typeof chartEditSessionModel.prepareChartEditSessionRetry,
      "function",
    );

    const retry = chartEditSessionModel.prepareChartEditSessionRetry(failed);
    assert.equal(retry.session.status, "saving");
    assert.equal(retry.session.error, null);
    assert.deepEqual(retry.intent, request.intent);
    assert.equal(projectChartEditSessionOwner(retry.session).operation, "remove");
  }
});

test("parent quick removal ownership excludes other placements and surfaces", () => {
  assert.equal(
    typeof chartEditSessionModel.prepareActiveQuickChartEditRemoval,
    "function",
  );
  const quick = createSession();
  const full = reduceChartEditSession(quick, {
    type: "OPEN",
    surface: "full",
  });

  const request = chartEditSessionModel.prepareActiveQuickChartEditRemoval(
    quick,
    "placement-a",
  );

  assert.equal(request.session.status, "saving");
  assert.deepEqual(request.intent, {
    kind: "remove",
    placementId: "placement-a",
  });
  assert.equal(
    chartEditSessionModel.prepareActiveQuickChartEditRemoval(quick, "placement-b"),
    null,
  );
  assert.equal(
    chartEditSessionModel.prepareActiveQuickChartEditRemoval(full, "placement-a"),
    null,
  );
});

test("opening the full editor continues the same quick draft and baseline", () => {
  const quick = changeChart(createSession(), "quick", { title: "Quick title" });

  const full = reduceChartEditSession(quick, {
    type: "OPEN",
    surface: "full",
    restoration: {
      surface: "full",
      focusId: "chart-draft-data-source",
      scrollTop: 0,
    },
  });

  assert.equal(full.activeSurface, "full");
  assert.equal(full.draft.title, "Quick title");
  assert.equal(full.savedChart.title, "Admissions");
  assert.deepEqual(full.dirtyOrigins, { quick: true, full: false });
  assert.equal(full.status, "dirty");
});

test("full dirty edits take precedence over stale quick events and resume in full", () => {
  const quick = changeChart(createSession(), "quick", { title: "Quick title" });
  const openedFull = reduceChartEditSession(quick, { type: "OPEN", surface: "full" });
  const full = changeChart(openedFull, "full", { title: "Full title" });

  const staleQuickChange = changeChart(full, "quick", { title: "Stale quick title" });
  const staleQuickDismissal = reduceChartEditSession(staleQuickChange, {
    type: "SUSPEND",
    surface: "quick",
    restoration: { surface: "quick", focusId: "quick-title", scrollTop: 12 },
  });

  assert.strictEqual(staleQuickChange, full);
  assert.strictEqual(staleQuickDismissal, full);
  assert.equal(full.draft.title, "Full title");
  assert.deepEqual(full.dirtyOrigins, { quick: true, full: true });
  assert.equal(chartEditSessionPendingSurface(full), "full");

  const suspended = reduceChartEditSession(full, {
    type: "SUSPEND",
    surface: "full",
    restoration: { surface: "full", focusId: "full-title", scrollTop: 480 },
  });
  const resumed = reduceChartEditSession(suspended, { type: "RESUME" });
  assert.equal(resumed.activeSurface, "full");
  assert.equal(resumed.restoration.surface, "full");
  assert.equal(resumed.draft.title, "Full title");
});

test("persistence failure retains the shared dirty draft and permits retry", () => {
  const changed = changeChart(createSession(), "quick", { title: "Retry title" });
  const request = prepareChartEditSessionSave(changed);

  const failed = reduceChartEditSession(request.session, {
    type: "PERSISTENCE_FAILED",
    error: {
      code: "STORAGE_UNAVAILABLE",
      message: "Browser storage is unavailable.",
      retryable: true,
    },
  });

  assert.equal(failed.status, "error");
  assert.deepEqual(failed.error, {
    code: "STORAGE_UNAVAILABLE",
    message: "Browser storage is unavailable.",
    retryable: true,
  });
  assert.equal(failed.savedChart.title, "Admissions");
  assert.equal(failed.draft.title, "Retry title");
  assert.deepEqual(failed.dirtyOrigins, { quick: true, full: false });
  assert.equal(chartEditSessionPendingSurface(failed), "quick");

  const retry = prepareChartEditSessionSave(failed);
  assert.equal(retry.session.status, "saving");
  assert.equal(retry.intent.chart.title, "Retry title");
});

test("Full Save keeps its runtime artifact outside the chart and retains it for retry", () => {
  const opened = reduceChartEditSession(createSession(), { type: "OPEN", surface: "full" });
  const changed = changeChart(opened, "full", { title: "Full retry title" });
  const runtimeArtifact = { id: "runtime-full-retry", preparedRevision: "prepared-a" };
  const request = prepareChartEditSessionSave(changed, { runtimeArtifact });
  const firstPayload = materializeChartEditSessionSave(request.intent, changed.chronoGroups);

  assert.equal(Object.hasOwn(firstPayload.chart, "runtimeArtifact"), false);
  assert.deepEqual(firstPayload.runtimeArtifact, runtimeArtifact);

  const failed = reduceChartEditSession(request.session, {
    type: "PERSISTENCE_FAILED",
    error: { message: "Retry the Full Save.", retryable: true },
  });
  const retry = prepareChartEditSessionSave(failed);
  const retryPayload = materializeChartEditSessionSave(retry.intent, changed.chronoGroups);

  assert.deepEqual(retryPayload.runtimeArtifact, runtimeArtifact);
  assert.equal(retryPayload.chart.title, "Full retry title");
});

test("preview starts from the latest dashboard and preserves unrelated changes", () => {
  const openedDashboard = dashboardFixture();
  const changed = changeChart(createSession(), "quick", { title: "Edited target" });
  const latestDashboard = structuredClone(openedDashboard);
  latestDashboard.title = "Concurrent dashboard rename";
  latestDashboard.lastUpdated = "2026-08-28";
  latestDashboard.globalStyles.dashboardStyle = "humanist-standard";
  latestDashboard.pages[0].sections[0].panels[1].chart.title = "Concurrent other chart";
  latestDashboard.chronoGroups.push({
    id: "group-b",
    label: "Concurrent Chrono Group",
    chartIds: ["chart-b"],
  });
  const latestBefore = structuredClone(latestDashboard);

  const preview = projectChartEditSessionDashboard(latestDashboard, changed);

  assert.equal(targetChart(preview).title, "Edited target");
  assert.equal(preview.title, "Concurrent dashboard rename");
  assert.equal(preview.lastUpdated, "2026-08-28");
  assert.equal(preview.globalStyles.dashboardStyle, "humanist-standard");
  assert.equal(
    preview.pages[0].sections[0].panels[1].chart.title,
    "Concurrent other chart",
  );
  assert.deepEqual(preview.chronoGroups.map(({ id, label }) => ({ id, label })), [
    { id: "group-a", label: "Admissions timeline" },
    { id: "group-b", label: "Concurrent Chrono Group" },
  ]);
  assert.deepEqual(latestDashboard, latestBefore);
});

test("Chrono edits patch only changed groups onto the latest dashboard", () => {
  const savedGroups = [
    ...chronoGroupFixture(),
    { id: "group-b", label: "Saved B", chartIds: ["chart-b"] },
  ];
  const opened = createChartEditSession({
    placementId: "placement-a",
    chart: chartFixture(),
    chronoGroups: savedGroups,
    activeSurface: "full",
  });
  const changed = reduceChartEditSession(opened, {
    type: "CHANGE",
    surface: "full",
    chronoGroups: [
      { ...savedGroups[0], label: "Edited A" },
      savedGroups[1],
    ],
  });
  const latestDashboard = dashboardFixture();
  latestDashboard.chronoGroups = [
    savedGroups[0],
    { ...savedGroups[1], label: "Concurrent B" },
    { id: "group-c", label: "Concurrent C", chartIds: [] },
  ];

  const request = prepareChartEditSessionSave(changed);
  const preview = projectChartEditSessionDashboard(latestDashboard, changed);
  const persistencePayload = materializeChartEditSessionSave(
    request.intent,
    latestDashboard.chronoGroups,
  );

  assert.deepEqual(request.intent.chronoGroupChanges, {
    upsert: [{ ...savedGroups[0], label: "Edited A" }],
    remove: [],
  });
  assert.deepEqual(preview.chronoGroups.map(({ id, label }) => ({ id, label })), [
    { id: "group-a", label: "Edited A" },
    { id: "group-b", label: "Concurrent B" },
    { id: "group-c", label: "Concurrent C" },
  ]);
  assert.deepEqual(
    persistencePayload.chronoGroups.map(({ id, label }) => ({ id, label })),
    [
      { id: "group-a", label: "Edited A" },
      { id: "group-b", label: "Concurrent B" },
      { id: "group-c", label: "Concurrent C" },
    ],
  );
  assert.equal(persistencePayload.chart.title, "Admissions");
  assert.equal(Object.hasOwn(persistencePayload, "chronoGroupChanges"), false);
});

function createSession() {
  return createChartEditSession({
    placementId: "placement-a",
    chart: chartFixture(),
    chronoGroups: chronoGroupFixture(),
    activeSurface: "quick",
    restoration: {
      surface: "quick",
      focusId: "edit-placement-a",
      scrollTop: 180,
    },
  });
}

function changeChart(session, surface, updates) {
  return reduceChartEditSession(session, {
    type: "CHANGE",
    surface,
    draft: { ...session.draft, ...updates },
  });
}

function chartFixture({ id = "chart-a", title = "Admissions" } = {}) {
  return {
    configVersion: 3,
    id,
    typeId: "line",
    sourceId: "source-a",
    title,
    roles: {
      category: "week",
      measurements: ["value"],
    },
    presentation: {
      background: "#ffffff",
    },
    footprint: { columns: 2, rows: 1 },
  };
}

function chronoGroupFixture() {
  return [{
    id: "group-a",
    label: "Admissions timeline",
    chartIds: ["chart-a"],
  }];
}

function dashboardFixture() {
  return {
    configVersion: 6,
    id: "dashboard-a",
    title: "Dashboard",
    lastUpdated: "2026-08-01",
    globalStyles: { dashboardStyle: "evidence-ledger" },
    chronoGroups: chronoGroupFixture(),
    pages: [{
      id: "page-a",
      sections: [{
        id: "section-a",
        panels: [
          {
            id: "placement-a",
            layout: { size: "standard" },
            chart: chartFixture(),
          },
          {
            id: "placement-b",
            layout: { size: "compact" },
            chart: chartFixture({ id: "chart-b", title: "Other chart" }),
          },
        ],
      }],
    }],
    loadedData: {
      "source-a": [{ week: "2026-W01", value: 4 }],
    },
  };
}

function dashboardFixtureWithLayoutSiblings() {
  const dashboard = dashboardFixture();
  dashboard.pages[0] = {
    ...dashboard.pages[0],
    label: "Operations",
    title: "Baseline Page title",
    description: "Baseline Page description",
    sections: [
      {
        ...dashboard.pages[0].sections[0],
        title: "Section A",
        description: "Baseline Section description",
      },
      {
        id: "section-b",
        title: "Section B",
        description: "Second Section description",
        panels: [{
          id: "placement-c",
          layout: { size: "compact" },
          chart: chartFixture({ id: "chart-c", title: "Third chart" }),
        }],
      },
    ],
  };
  return dashboard;
}

function dashboardFixtureWithRepeatedPageSectionIds() {
  const dashboard = dashboardFixture();
  dashboard.pages[0].sections[0].id = "main";
  dashboard.pages.push({
    id: "page-b",
    sections: [{
      id: "main",
      panels: [{
        id: "placement-c",
        layout: { size: "compact" },
        chart: chartFixture({ id: "chart-c", title: "Second Page chart" }),
      }],
    }],
  });
  return dashboard;
}

function chartByPlacement(dashboard, placementId) {
  const placement = dashboard.pages
    .flatMap(({ sections = [] }) => sections)
    .flatMap(({ panels = [] }) => panels)
    .find(({ id }) => id === placementId);
  return placement?.chart ?? placement;
}

function targetChart(dashboard) {
  return dashboard.pages[0].sections[0].panels[0].chart;
}
