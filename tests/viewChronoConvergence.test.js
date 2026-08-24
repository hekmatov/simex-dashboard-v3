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
] = await Promise.all([
  vite.ssrLoadModule("/src/components/view/ViewShell.jsx"),
  vite.ssrLoadModule("/src/components/playback/PlaybackProvider.jsx"),
]);
await vite.close();

test("selecting a cross-page Scene requests its owning page exactly once", () => {
  assert.equal(
    sceneNavigationPageId({ id: "scene-a", pageId: "biomedical" }, { id: "home" }),
    "biomedical",
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

test("All page charts elevates only Chrono members and keeps ordinary charts rendered below", () => {
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

  assert.match(html, /data-chrono-section="exercise"/);
  assert.match(html, /class="layout-grid layout-two-column"/);
  assert.equal((html.match(/data-panel-id="member-chart"/g) ?? []).length, 1);
  assert.match(html, /data-dashboard-surface="view"/);
  assert.match(html, /data-panel-id="ordinary-chart"/);
  const chronoSectionIndex = html.indexOf('data-chrono-section="exercise"');
  const memberIndex = html.indexOf('data-panel-id="member-chart"');
  const canonicalSectionIndex = html.indexOf('data-canonical-section-id="outbreak"');
  const ordinaryIndex = html.indexOf('data-panel-id="ordinary-chart"');
  assert.ok(chronoSectionIndex < memberIndex && memberIndex < canonicalSectionIndex);
  assert.ok(canonicalSectionIndex < ordinaryIndex);
  const ordinaryPanel = html.slice(ordinaryIndex, html.indexOf("</article>", ordinaryIndex));
  assert.match(ordinaryPanel, /data-canonical-plot-id="ordinary-chart"/);
  assert.doesNotMatch(ordinaryPanel, /chart-status-(?:empty|error)|chart-deferred-placeholder/);
  assert.match(html, /class="playback-controls playback-controls--floating playback-controls--bottom"/);
  assert.match(html, /aria-label="Seconds per frame"/);
  assert.match(html, /type="number"[^>]*aria-label="Seconds per frame"[^>]*value="2\.5"/);
});

test("Group only omits ordinary Page charts without duplicating Chrono members", () => {
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

  assert.equal((html.match(/data-panel-id="member-chart"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-panel-id="ordinary-chart"/);
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
