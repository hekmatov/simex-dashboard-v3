import assert from "node:assert/strict";
import test from "node:test";

import {
  chartEditSessionPendingSurface,
  createChartEditSession,
  isChartEditSessionDirty,
  materializeChartEditSessionSave,
  prepareChartEditSessionSave,
  prepareConfirmedChartEditRemoval,
  projectChartEditSessionDashboard,
  reduceChartEditSession,
} from "../src/charting/forms/chartEditSession.js";

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

function targetChart(dashboard) {
  return dashboard.pages[0].sections[0].panels[0].chart;
}
