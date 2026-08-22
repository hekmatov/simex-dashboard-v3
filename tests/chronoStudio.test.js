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

const { default: ChronoStudio } = await import("../src/components/time/ChronoStudio.jsx");
const { default: ChronoGroupContent } = await import("../src/components/time/ChronoGroupContent.jsx");

const card = { id: "chrono-a", name: "Municipal outbreak playback", status: "ready", chartIds: ["chart-a"], sceneCount: 1 };
const content = { ...card, period: { start: "2027-05-01", end: "2027-05-03" }, secondsPerFrame: 2, pageSections: [{ pageId: "biomedical", pageLabel: "Biomedical", charts: [{ id: "chart-a", title: "Admissions" }], sceneIds: ["scene-a"] }] };

test("Chrono Studio owns only Create Chrono Group and presents read-first cards", () => {
  const html = renderToStaticMarkup(React.createElement(ChronoStudio, { state: { query: "", statusFilter: "all" }, cards: [card] }));
  assert.match(html, />Create Chrono Group</);
  assert.doesNotMatch(html, />Create Scene</);
  assert.match(html, /Municipal outbreak playback/);
  assert.match(html, /data-action="open-content"/);
  assert.doesNotMatch(html, /data-action="edit"/);
});

test("Chrono Group content is read-first and offers Edit plus Create Scene", () => {
  const html = renderToStaticMarkup(React.createElement(ChronoGroupContent, { content }));
  assert.match(html, />Edit</);
  assert.match(html, />Create Scene</);
  assert.match(html, /2027-05-01 – 2027-05-03 · 2s per frame/);
  assert.match(html, /Biomedical/);
  assert.match(html, /Admissions/);
});
