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
const presentModule = await vite
  .ssrLoadModule("/src/components/presentation/PresentWorkspace.jsx")
  .catch(() => null);
const rendererModule = await vite
  .ssrLoadModule("/src/components/DashboardRenderer.jsx")
  .catch(() => null);
const playbackModule = await vite
  .ssrLoadModule("/src/components/playback/PlaybackProvider.jsx")
  .catch(() => null);
await vite.close();

const dashboard = {
  pages: [
    {
      id: "biomedical",
      label: "Biomedical",
      title: "Biomedical response",
      sections: [{
        id: "overview",
        title: "Overview",
        panels: [
          { id: "chart-a", title: "Cases" },
          { id: "chart-b", title: "Capacity" },
          { id: "chart-c", title: "Coordination" },
          { id: "chart-d", title: "Demand" },
          { id: "chart-e", title: "Escalation" },
        ],
      }],
    },
  ],
  timeSyncGroups: [],
};

const displayState = {
  display_revision: 1,
  displayed_chart_ids: ["chart-b", "chart-a"],
  layout: "sideBySide",
};

function renderPresent(Component, overrides = {}) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      clearTimeout: globalThis.clearTimeout,
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: false },
      setTimeout: globalThis.setTimeout,
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "" },
  });
  try {
    return renderToStaticMarkup(
      React.createElement(
        playbackModule.PlaybackProvider,
        { groups: [], charts: [], loadedData: {}, profiles: {} },
        React.createElement(Component, {
          dashboard,
          activePageId: "biomedical",
          onActivePageChange: () => {},
          displayState,
          onDisplayAction: () => {},
          accessibilityEnabled: false,
          ...(Component === rendererModule?.default ? { mode: "present" } : {}),
          ...overrides,
        }),
      ),
    );
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
    else delete globalThis.navigator;
  }
}

test("Present workspace exposes the moderator scene controls without permission concepts", () => {
  assert.equal(
    typeof presentModule?.default,
    "function",
    "PresentWorkspace must be implemented",
  );
  assert.equal(
    typeof playbackModule?.PlaybackProvider,
    "function",
    "PlaybackProvider must be available to PresentWorkspace",
  );

  const html = renderPresent(presentModule.default);

  assert.match(html, />Open audience display<\/button>/);
  assert.match(html, /Audience display not open/);
  assert.match(html, /Biomedical \/ Overview/);
  assert.match(html, />Cases</);
  assert.match(html, />Capacity</);
  assert.match(html, /aria-label="Move Capacity up"/);
  assert.match(html, /aria-label="Move Cases down"/);
  assert.match(html, /aria-label="Scene layout"/);
  assert.match(html, /aria-label="Synchronized time"/);
  assert.match(html, /aria-label="Presentation time"/);
  assert.match(html, /Show scene title/);
  assert.match(html, />Blackout<\/button>/);
  assert.match(html, />Restore<\/button>/);
  assert.match(html, />End presentation<\/button>/);
  assert.doesNotMatch(html, /permission|role|authoriz|access control/i);
});

test("DashboardRenderer composes Present without mounting the fullscreen display", () => {
  assert.equal(
    typeof rendererModule?.default,
    "object",
    "DashboardRenderer must remain available as a forward-ref component",
  );

  const html = renderPresent(rendererModule.default);

  assert.match(html, /present-workspace/);
  assert.doesNotMatch(html, /fullscreen-backdrop/);
});

test("Present forwards display state without substituting layout or enforcing capacity", () => {
  const mismatchedLayoutHtml = renderPresent(presentModule.default, {
    displayState: {
      display_revision: 2,
      displayed_chart_ids: ["chart-a", "chart-b"],
      layout: "grid2x2",
    },
  });
  const sceneLayout = elementMarkupByAriaLabel(
    mismatchedLayoutHtml,
    "select",
    "Scene layout",
  );
  assert.doesNotMatch(
    sceneLayout,
    /selected=""/,
    "Present must not substitute a count-derived layout for displayState.layout",
  );

  const fullSceneHtml = renderPresent(presentModule.default, {
    displayState: {
      display_revision: 3,
      displayed_chart_ids: ["chart-a", "chart-b", "chart-c", "chart-d"],
      layout: "grid2x2",
    },
  });
  const escalationChoice = labeledControlMarkup(fullSceneHtml, "Escalation");
  assert.doesNotMatch(
    escalationChoice,
    /disabled=""/,
    "Present must dispatch selection and let displayController enforce capacity",
  );
});

function elementMarkupByAriaLabel(html, tagName, label) {
  const marker = `aria-label="${label}"`;
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing ${label}`);
  const start = html.lastIndexOf(`<${tagName}`, markerIndex);
  const end = html.indexOf(`</${tagName}>`, markerIndex);
  assert.ok(start >= 0 && end >= markerIndex, `Malformed ${label}`);
  return html.slice(start, end + tagName.length + 3);
}

function labeledControlMarkup(html, label) {
  const marker = `<span>${label}</span>`;
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing ${label}`);
  const start = html.lastIndexOf("<label", markerIndex);
  const end = html.indexOf("</label>", markerIndex);
  assert.ok(start >= 0 && end >= markerIndex, `Malformed ${label} control`);
  return html.slice(start, end + "</label>".length);
}
