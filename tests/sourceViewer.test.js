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

const {
  default: SourceViewer,
  createSourceViewerDismissHandler,
} = await import("../src/components/SourceViewer.jsx");

const csvSource = Object.freeze({
  type: "uploadedCsv",
  csvText: "observed,value\n2027-05-01,12",
  fileName: "surveillance.csv",
  provenance: Object.freeze({
    label: "WHO surveillance",
    provider: "World Health Organization",
    retrievedAt: "2027-05-02T08:30:00.000Z",
  }),
});

test("source viewer presents chart source metadata and reuses the CSV viewer action", () => {
  const html = renderSource({ source: csvSource });

  assert.match(html, /role="dialog"[^>]*aria-modal="true"[^>]*tabindex="-1"/);
  assert.match(html, /WHO surveillance/);
  assert.match(html, /source-surveillance/);
  assert.match(html, /World Health Organization/);
  assert.match(html, /surveillance\.csv/);
  assert.match(html, /2027-05-02T08:30:00\.000Z/);
  assert.match(html, /aria-label="View source CSV"/);
  assert.doesNotMatch(buttonByAriaLabel(html, "View source CSV"), /disabled=""/);
});

test("unavailable sources remain explicit and cannot launch the CSV viewer", () => {
  const html = renderSource({
    source: {
      type: "inline",
      provenance: { label: "Manually entered briefing data" },
    },
  });

  assert.match(html, /Manually entered briefing data/);
  assert.match(html, /This source has no CSV file to display\./);
  assert.match(buttonByAriaLabel(html, "View source CSV"), /disabled=""/);
});

test("loading and recoverable error states are announced without replacing metadata", () => {
  const loading = renderSource({ source: csvSource, status: "loading" });
  const failed = renderSource({
    source: csvSource,
    status: "error",
    error: "The source endpoint timed out.",
  });

  assert.match(loading, /WHO surveillance/);
  assert.match(loading, /role="status"[^>]*>Loading source details…/);
  assert.doesNotMatch(loading, /aria-label="View source CSV"/);
  assert.match(failed, /role="alert"/);
  assert.match(failed, /The source endpoint timed out\./);
  assert.match(failed, />Retry</);
  assert.doesNotMatch(failed, /aria-label="View source CSV"/);
});

test("Escape and Close share one restoration callback and ModalFocusScope returns focus", () => {
  const restoration = deepFreeze({
    canvas: { width: 1120, breakpoint: "wide" },
    selectedChartId: "chart-cases",
    focusId: "chart-cases-source",
    scrollTop: 684,
  });
  const calls = [];
  const dismiss = createSourceViewerDismissHandler({
    restoration,
    onClose: (reason) => calls.push(["close", reason]),
    onRestore: (snapshot) => calls.push(["restore", snapshot]),
  });

  dismiss("escape");
  dismiss("close-button");

  assert.deepEqual(calls, [
    ["close", "escape"],
    ["restore", restoration],
  ]);
  const html = renderSource({ source: csvSource });
  assert.match(html, /data-modal-initial-focus="true"[^>]*>Close</);
  assert.match(html, /aria-label="Close source viewer"/);
});

test("rendering and dismissing never mutate the saved dashboard or restoration snapshot", () => {
  const savedLayout = deepFreeze({
    pages: [{ id: "overview", sections: [{ id: "main", panels: ["chart-cases"] }] }],
  });
  const restoration = deepFreeze({
    selectedChartId: "chart-cases",
    focusId: "chart-cases-source",
    scrollTop: 684,
  });
  const before = JSON.stringify({ savedLayout, restoration });
  let restored;

  renderSource({ source: csvSource, savedLayout, restoration });
  createSourceViewerDismissHandler({
    restoration,
    onRestore: (snapshot) => {
      restored = snapshot;
    },
  })("close-button");

  assert.equal(JSON.stringify({ savedLayout, restoration }), before);
  assert.equal(restored, restoration);
});

function renderSource(overrides = {}) {
  return renderToStaticMarkup(React.createElement(SourceViewer, {
    open: true,
    chartId: "chart-cases",
    sourceId: "source-surveillance",
    source: csvSource,
    status: "ready",
    restoration: {
      selectedChartId: "chart-cases",
      focusId: "chart-cases-source",
      scrollTop: 684,
    },
    onClose() {},
    onRestore() {},
    onRetry() {},
    ...overrides,
  }));
}

function buttonByAriaLabel(html, label) {
  const marker = `aria-label="${label}"`;
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing button ${label}`);
  const start = html.lastIndexOf("<button", markerIndex);
  const end = html.indexOf("</button>", markerIndex);
  assert.ok(start >= 0 && end >= markerIndex, `Malformed button ${label}`);
  return html.slice(start, end + "</button>".length);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}
