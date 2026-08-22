import assert from "node:assert/strict";
import test from "node:test";

import {
  openSourceViewer,
  SOURCE_VIEWER_READY,
  SOURCE_VIEWER_VERSION,
} from "../src/components/source-data/sourceViewerProtocol.js";

test("source viewer receives the selected dashboard theme with its load message", () => {
  let messageHandler;
  let posted;
  const values = new Map([
    ["--simex-surface-panel", "#25231d"],
    ["--simex-text-strong", "#f5efe4"],
    ["--unrelated", "excluded"],
  ]);
  const appFrame = {
    dataset: {
      dashboardStyle: "evidence-ledger",
      dashboardColorProfile: "evidence-ledger/brighter-vellum",
      chartColorMode: "profile",
      appearancePreference: "dark",
      resolvedAppearance: "dark",
    },
    style: {
      *[Symbol.iterator]() { yield* values.keys(); },
      getPropertyValue(name) { return values.get(name) ?? ""; },
    },
  };
  const viewer = {
    focus() {},
    postMessage(value) { posted = value; },
  };
  const windowTarget = {
    document: { querySelector: () => appFrame },
    location: { origin: "https://simex.test" },
    open: () => viewer,
    addEventListener(type, handler) {
      if (type === "message") messageHandler = handler;
    },
    removeEventListener() {},
  };

  openSourceViewer({
    sourceId: "study",
    source: { type: "uploadedCsv", csvText: "year,value\n2020,1" },
    windowTarget,
  });
  messageHandler({
    origin: windowTarget.location.origin,
    source: viewer,
    data: { type: SOURCE_VIEWER_READY, version: SOURCE_VIEWER_VERSION },
  });

  assert.deepEqual(posted.themeProjection, {
    dashboardStyle: "evidence-ledger",
    dashboardColorProfile: "evidence-ledger/brighter-vellum",
    chartColorMode: "profile",
    appearancePreference: "dark",
    resolvedAppearance: "dark",
    cssVariables: {
      "--simex-surface-panel": "#25231d",
      "--simex-text-strong": "#f5efe4",
    },
  });
});
