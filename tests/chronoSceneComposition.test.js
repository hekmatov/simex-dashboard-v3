import assert from "node:assert/strict";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";

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

test("Sketch 006 composition keeps the Scene Draft panel present in both stages", () => {
  for (const stage of ["select", "arrange"]) {
    const html = renderToStaticMarkup(React.createElement(SceneEditor, { ...sceneProps, draft: sceneDraft(stage) }));
    assert.match(html, /scene-draft-panel/);
    for (const field of ["Scene name", "Owning page", "Parent Chrono Group", "Period", "Time mode", "Default matching", "Seconds per frame", "Save readiness"]) {
      assert.match(html, new RegExp(field));
    }
    assert.match(html, /Start date/);
    assert.match(html, /End date/);
  }
});

test("Sketch 006 Scene ledger renders variable evidence on the shared period scale", () => {
  const html = renderToStaticMarkup(React.createElement(SceneEditor, { ...sceneProps, draft: sceneDraft("select") }));
  assert.match(html, /Full data/);
  assert.match(html, /scene-availability-calendar/);
  assert.match(html, /Count/);
});

test("Sketch 006 Calendar mode renders positive interval and unit controls", () => {
  const draft = sceneDraft("select");
  draft.value.frames = { mode: "calendar", interval: { value: 2, unit: "month" } };
  const html = renderToStaticMarkup(React.createElement(SceneEditor, { ...sceneProps, draft }));
  assert.match(html, /Calendar interval value/);
  assert.match(html, /Calendar interval unit/);
  assert.match(html, /option value="month" selected/);
});

test("Sketch 006 arrange composition renders twin canvases, insertion targets, and Unit Orbit", () => {
  const html = renderToStaticMarkup(React.createElement(SceneEditor, { ...sceneProps, draft: sceneDraft("arrange") }));
  assert.match(html, />Scene View</);
  assert.match(html, />Present</);
  assert.match(html, /Drop here/);
  assert.match(html, /Unit Orbit/);
  assert.match(html, /Move first/);
  assert.match(html, /Move last/);
  assert.match(html, /Include in Present/);
  assert.match(html, /Remove from Present/);
});

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
