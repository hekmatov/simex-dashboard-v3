import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

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
