import assert from "node:assert/strict";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";

import { profileDataset } from "../src/charting/data/profileDataset.js";

const vite = await createServer({
  root: process.cwd(),
  configFile: false,
  plugins: [reactPlugin()],
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
after(() => vite.close());

const [
  { default: ChronoGroupEditor },
  { default: SceneEditor },
  { default: ChronoStudio },
  { default: SceneLibrary },
  { default: ChronoGroupContent },
  { default: SceneContent },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/time/ChronoGroupEditor.jsx"),
  vite.ssrLoadModule("/src/components/time/SceneEditor.jsx"),
  vite.ssrLoadModule("/src/components/time/ChronoStudio.jsx"),
  vite.ssrLoadModule("/src/components/time/SceneLibrary.jsx"),
  vite.ssrLoadModule("/src/components/time/ChronoGroupContent.jsx"),
  vite.ssrLoadModule("/src/components/time/SceneContent.jsx"),
]);

const period = { startEpochMs: Date.UTC(2027, 4, 1), endEpochMs: Date.UTC(2027, 4, 3) };
const chart = {
  id: "chart-a",
  label: "Admissions",
  title: "Admissions",
  pageId: "biomedical",
  pageLabel: "Biomedical",
  sectionLabel: "Signals",
  otherGroupNames: ["Operations review"],
  variables: [{ id: "count", label: "Count", observations: [{ epochMs: period.startEpochMs, value: 2 }] }],
};

test("Sketch 005 composition renders disclosure records and complete review evidence", async (t) => {
  const { createChronoGroupDraft } = await vite.ssrLoadModule("/src/components/time/chronoGroupDraft.js");
  const base = createChronoGroupDraft({
    group: { id: "chrono-a", name: "Outbreak", period, chartIds: ["chart-a"], defaultMatching: "Concurrent only", secondsPerFrame: 2 },
    charts: [chart],
  });

  await t.test("availability records disclose aligned evidence and other membership", () => {
    const html = renderToStaticMarkup(React.createElement(ChronoGroupEditor, { draft: { ...base, stage: "charts" } }));
    assert.match(html, /<details/);
    assert.match(html, /Other Chrono Groups/);
    assert.match(html, /Operations review/);
    assert.match(html, /availability-calendar/);
  });

  await t.test("review names pages, derived frames, members, and gaps without false repair routes", () => {
    const html = renderToStaticMarkup(React.createElement(ChronoGroupEditor, { draft: { ...base, stage: "review" } }));
    for (const fact of ["affected pages", "derived Default Chrono frames", "Member evidence", "Availability gaps"]) {
      assert.match(html, new RegExp(fact, "i"));
    }
    assert.doesNotMatch(html, /Repair chart selection/i);
  });
});

function sceneDraft(stage) {
  return {
    stage,
    status: "dirty",
    selectedChartId: "chart-a",
    activeBoard: "scene",
    value: {
      id: "scene-a",
      name: "Morning reveal",
      chronoGroupId: "chrono-a",
      pageId: "biomedical",
      period,
      frames: { mode: "source", chartId: "chart-a", selection: "all" },
      members: [{ chartId: "chart-a", width: 2 }],
      present: { chartIds: ["chart-a"], layout: "single" },
      audience: { datePosition: { xPermille: 900, yPermille: 100, widthPermille: 200 } },
    },
  };
}

const sceneProps = {
  charts: [chart],
  chronoGroups: [{ id: "chrono-a", name: "Outbreak", chartIds: ["chart-a"], period }],
  pages: [{ id: "biomedical", label: "Biomedical" }],
};

test("Sketch 006 amendment exposes three stages and gives each active task the full editor width", () => {
  const detailsHtml = renderToStaticMarkup(React.createElement(SceneEditor, { ...sceneProps, draft: sceneDraft("details") }));
  for (const stage of ["Scene details", "Select charts and frames", "Arrange and configure"]) {
    assert.match(detailsHtml, new RegExp(stage));
  }
  assert.match(detailsHtml, /data-layout="full-width"/);
  assert.match(detailsHtml, /scene-details-stage/);
  assert.doesNotMatch(detailsHtml, /scene-draft-panel/);
  for (const field of ["Scene name", "Owning page", "Parent Chrono Group", "Period", "Time mode", "Default matching", "Seconds per frame"]) {
    assert.match(detailsHtml, new RegExp(field));
  }
  assert.match(detailsHtml, /Start date/);
  assert.match(detailsHtml, /End date/);

  for (const stage of ["select", "arrange"]) {
    const html = renderToStaticMarkup(React.createElement(SceneEditor, { ...sceneProps, draft: sceneDraft(stage) }));
    assert.match(html, /data-layout="full-width"/);
    assert.doesNotMatch(html, /scene-draft-panel/);
    assert.doesNotMatch(html, /Scene name<input/);
  }
});

test("Scene save readiness and transactional actions remain available without reserving a sidebar", () => {
  for (const stage of ["details", "select", "arrange"]) {
    const html = renderToStaticMarkup(React.createElement(SceneEditor, { ...sceneProps, draft: sceneDraft(stage) }));
    assert.match(html, /scene-transaction-footer/);
    assert.match(html, /Save readiness/);
    assert.match(html, />Save Scene</);
    assert.match(html, />Discard Scene</);
  }
});

test("Sketch 006 Scene ledger renders variable evidence on the shared period scale", () => {
  const html = renderToStaticMarkup(React.createElement(SceneEditor, { ...sceneProps, draft: sceneDraft("select") }));
  assert.match(html, /Full data/);
  assert.match(html, /scene-availability-calendar/);
  assert.match(html, /Count/);
});

test("Sketch 006 Calendar mode renders positive interval and unit controls", () => {
  const draft = sceneDraft("details");
  draft.value.frames = { mode: "calendar", interval: { value: 2, unit: "month" } };
  const html = renderToStaticMarkup(React.createElement(SceneEditor, { ...sceneProps, draft }));
  assert.match(html, /Calendar interval value/);
  assert.match(html, /Calendar interval unit/);
  assert.match(html, /option value="month" selected/);
});

test("Sketch 006 arrange composition renders twin canvases and chart-local Unit Orbit anchors", () => {
  const html = renderToStaticMarkup(React.createElement(SceneEditor, {
    ...sceneProps,
    dashboard: runtimeDashboard(),
    draft: sceneDraft("arrange"),
  }));
  assert.match(html, />Scene View</);
  assert.match(html, />Present</);
  assert.match(html, /data-scene-composition-surface="scene-preview"/);
  assert.match(html, /data-layout-system="presentation"/);
  assert.equal((html.match(/class="chart-view-frame"/g) ?? []).length, 2);
  assert.match(html, /Scene preview frame/);
  assert.match(html, /2027-05-01/);
  assert.match(html, /Drop here/);
  assert.match(html, /data-build-placement-id="scene-orbit-scene-chart-a"/);
  assert.match(html, /data-build-placement-id="scene-orbit-present-chart-a"/);
  assert.match(html, /Remove from Present/);
  assert.doesNotMatch(html, /<li[^>]*data-chart-id=/);
  assert.doesNotMatch(html, />Included<\/span>/);
});

function runtimeDashboard() {
  const rows = [{ observed: "2027-05-01", count: 2 }];
  const sourceChart = {
    id: "chart-a",
    typeId: "line",
    title: "Admissions",
    sourceId: "admissions",
    roles: {
      measurements: { field: "count" },
      observation: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    layout: { width: 2, height: 1 },
    presentation: { collection: null, labels: null, accessibility: null },
    interaction: { zoom: { enabled: false }, timeSync: null },
  };
  return {
    timezone: "UTC",
    dataSources: {},
    globalStyles: { accessibility: { enabled: false } },
    chronoGroups: [{
      id: "chrono-a",
      name: "Outbreak",
      period: { start: "2027-05-01", end: "2027-05-03" },
      secondsPerFrame: 1,
      matching: { policy: "exact" },
      members: [{ chartId: "chart-a", timeRole: "observation" }],
    }],
    loadedData: { admissions: rows },
    datasetProfiles: {
      admissions: profileDataset(rows, {
        observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
      }),
    },
    pages: [{
      id: "biomedical",
      label: "Biomedical",
      sections: [{
        id: "signals",
        title: "Signals",
        panels: [{ id: "placement-chart-a", chart: sourceChart }],
      }],
    }],
  };
}

test("Sketch 012 studios expose truthful counts and Search, Status, and Page filters", () => {
  const state = {
    query: "",
    statusFilter: "all",
    pageId: null,
    pages: [{ id: "biomedical", label: "Biomedical" }],
  };
  const chronoHtml = renderToStaticMarkup(React.createElement(ChronoStudio, {
    state,
    cards: [{ id: "chrono-a", name: "Outbreak", chartIds: ["chart-a"], sceneCount: 1, status: "ready", pageIds: ["biomedical"] }],
  }));
  const sceneHtml = renderToStaticMarkup(React.createElement(SceneLibrary, {
    state,
    sections: [{ pageId: "biomedical", pageLabel: "Biomedical", scenes: [{ id: "scene-a", name: "Morning reveal", chronoGroupName: "Outbreak", status: "ready" }] }],
  }));
  for (const html of [chronoHtml, sceneHtml]) {
    for (const label of ["Search", "Status", "Page", "Showing 1 of 1"]) assert.match(html, new RegExp(label));
  }

  const filteredChronoHtml = renderToStaticMarkup(React.createElement(ChronoStudio, {
    state: { ...state, pageId: "biomedical", chronoGroups: [
      { id: "chrono-a", name: "Outbreak" },
      { id: "chrono-b", name: "Recovery" },
    ] },
    cards: [],
  }));
  assert.match(filteredChronoHtml, /No Chrono Groups match the current filters/);
  assert.doesNotMatch(filteredChronoHtml, /No Chrono Groups have been created yet/);
});

test("Sketch 012 read-first content names relationships and exposes lifecycle actions", () => {
  const groupHtml = renderToStaticMarkup(React.createElement(ChronoGroupContent, {
    content: {
      id: "chrono-a",
      name: "Outbreak",
      status: "needs-attention",
      statusReasons: ["Admissions has no observations in the period"],
      period,
      childScenes: [{ id: "scene-a", name: "Morning reveal", pageId: "biomedical" }],
      pageSections: [{ pageId: "biomedical", pageLabel: "Biomedical", charts: [chart], sceneIds: ["scene-a"] }],
    },
  }));
  for (const fact of ["Morning reveal", "Admissions has no observations", "Edit", "Duplicate", "Remove", "Repair", "Create Scene"]) assert.match(groupHtml, new RegExp(fact));

  const sceneHtml = renderToStaticMarkup(React.createElement(SceneContent, {
    content: { id: "scene-a", name: "Morning reveal", status: "ready", chronoGroupName: "Outbreak", memberCharts: [{ chartId: "chart-a", chart, pageLabel: "Biomedical" }] },
  }));
  for (const fact of ["Outbreak", "Admissions", "Edit", "Duplicate", "Remove"]) assert.match(sceneHtml, new RegExp(fact));
});
