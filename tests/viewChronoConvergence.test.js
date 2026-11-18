import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { profileDataset } from "../src/charting/data/profileDataset.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: ViewShell, sceneNavigationPageId },
  { PlaybackProvider, createPlaybackTimer },
  { default: DashboardModeWorkspace },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/view/ViewShell.jsx"),
  vite.ssrLoadModule("/src/components/playback/PlaybackProvider.jsx"),
  vite.ssrLoadModule("/src/components/dashboard/DashboardModeWorkspace.jsx"),
]);
await vite.close();

test("selecting a cross-page Storyline keeps the currently visible page", () => {
  assert.equal(
    sceneNavigationPageId({ id: "scene-a", pageId: "biomedical" }, { id: "home" }),
    null,
  );
  assert.equal(
    sceneNavigationPageId({ id: "scene-a", pageId: "biomedical" }, { id: "biomedical" }),
    null,
  );
  assert.equal(sceneNavigationPageId(null, { id: "home" }), null);
});

const rows = [
  { observed: "2027-05-01", cases: 10 },
  { observed: "2027-05-02", cases: 20 },
  { observed: "2027-05-03", cases: 30 },
];
const profile = profileDataset(rows, {
  observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
});
const memberChart = lineChart("member-chart", "Synchronized cases");
const ordinaryChart = lineChart("ordinary-chart", "Ordinary page chart");
const page = {
  id: "biomedical",
  label: "Biomedical",
  title: "Biomedical situational awareness",
  description: "Regional preparedness evidence",
  sections: [{
    id: "outbreak",
    title: "Outbreak dynamics",
    panels: [
      { id: "member-placement", chart: memberChart },
      { id: "ordinary-placement", chart: ordinaryChart },
    ],
  }],
};
const groups = [{
  id: "exercise",
  name: "Exercise timeline",
  period: { start: "2027-05-01", end: "2027-05-03" },
  matching: { policy: "exact" },
  secondsPerFrame: 2.5,
  members: [{ chartId: memberChart.id, timeRole: "observation" }],
}];
const dashboard = {
  title: page.title,
  description: page.description,
  programLabel: "Pandemic & Disaster Preparedness Center",
  scenarioLabel: "HeV-A26 Day 2 Simulation",
  lastUpdated: "2026-07-27",
  timezone: "UTC",
  globalStyles: { accessibility: { enabled: false } },
  dataSources: {},
  datasetProfiles: { primary: profile },
  loadedData: { primary: rows },
  pages: [page],
};

test("legacy Group time scope keeps every chart in its ordinary page section", () => {
  const html = withBrowserGlobals(() => renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups,
        charts: [memberChart, ordinaryChart],
        loadedData: dashboard.loadedData,
        profiles: dashboard.datasetProfiles,
        timezone: dashboard.timezone,
        initialState: {
          activeGroupId: "exercise",
          activeIndex: 1,
          playing: false,
          scope: "all-page",
          speed: 2.5,
          playbackView: true,
        },
      },
      React.createElement(ViewShell, {
        activePage: page,
        dashboard,
        displayState: { displayed_chart_ids: [], layout: "solo" },
        companionStatusLabel: "Companion unavailable",
        iconLanguageStyles: {},
        geoDataSources: {},
        onActivePageChange: () => {},
        onCompareCharts: () => {},
        onDisplayAction: () => {},
        onOpenDashboardLook: () => {},
      }),
    ),
  ));

  assert.doesNotMatch(html, /data-chrono-section=/);
  assert.match(html, /class="layout-grid layout-two-column"/);
  assert.equal((html.match(/data-canonical-panel-id="member-chart"/g) ?? []).length, 1);
  assert.match(html, /data-dashboard-surface="view"/);
  assert.match(html, /data-canonical-panel-id="ordinary-chart"/);
  const memberIndex = html.indexOf('data-canonical-panel-id="member-chart"');
  const canonicalSectionIndex = html.indexOf('data-canonical-section-id="outbreak"');
  const ordinaryIndex = html.indexOf('data-canonical-panel-id="ordinary-chart"');
  assert.ok(canonicalSectionIndex < memberIndex);
  assert.ok(canonicalSectionIndex < ordinaryIndex);
  const ordinaryPanel = html.slice(ordinaryIndex, html.indexOf("</article>", ordinaryIndex));
  assert.match(html, /data-deferred-panel="ordinary-chart"/);
  assert.match(ordinaryPanel, /Load chart: Ordinary page chart/);
  assert.doesNotMatch(ordinaryPanel, /chart-status-(?:empty|error)|chart-deferred-placeholder/);
  assert.doesNotMatch(html, /playback-controls--floating/);
  assert.match(html, /aria-label="Exercise time stamp"/);
});

test("first-open time controls leave ordinary page content in place", () => {
  const html = withBrowserGlobals(() => renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups,
        charts: [memberChart, ordinaryChart],
        loadedData: dashboard.loadedData,
        profiles: dashboard.datasetProfiles,
        timezone: dashboard.timezone,
        initialState: { playbackView: true, scope: "all-page" },
      },
      React.createElement(ViewShell, {
        activePage: page,
        dashboard,
        displayState: { displayed_chart_ids: [], layout: "solo" },
        companionStatusLabel: "Companion unavailable",
        iconLanguageStyles: {},
        geoDataSources: {},
        onActivePageChange: () => {},
        onCompareCharts: () => {},
        onDisplayAction: () => {},
        onOpenDashboardLook: () => {},
      }),
    ),
  ));

  assert.doesNotMatch(html, /data-chrono-section=/);
  assert.equal((html.match(/data-canonical-panel-id="member-chart"/g) ?? []).length, 1);
  const ordinaryIndex = html.indexOf('data-canonical-panel-id="ordinary-chart"');
  assert.ok(ordinaryIndex > html.indexOf('data-canonical-section-id="outbreak"'));
  const ordinaryPanel = html.slice(ordinaryIndex, html.indexOf("</article>", ordinaryIndex));
  assert.match(html, /data-deferred-panel="ordinary-chart"/);
  assert.match(ordinaryPanel, /Load chart: Ordinary page chart/);
  assert.doesNotMatch(ordinaryPanel, /chart-status-(?:empty|error)|chart-deferred-placeholder/);
});

test("legacy Group-only temporal scope retains ordinary page charts", () => {
  const html = withBrowserGlobals(() => renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups,
        charts: [memberChart, ordinaryChart],
        loadedData: dashboard.loadedData,
        profiles: dashboard.datasetProfiles,
        timezone: dashboard.timezone,
        initialState: {
          activeGroupId: "exercise",
          activeIndex: 1,
          playing: false,
          scope: "group-only",
          speed: 2.5,
          playbackView: true,
        },
      },
      React.createElement(ViewShell, {
        activePage: page,
        dashboard,
        displayState: { displayed_chart_ids: [], layout: "solo" },
        companionStatusLabel: "Companion unavailable",
        iconLanguageStyles: {},
        geoDataSources: {},
        onActivePageChange: () => {},
        onCompareCharts: () => {},
        onDisplayAction: () => {},
        onOpenDashboardLook: () => {},
      }),
    ),
  ));

  assert.equal((html.match(/data-canonical-panel-id="member-chart"/g) ?? []).length, 1);
  assert.match(html, /data-canonical-panel-id="ordinary-chart"/);
});

test("cross-page Storyline band precedes ordinary content in both live and compatibility shells", () => {
  const secondPage = { ...page, id: "second", sections: [{ id: "cross-page-section", panels: [{ id: "cross-placement", chart: ordinaryChart }] }] };
  const scene = { id: "story", name: "Cross-page comparison", members: [{ chartId: ordinaryChart.id, width: 4, height: 1 }, { chartId: memberChart.id, width: 4, height: 1 }],
    view: { layout: "overUnder" }, frames: { mode: "source", chartId: memberChart.id, selection: "all" },
    present: { chartIds: [ordinaryChart.id, memberChart.id], layout: "horizontal-divider" } };
  const runtime = { ...dashboard, pages: [{ ...page, sections: [{ ...page.sections[0], panels: [page.sections[0].panels[0]] }] }, secondPage], scenes: [scene] };
  for (const Shell of [ViewShell, DashboardModeWorkspace]) {
    const html = withBrowserGlobals(() => renderToStaticMarkup(React.createElement(PlaybackProvider, {
      charts: [memberChart, ordinaryChart], groups: [], scenes: [scene], loadedData: runtime.loadedData,
      profiles: runtime.datasetProfiles, timezone: "UTC", activePageId: page.id,
      initialState: { cursor: { mode: "live", epochMs: null, scope: { kind: "storyline", id: "story" }, window: null } },
    }, React.createElement(Shell, { mode: "view", activePage: runtime.pages[0], dashboard: runtime,
      displayState: { displayed_chart_ids: [], layout: "solo" }, geoDataSources: {}, onDisplayAction() {} }))));
    assert.match(html, /data-storyline-band="story"/);
    assert.match(html, /data-scene-view-layout="overUnder"/);
    assert.match(html, /data-scene-chart-id="ordinary-chart"/);
    assert.match(html, /Close Storyline/);
    assert.match(html, /Fictional scenario · Exercise use only/);
    assert.ok(html.indexOf('data-storyline-band="story"') < html.indexOf('data-canonical-section-id="outbreak"'));
    assert.equal((html.match(/data-canonical-panel-id="member-chart"/g) ?? []).length, 1);
  }
});

test("comparison selection suspends the movable stamp without removing canonical charts", () => {
  for (const Shell of [ViewShell, DashboardModeWorkspace]) {
    const html = withBrowserGlobals(() => renderToStaticMarkup(React.createElement(PlaybackProvider, {
      charts: [memberChart, ordinaryChart], groups: [], scenes: [], loadedData: dashboard.loadedData,
      profiles: dashboard.datasetProfiles, activePageId: page.id,
      initialState: { cursor: { mode: "at", epochMs: Date.parse("2027-05-02"), scope: { kind: "page", id: page.id }, window: null } },
    }, React.createElement(Shell, { mode: "view", activePage: page, dashboard, multiSelectMode: true,
      multiPanelIds: [memberChart.id, ordinaryChart.id], displayState: { displayed_chart_ids: [], layout: "solo" }, geoDataSources: {}, onDisplayAction() {} }))));
    assert.match(html, /aria-label="Chart comparison selection"/);
    assert.match(html, /data-canonical-panel-id="member-chart"/);
    assert.match(html, /class="chrono-date-overlay" hidden=""/);
  }
});

test("playback cadence is measured in seconds per frame", () => {
  const delays = [];
  const scheduler = {
    setInterval(callback, delay) {
      delays.push(delay);
      return 1;
    },
    clearInterval() {},
  };
  const cleanup = createPlaybackTimer({
    playing: true,
    playbackView: true,
    clockLength: 3,
    speed: 2.5,
    activeIndex: 0,
    dispatch() {},
    documentTarget: null,
    scheduler,
  });

  assert.deepEqual(delays, [2500]);
  cleanup();
});

function lineChart(id, title) {
  return {
    id,
    typeId: "line",
    title,
    sourceId: "primary",
    roles: {
      measurements: { field: "cases" },
      observation: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    presentation: { collection: null, labels: null, accessibility: null },
    interaction: {
      zoom: { enabled: false },
      timeSync: null,
    },
  };
}

function withBrowserGlobals(run) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: false },
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "" },
  });
  try {
    return run();
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
    else delete globalThis.navigator;
  }
}
