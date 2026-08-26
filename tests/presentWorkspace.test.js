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
  title: "Response overview",
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
  chronoGroups: [],
};

const displayState = {
  display_revision: 1,
  displayed_chart_ids: ["chart-b", "chart-a"],
  layout: "sideBySide",
};

function renderPresent(Component, overrides = {}) {
  const {
    displayState: requestedDisplayState = displayState,
    runtime: runtimeOverrides = {},
    playbackProps = {},
    ...componentOverrides
  } = overrides;
  const runtime = {
    displayState: requestedDisplayState,
    onDisplayAction: () => {},
    connectionStatus: "not-open",
    connectionError: "",
    hasSession: false,
    audienceFacts: {
      dashboard_name: true,
      page: true,
      parent_chrono_group: true,
      scene_name: true,
      scene_date: true,
    },
    setAudienceFactVisible: () => {},
    blackout: false,
    setBlackout: () => {},
    publish: () => {},
    open: () => {},
    end: () => {},
    ...runtimeOverrides,
  };
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
        { groups: [], charts: [], loadedData: {}, profiles: {}, ...playbackProps },
        React.createElement(Component, {
          dashboard,
          activePageId: "biomedical",
          onActivePageChange: () => {},
          accessibilityEnabled: false,
          ...(Component === rendererModule?.default
            ? { mode: "present" }
            : { runtime }),
          ...componentOverrides,
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

test("active degraded Scene warns the moderator while Present keeps rendering", () => {
  const degradedScene = {
    id: "scene-review",
    chronoGroupId: "group-review",
    present: {
      chartIds: ["chart-a"],
      layout: "single",
      temporalReview: { status: "degraded", sourceIds: ["cases"] },
    },
  };
  const html = renderPresent(presentModule.default, {
    playbackProps: {
      scenes: [degradedScene],
      initialState: { activeSceneId: "scene-review", source: { kind: "scene", id: "scene-review" } },
    },
  });
  assert.match(html, /data-active-scene-id="scene-review"/);
  assert.match(html, /Scene presentation needs review/);
  assert.match(html, /Displayed charts/);
  assert.doesNotMatch(html, /temporalReview|sourceIds/);
});

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
  assert.match(html, /Display on audience/);
  for (const label of [
    "Dashboard name",
    "Parent Chrono Group",
    "Scene name",
    "Scene date",
  ]) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.doesNotMatch(html, /aria-label="Current page"/);
  assert.doesNotMatch(html, /aria-label="Display Page"/);
  assert.match(html, /Response overview/);
  assert.match(html, /Biomedical/);
  assert.match(html, /aria-label="Display Scene name"[^>]*disabled=""/);
  assert.doesNotMatch(html, /Show scene title/);
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

test("Present synchronously normalizes invalid layout while preserving capacity", () => {
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
  assert.match(
    sceneLayout,
    /<option value="sideBySide" selected="">/,
    "Present must synchronously select a count-valid layout",
  );

  const fullSceneHtml = renderPresent(presentModule.default, {
    displayState: {
      display_revision: 3,
      displayed_chart_ids: ["chart-a", "chart-b", "chart-c", "chart-d"],
      layout: "grid2x2",
    },
  });
  const escalationChoice = labeledControlMarkup(fullSceneHtml, "Escalation");
  assert.match(
    escalationChoice,
    /disabled=""/,
    "Present must reason-disable a fifth chart until one is removed",
  );
});

test("an empty Present catalogue routes recovery to Build without adding an Audience action", () => {
  const emptyDashboard = {
    ...dashboard,
    pages: [{
      ...dashboard.pages[0],
      sections: [{ ...dashboard.pages[0].sections[0], panels: [] }],
    }],
  };
  const html = renderPresent(presentModule.default, {
    dashboard: emptyDashboard,
    displayState: {
      display_revision: 4,
      displayed_chart_ids: [],
      layout: "solo",
    },
    onModeRequest: () => {},
  });

  assert.match(
    html,
    /No charts are available to present from this dashboard\./,
  );
  assert.equal((html.match(/>Open Build to Add Charts<\/button>/g) ?? []).length, 1);
  assert.match(html, /Audience display not open/);
  assert.doesNotMatch(html, /Choose up to 4 charts/);
});

test("Free-text panels are absent from the Present catalogue", () => {
  const dashboardWithFreeText = {
    ...dashboard,
    dataSources: {
      "field-guide-source": {
        kind: "staticText",
        sourceVersion: 1,
        revision: 1,
        renderingPolicy: "portable-qmd-v1",
        qmd: "## Stabilisation notes",
      },
    },
    pages: [{
      ...dashboard.pages[0],
      sections: [{
        ...dashboard.pages[0].sections[0],
        panels: [
          dashboard.pages[0].sections[0].panels[0],
          {
            id: "field-guide",
            title: "Field guide",
            typeId: "freeText",
            sourceId: "field-guide-source",
          },
        ],
      }],
    }],
  };
  const html = renderPresent(presentModule.default, {
    dashboard: dashboardWithFreeText,
    displayState: {
      display_revision: 5,
      displayed_chart_ids: [],
      layout: "solo",
    },
  });

  assert.match(html, />Cases</);
  assert.doesNotMatch(html, />Field guide</);
  assert.doesNotMatch(html, /field-guide/);
});

test("recovery-only Images are absent from the Present catalogue", () => {
  const recoveryDashboard = {
    ...dashboard,
    dataSources: {
      "recovery-source": {
        kind: "staticImage",
        sourceVersion: 2,
        mediaId: "media-recovery-source",
        alt: "Unavailable map",
        decorative: false,
        fit: "contain",
        crop: { x: 0, y: 0, width: 1000, height: 1000 },
        rotation: 0,
      },
    },
    contentLibrary: {
      mediaItems: {
        "media-recovery-source": {
          mediaId: "media-recovery-source",
          revision: 2,
          current: { kind: "asset", assetId: "missing-recovery-source" },
          displayName: "Recovery image",
          defaultDescription: "Unavailable map",
          origin: "legacy-import",
          health: "needs-relink",
        },
      },
      sourceEntries: {},
    },
    pages: [{
      ...dashboard.pages[0],
      sections: [{
        ...dashboard.pages[0].sections[0],
        panels: [
          dashboard.pages[0].sections[0].panels[0],
          {
            id: "recovery-image",
            title: "Recovery image",
            typeId: "image",
            sourceId: "recovery-source",
          },
        ],
      }],
    }],
  };
  const html = renderPresent(presentModule.default, {
    dashboard: recoveryDashboard,
    displayState: {
      display_revision: 6,
      displayed_chart_ids: [],
      layout: "solo",
    },
  });

  assert.match(html, />Cases</);
  assert.doesNotMatch(html, />Recovery image</);
  assert.doesNotMatch(html, /data-presentable-item-id="recovery-image"/);
});

test("Present projects ordered chart and exact saved Image descriptors without time fields", () => {
  assert.equal(typeof presentModule?.projectPresentableItems, "function");
  const index = new Map([
    ["chart-a", { descriptor: { kind: "chart", chart_id: "chart-a" } }],
    ["image-a", { descriptor: {
      kind: "image",
      panel_id: "image-a",
      media_id: "media-image-source",
      revision: 9,
    } }],
  ]);

  const descriptors = presentModule.projectPresentableItems(
    ["image-a", "chart-a"],
    index,
  );
  assert.deepEqual(descriptors, [
    { kind: "image", panel_id: "image-a", media_id: "media-image-source", revision: 9 },
    { kind: "chart", chart_id: "chart-a" },
  ]);
  assert.equal(Object.hasOwn(descriptors[0], "time"), false);
  assert.equal(Object.hasOwn(descriptors[0], "fit"), false);
  assert.equal(Object.hasOwn(descriptors[0], "url"), false);
});

test("Present synchronously normalizes layout when trusted selection shrinks", () => {
  assert.equal(typeof presentModule?.reconcilePresentDisplayState, "function");
  const trusted = new Map([
    ["chart-a", { descriptor: { kind: "chart", chart_id: "chart-a" } }],
  ]);

  const reconciled = presentModule.reconcilePresentDisplayState({
    display_revision: 8,
    displayed_chart_ids: ["chart-a", "stale-image"],
    layout: "sideBySide",
  }, trusted);

  assert.deepEqual(reconciled.displayed_chart_ids, ["chart-a"]);
  assert.equal(reconciled.layout, "solo");
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
