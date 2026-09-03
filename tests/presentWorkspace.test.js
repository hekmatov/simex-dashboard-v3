import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
const audienceDrawerModule = await vite
  .ssrLoadModule("/src/components/presentation/AudienceDisplayOptionsDrawer.jsx")
  .catch(() => null);
const rendererModule = await vite
  .ssrLoadModule("/src/components/DashboardRenderer.jsx")
  .catch(() => null);
const playbackModule = await vite
  .ssrLoadModule("/src/components/playback/PlaybackProvider.jsx")
  .catch(() => null);
const operationStatusModule = await vite
  .ssrLoadModule("/src/components/app-shell/OperationStatusProvider.jsx")
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

test("Present labels intentionally untitled Text/Image panels nonvisually", () => {
  assert.equal(
    presentModule?.presentChartLabel({ id: "notes", typeId: "freeText", title: "" }),
    "Text/Image panel",
  );
  assert.equal(
    presentModule?.presentChartLabel({ id: "image", typeId: "image", title: "   " }),
    "Text/Image panel",
  );
  assert.equal(
    presentModule?.presentChartLabel({ id: "chart-a", typeId: "kpi", title: "Cases" }),
    "Cases",
  );
});

function renderPresent(Component, overrides = {}) {
  const {
    displayState: requestedDisplayState = displayState,
    runtime: runtimeOverrides = {},
    connectionStatus: connectionStatusOverride = "not-open",
    playbackProps = {},
    ...componentOverrides
  } = overrides;
  const runtime = {
    displayState: requestedDisplayState,
    onDisplayAction: () => {},
    connectionStatus: connectionStatusOverride,
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
    const workspace = React.createElement(
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
    );
    return renderToStaticMarkup(
      Component === rendererModule?.default
        ? React.createElement(operationStatusModule.default, null, workspace)
        : workspace,
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

  assert.match(html, /class="[^"]*present-status-actions[^"]*"[\s\S]*>Open audience display<\/button>/);
  assert.match(html, /Audience display not open/);
  assert.match(html, /Biomedical \/ Overview/);
  assert.match(html, />Cases</);
  assert.match(html, />Capacity</);
  assert.match(html, /aria-label="Move Capacity up"/);
  assert.match(html, /aria-label="Move Cases down"/);
  assert.match(html, /aria-label="Scene layout"/);
  assert.match(html, /aria-label="Presentation source"/);
  assert.match(html, /aria-label="Presentation time"/);
  assert.match(html, />Audience display options<\/button>/);
  assert.doesNotMatch(html, /aria-label="Current page"/);
  assert.doesNotMatch(html, /aria-label="Display Page"/);
  assert.match(html, /Response overview/);
  assert.match(html, /Biomedical/);
  assert.doesNotMatch(html, /Show scene title/);
  assert.match(html, />Blackout<\/button>/);
  assert.match(html, />Restore<\/button>/);
  assert.match(html, />End presentation<\/button>/);
  assert.equal((html.match(/data-dashboard-painted-boundary="true"/g) ?? []).length, 3);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, " "), /permission|role|authoriz|access control/i);
});

test("Present contains no date-position editor or composition mount point", () => {
  const html = renderPresent(presentModule.default);

  assert.doesNotMatch(html, /presentation-composition-host/);
  assert.doesNotMatch(html, /data-presentation-composition-id="date-position"/);
  assert.doesNotMatch(html, /data-presentation-control-id="date-position-(?:x|y|width|save|cancel|handle)"/);
  assert.doesNotMatch(
    html.replace(/<[^>]+>/g, " "),
    /Audience date position|Horizontal position|Vertical position|Date width|Save date position|Cancel/i,
  );
});

test("Present keeps the useful holding-state message without duplicate page summaries", () => {
  const html = renderPresent(presentModule.default, {
    displayState: {
      display_revision: 2,
      displayed_chart_ids: [],
      layout: "solo",
    },
  });

  assert.match(html, /Holding scene — no charts selected\./);
  assert.doesNotMatch(html, /Biomedical: holding scene/);
  assert.doesNotMatch(html, /class="present-scene-summary"/);
});

test("Audience monitor uses the accepted session snapshot and falls back locally only before one exists", () => {
  const resolveMonitorState = presentModule?.resolveAudienceMonitorPresentationState;
  assert.equal(typeof resolveMonitorState, "function");
  const localPresentationState = {
    source: { kind: "Chrono Group", scene_id: null, chrono_group_id: "epidemic-time" },
    audience: {
      date_position: { x_permille: 680, y_permille: 40, width_permille: 280 },
    },
  };
  const acceptedPresentationState = {
    ...localPresentationState,
    audience: {
      date_position: { x_permille: 125, y_permille: 250, width_permille: 280 },
    },
  };

  assert.equal(resolveMonitorState({
    acceptedPresentationState,
    localPresentationState,
  }), acceptedPresentationState);
  assert.equal(resolveMonitorState({
    acceptedPresentationState: null,
    localPresentationState,
  }), localPresentationState);
});

test("Present starts Chrono Groups collapsed and keeps the requested status-action order", () => {
  const html = renderPresent(presentModule.default);
  const actions = html.match(/<div class="present-status-actions">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const labels = [...actions.matchAll(/<button[^>]*>([^<]+)<\/button>/g)]
    .map(([, label]) => label.trim());

  assert.deepEqual(labels, [
    "Open audience display",
    "Audience display options",
    "Chrono Groups",
    "Theme",
  ]);
  assert.match(
    actions,
    /data-presentation-control-id="chrono-groups"[^>]*aria-controls="present-chrono-groups"[^>]*aria-expanded="false"[^>]*aria-pressed="false"/,
  );
  assert.match(
    html,
    /<section class="present-action-dock"[^>]*id="present-chrono-groups"[^>]*hidden=""/,
  );
});

test("top Present status action reuses session lifecycle identity and switches to Reopen only while a session exists", () => {
  const ended = renderPresent(presentModule.default);
  const active = renderPresent(presentModule.default, {
    runtime: {
      sessionState: {
        lifecycle: "active",
        connection: "connected",
        output: "active",
        playback: "paused",
        blackout: false,
        rejectionReason: null,
      },
      hasSession: true,
      openNewSession() {},
      reopenAudience() {},
      dispatch() {},
    },
  });
  assert.match(ended, /data-presentation-control-id="open-new-session"[\s\S]*>Open audience display<\/button>/);
  assert.doesNotMatch(ended, />Open new audience session<\/button>/);
  assert.match(active, /data-presentation-control-id="reopen-audience"[\s\S]*>Reopen audience display<\/button>/);
  for (const html of [ended, active]) {
    const lowerController = html.slice(html.indexOf('class="presentation-controller"'));
    assert.equal((lowerController.match(/data-presentation-control-id="(?:open-new-session|reopen-audience)"/g) ?? []).length, 0);
  }
});

test("Present status geometry and each approved visual grammar expose a distinctive semantic style signal", async () => {
  const [presentationCss, grammarCss] = await Promise.all([
    readFile(new URL("../src/styles/presentation.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/dashboard-style-grammar.css", import.meta.url), "utf8"),
  ]);
  assert.match(presentationCss, /\.present-status-strip\s*\{[\s\S]*?border:\s*1px solid var\(--simex-border-subtle\)[\s\S]*?padding:\s*8px 12px/);
  assert.match(grammarCss, /data-dashboard-style="evidence-ledger"[\s\S]*?\.present-selected-chart[\s\S]*?background-image:\s*linear-gradient/);
  assert.match(grammarCss, /data-dashboard-style="humanist-standard"[\s\S]*?\.present-workspace[\s\S]*?border-radius:\s*calc\(/);
  assert.match(grammarCss, /data-dashboard-style="signal-instrument"[\s\S]*?\.present-workspace[\s\S]*?\.presentation-controller__source[\s\S]*?--simex-decorated-edge-inline-start:\s*3px/);
});

test("Audience display options drawer preserves the live audience-fact values", () => {
  assert.equal(typeof audienceDrawerModule?.default, "function");
  const information = [
    { key: "dashboard_name", label: "Dashboard name", value: "Test dashboard", unavailableReason: "" },
    { key: "scene_name", label: "Scene name", value: null, unavailableReason: "No Scene is loaded." },
  ];
  const html = renderToStaticMarkup(React.createElement(audienceDrawerModule.default, {
    open: true,
    onClose() {},
    audienceInformation: information,
    audienceFacts: { dashboard_name: true, scene_name: false },
    onAudienceFactVisible() {},
  }));

  assert.match(html, /data-right-side-drawer="audience-display-options-drawer"/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-label="Display Dashboard name"[^>]*checked/);
  assert.match(html, /aria-label="Display Scene name"[^>]*disabled/);
  assert.match(html, /No Scene is loaded\./);
});

test("Present exposes connecting and reconnecting moderator status copy", () => {
  for (const [connectionStatus, label] of [
    ["connecting", "Audience display connecting"],
    ["reconnecting", "Audience display reconnecting"],
  ]) {
    const html = renderPresent(presentModule.default, { connectionStatus });
    assert.match(html, new RegExp(`>${label}<`));
    assert.match(html, /aria-label="Audience display connection"/);
  }
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

  assert.match(html, /No charts are available to present from this dashboard\./);
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
