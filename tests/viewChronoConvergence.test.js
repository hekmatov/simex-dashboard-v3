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
  { default: ViewShell },
  { PlaybackProvider, createPlaybackTimer },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/view/ViewShell.jsx"),
  vite.ssrLoadModule("/src/components/playback/PlaybackProvider.jsx"),
]);
await vite.close();

const rows = [
  { observed: "2027-05-01", cases: 10 },
  { observed: "2027-05-02", cases: 20 },
  { observed: "2027-05-03", cases: 30 },
];
const profile = profileDataset(rows, {
  observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
});
const memberChart = lineChart("member-chart", "Synchronized cases", "exercise");
const ordinaryChart = lineChart("ordinary-chart", "Ordinary page chart", null);
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
  primaryClock: { sourceId: "primary", timeField: "observed" },
  matching: { policy: "exact" },
  members: [{ chartId: memberChart.id, timeRole: "observation" }],
}];
const dashboard = {
  title: page.title,
  description: page.description,
  programLabel: "Pandemic & Disaster Preparedness Center",
  scenarioLabel: "HeV-A26 Day 2 Simulation",
  lastUpdated: "2026-07-27",
  globalStyles: { accessibility: { enabled: false } },
  dataSources: {},
  datasetProfiles: { primary: profile },
  loadedData: { primary: rows },
  pages: [page],
};

test("View Chrono keeps the Page visible, elevates members, and owns entry in the Page row", () => {
  const html = withBrowserGlobals(() => renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups,
        charts: [memberChart, ordinaryChart],
        loadedData: dashboard.loadedData,
        profiles: dashboard.datasetProfiles,
        initialState: {
          activeGroupId: "exercise",
          activeIndex: 1,
          playing: false,
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

  assert.match(
    html,
    /aria-label="View page actions"[\s\S]*aria-label="Time Group"[\s\S]*>Chrono view<\/button>[\s\S]*>Compare charts<\/button>/,
  );
  assert.match(html, /aria-pressed="true"[^>]*>Chrono view<\/button>/);
  assert.match(html, /class="playback-view"/);
  assert.match(html, /data-chart-id="member-chart"/);
  assert.match(html, /data-dashboard-surface="view"/);
  assert.match(html, /data-panel-id="ordinary-chart"/);
  assert.ok(
    html.indexOf("class=\"playback-view\"") < html.indexOf("data-dashboard-surface=\"view\""),
    "Chrono members should be elevated before the ordinary Page canvas",
  );
  assert.match(html, /class="playback-controls playback-controls--floating playback-controls--bottom"/);
  assert.match(html, /aria-label="Seconds per frame"/);
  assert.match(html, />2\.5 seconds<\/option>/);
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

function lineChart(id, title, groupId) {
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
      timeSync: groupId ? { groupId } : null,
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
