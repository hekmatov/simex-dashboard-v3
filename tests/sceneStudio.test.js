import assert from "node:assert/strict";
import test, { after } from "node:test";
import { register } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const { default: SceneLibrary } = await import("../src/components/time/SceneLibrary.jsx");
const { default: SceneContent } = await import("../src/components/time/SceneContent.jsx");
const { createSceneDraft, reduceSceneDraft } = await import("../src/components/time/sceneDraft.js");
const vite = await createServer({
  root: process.cwd(),
  configFile: false,
  plugins: [reactPlugin()],
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
after(() => vite.close());
const { default: SceneEditor } = await vite.ssrLoadModule("/src/components/time/SceneEditor.jsx");

const scene = { id: "scene-a", name: "Admission reveal", status: "ready", chronoGroupName: "Municipal outbreak playback", members: [{ chartId: "chart-a" }] };

test("Scene Studio owns Create Scene and groups read-first cards by page", () => {
  const html = renderToStaticMarkup(React.createElement(SceneLibrary, { state: { query: "", statusFilter: "all" }, sections: [{ pageId: "biomedical", pageLabel: "Biomedical", scenes: [scene] }] }));
  assert.match(html, />Create Scene</);
  assert.doesNotMatch(html, />Create Chrono Group</);
  assert.match(html, /Biomedical/);
  assert.match(html, /data-action="open-content"/);
});

test("Scene Studio reports filtered saved Scenes as filtered, not missing", () => {
  const html = renderToStaticMarkup(React.createElement(SceneLibrary, {
    state: {
      query: "",
      statusFilter: "all",
      pageId: "home",
      pages: [{ id: "home", label: "Home" }, { id: "biomedical", label: "Biomedical" }],
      scenes: [scene],
    },
    sections: [],
  }));

  assert.match(html, /Showing 0 of 1/);
  assert.match(html, /No Scenes match the current filters\./);
  assert.doesNotMatch(html, /No Scenes have been created yet\./);
});

test("Scene content is read-first and Edit is its only creation-adjacent action", () => {
  const html = renderToStaticMarkup(React.createElement(SceneContent, { content: { ...scene, memberCharts: [{ chartId: "chart-a", chart: { title: "Admissions" }, pageLabel: "Biomedical" }] } }));
  assert.match(html, />Edit</);
  assert.doesNotMatch(html, />Create Scene</);
  assert.match(html, /Admissions/);
});

test("a Needs attention Scene card opens repair at Frame source", () => {
  const html = renderToStaticMarkup(React.createElement(SceneLibrary, {
    state: { query: "", statusFilter: "all" },
    sections: [{ pageId: "biomedical", pageLabel: "Biomedical", scenes: [{ ...scene, status: "needs-attention" }] }],
  }));
  assert.match(html, /data-scene-workflow-id="repair-frame-source"/);
});

test("Needs attention exposes a Frame source repair action and saving a replacement clears the unresolved union", () => {
  const actions = [];
  const contentHtml = renderToStaticMarkup(React.createElement(SceneContent, {
    content: { ...scene, status: "needs-attention", statusReasons: ["Frame source moved"] },
    onAction: (action) => actions.push(action),
  }));
  assert.match(contentHtml, /data-scene-workflow-id="repair-frame-source"/);

  const value = {
    id: "scene-a", name: "Admission reveal", pageId: "biomedical", chronoGroupId: "chrono-a",
    period: { start: "2027-05-01T00:00:00.000Z", end: "2027-05-03T00:00:00.000Z" },
    frames: { mode: "unresolved", reason: "source-chart-moved", previousChartId: "chart-old" },
    members: [{ chartId: "chart-a", width: 1 }],
    present: { chartIds: ["chart-a"], layout: "single" },
    audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } },
  };
  const context = {
    chronoGroups: [{ id: "chrono-a", name: "Chrono", period: value.period, chartIds: ["chart-a"] }],
    pages: [{ id: "biomedical", label: "Biomedical" }],
    charts: [{ id: "chart-a", pageId: "biomedical", title: "Admissions" }],
  };
  let draft = createSceneDraft(value, context);
  draft = reduceSceneDraft(draft, { type: "SET_FRAME_SOURCE", chartId: "chart-a" });
  assert.deepEqual(draft.value.frames, { mode: "source", chartId: "chart-a", selection: "all" });
  assert.equal(reduceSceneDraft(draft, { type: "SAVE_REQUEST" }).status, "saving");

});

test("an unresolved Scene opens the Frame source repair without exposing Calendar interval controls", () => {
  const value = {
    id: "scene-a", name: "Admission reveal", pageId: "biomedical", chronoGroupId: "chrono-a",
    period: { startEpochMs: Date.UTC(2027, 4, 1), endEpochMs: Date.UTC(2027, 4, 3) },
    frames: { mode: "unresolved", reason: "source-chart-moved", previousChartId: "chart-old" },
    members: [{ chartId: "chart-a", width: 1 }],
    present: { chartIds: ["chart-a"], layout: "single" },
    audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } },
  };
  const html = renderToStaticMarkup(React.createElement(SceneEditor, {
    draft: { value, stage: "details", status: "dirty" },
    chronoGroups: [{ id: "chrono-a", name: "Chrono", period: value.period, chartIds: ["chart-a"] }],
    pages: [{ id: "biomedical", label: "Biomedical" }],
    charts: [{ id: "chart-a", pageId: "biomedical", title: "Admissions" }],
  }));
  assert.match(html, /id="scene-frame-source"/);
  assert.match(html, /Choose replacement/);
  assert.doesNotMatch(html, /Calendar interval value/);
});
