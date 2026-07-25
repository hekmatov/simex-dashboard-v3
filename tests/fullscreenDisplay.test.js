import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const displayModule = await vite
  .ssrLoadModule("/src/components/FullscreenDisplay.jsx")
  .catch(() => null);
await vite.close();

const dashboard = {
  loadedData: {},
  pages: [
    {
      id: "page",
      sections: [
        {
          id: "section",
          panels: [
            {
              id: "chart-a",
              type: "kpi",
              title: "Chart A",
              items: [{ label: "A", value: "1" }],
            },
            {
              id: "chart-b",
              type: "kpi",
              title: "Chart B",
              items: [{ label: "B", value: "2" }],
            },
          ],
        },
      ],
    },
  ],
};

test("fullscreen display component is available", () => {
  assert.equal(
    typeof displayModule?.default,
    "function",
    "FullscreenDisplay must be implemented",
  );
});

test("fullscreen display renders the exact ordered visible chart set", () => {
  assert.ok(displayModule, "fullscreen display must be implemented");
  const html = renderToStaticMarkup(
    React.createElement(displayModule.default, {
      dashboard,
      displayState: {
        display_revision: 1,
        displayed_chart_ids: ["chart-b", "chart-a"],
        layout: "sideBySide",
      },
      globalPanelColors: {},
      onDisplayAction: () => {},
    }),
  );

  assert.equal((html.match(/multi-fullscreen-cell/g) ?? []).length, 2);
  assert.ok(html.indexOf("Chart B") < html.indexOf("Chart A"));
  assert.match(html, /aria-label="Close chart-b"/);
  assert.match(html, /aria-label="Close chart-a"/);
  assert.match(html, /aria-label="Close all displayed charts"/);
  assert.match(html, /layout-sideBySide/);
});

test("fullscreen display renders nothing for an empty visible set", () => {
  assert.ok(displayModule, "fullscreen display must be implemented");
  const html = renderToStaticMarkup(
    React.createElement(displayModule.default, {
      dashboard,
      displayState: {
        display_revision: 0,
        displayed_chart_ids: [],
        layout: "solo",
      },
      globalPanelColors: {},
      onDisplayAction: () => {},
    }),
  );

  assert.equal(html, "");
});
