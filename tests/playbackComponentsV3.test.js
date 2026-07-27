import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { profileDataset } from "../src/charting/data/profileDataset.js";

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
  PlaybackProvider,
  createPlaybackTimer,
  prefersReducedMotion,
  useOptionalPlayback,
  usePlayback,
} = await import("../src/components/playback/PlaybackProvider.jsx");
const { default: PlaybackControls } = await import("../src/components/playback/PlaybackControls.jsx");
const { default: PlaybackView } = await import("../src/components/playback/PlaybackView.jsx");
const { default: ChartView } = await import("../src/components/charts/ChartView.jsx");

const MAY_1 = Date.UTC(2027, 4, 1);
const MAY_2 = Date.UTC(2027, 4, 2);
const MAY_3 = Date.UTC(2027, 4, 3);

test("playback controls expose semantic transport, time selection, speed, and view actions", () => {
  const html = renderPlayback(
    React.createElement(PlaybackControls),
    {
      initialState: {
        activeGroupId: "exercise",
        activeIndex: 1,
        playing: false,
        speed: 1,
        playbackView: true,
      },
    },
  );

  assert.match(html, /aria-label="Previous time"/);
  assert.match(html, /aria-label="Play synchronized charts"/);
  assert.match(html, /aria-label="Next time"/);
  assert.match(html, /aria-label="Playback time"/);
  assert.match(html, /type="range"/);
  assert.match(html, /aria-label="Choose synchronized time"/);
  assert.match(html, /<select[^>]*aria-label="Playback speed"/);
  assert.match(html, /2027-05-02/);
  assert.match(html, />1×</);
  assert.match(html, /aria-label="Close playback view"/);
  assert.match(html, /aria-live="polite"/);
});

test("transport actions are disabled for absent, empty, and boundary clocks", () => {
  const noGroup = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      { groups: [], charts: [], loadedData: {}, profiles: {} },
      React.createElement(PlaybackControls),
    ),
  );
  const atStart = renderPlayback(React.createElement(PlaybackControls));
  const atEnd = renderPlayback(
    React.createElement(PlaybackControls),
    {
      initialState: {
        activeGroupId: "exercise",
        activeIndex: 2,
        playing: false,
        speed: 1,
        playbackView: true,
      },
    },
  );

  assert.match(noGroup, /aria-label="Play synchronized charts"[^>]*disabled/);
  assert.match(noGroup, /No playback group is available/);
  assert.match(atStart, /aria-label="Previous time"[^>]*disabled/);
  assert.match(atEnd, /aria-label="Play synchronized charts"[^>]*disabled/);
  assert.match(atEnd, /aria-label="Next time"[^>]*disabled/);
});

test("the provider exposes a frozen context and optional consumption is safe outside it", () => {
  function Probe() {
    const playback = usePlayback();
    return React.createElement("output", null, [
      Object.isFrozen(playback) ? "frozen" : "mutable",
      playback.timeContext?.groupId,
      playback.activeEpochMs,
    ].join("|"));
  }

  function OptionalProbe() {
    return React.createElement(
      "output",
      null,
      useOptionalPlayback() === null ? "optional" : "provided",
    );
  }

  const provided = renderPlayback(React.createElement(Probe), {
    initialState: {
      activeGroupId: "exercise",
      activeIndex: 1,
      playing: false,
      speed: 1,
      playbackView: true,
    },
  });
  const optional = renderToStaticMarkup(React.createElement(OptionalProbe));

  assert.match(provided, new RegExp(`frozen\\|exercise\\|${MAY_2}`));
  assert.equal(optional, "<output>optional</output>");
});

test("playback view renders eligible members and explicit missing and unavailable states", () => {
  const fixture = playbackFixture();
  const unavailable = lineChart({
    id: "unavailable-chart",
    title: "Unavailable supplies",
    sourceId: "unavailable",
  });
  const missing = lineChart({
    id: "missing-chart",
    title: "Missing measurement",
    sourceId: "missing",
  });
  const staticChart = lineChart({
    id: "ineligible-static-chart",
    title: "Static reference",
    sourceId: "primary",
    interaction: { zoom: { enabled: false } },
  });
  const group = {
    ...fixture.groups[0],
    members: [
      ...fixture.groups[0].members,
      { chartId: missing.id, timeRole: "observation" },
      { chartId: unavailable.id, timeRole: "observation" },
    ],
  };
  const html = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        ...fixture,
        groups: [group],
        charts: [...fixture.charts, missing, unavailable, staticChart],
        loadedData: {
          ...fixture.loadedData,
          missing: [{ observed: "2027-05-01", cases: 4 }],
        },
        profiles: {
          ...fixture.profiles,
          missing: temporalProfile([{ observed: "2027-05-01", cases: 4 }]),
          unavailable: temporalProfile([{ observed: "2027-05-01", cases: 0 }]),
        },
        initialState: {
          activeGroupId: "exercise",
          activeIndex: 1,
          playing: false,
          speed: 1,
          playbackView: true,
        },
      },
      React.createElement(PlaybackView),
    ),
  );

  assert.match(html, /3 participating charts/);
  assert.match(html, /No measurement at this time/);
  assert.match(html, /Data source unavailable is unavailable/);
  assert.match(html, /class="playback-member/);
  assert.doesNotMatch(html, /Static reference/);
  assert.doesNotMatch(html, /ineligible-static-chart/);
});

test("playback view reports no group and empty primary clocks without claiming participation", () => {
  const noGroup = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      { groups: [], charts: [], loadedData: {}, profiles: {} },
      React.createElement(PlaybackView),
    ),
  );

  assert.match(noGroup, /Choose a playback group/);
  assert.doesNotMatch(noGroup, /playback-member/);
});

test("ChartView receives active time only when its configured group matches", () => {
  const fixture = playbackFixture();
  const staticChart = lineChart({
    id: "static",
    title: "Static trend",
    sourceId: "primary",
    interaction: { zoom: { enabled: false } },
  });
  const staticProps = {
    chart: staticChart,
    rows: fixture.loadedData.primary,
    datasetProfile: fixture.profiles.primary,
  };
  const outsideProvider = renderToStaticMarkup(
    React.createElement(ChartView, staticProps),
  );
  const staticInsideProvider = renderPlayback(
    React.createElement(ChartView, staticProps),
    {
      ...fixture,
      charts: [...fixture.charts, staticChart],
      initialState: {
        activeGroupId: "exercise",
        activeIndex: 1,
        playing: false,
        speed: 1,
        playbackView: true,
      },
    },
  );
  const synchronized = renderPlayback(
    React.createElement(ChartView, {
      chart: fixture.charts[0],
      rows: fixture.loadedData.primary,
      datasetProfile: fixture.profiles.primary,
    }),
    {
      ...fixture,
      initialState: {
        activeGroupId: "exercise",
        activeIndex: 1,
        playing: false,
        speed: 1,
        playbackView: true,
      },
    },
  );

  assert.equal(staticInsideProvider, outsideProvider);
  assert.match(synchronized, /value at 2027-05-02: 20/);
  assert.doesNotMatch(synchronized, /value at 2027-05-01: 10/);
  assert.doesNotMatch(synchronized, /value at 2027-05-03: 30/);
});

test("one playback timer advances, pauses on invisibility, and cleans every resource", () => {
  const calls = [];
  const intervals = new Map();
  let nextId = 1;
  const scheduler = {
    setInterval(callback, delay) {
      const id = nextId++;
      intervals.set(id, callback);
      calls.push(`set:${delay}`);
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
      calls.push(`clear:${id}`);
    },
  };
  const listeners = new Map();
  const documentTarget = {
    hidden: false,
    addEventListener(type, listener) {
      listeners.set(type, listener);
      calls.push(`listen:${type}`);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
      calls.push(`remove:${type}`);
    },
  };
  const dispatched = [];

  const cleanup = createPlaybackTimer({
    playing: true,
    playbackView: true,
    clockLength: 3,
    speed: 2,
    activeIndex: 0,
    dispatch: (action) => dispatched.push(action),
    documentTarget,
    scheduler,
  });
  [...intervals.values()][0]();
  documentTarget.hidden = true;
  listeners.get("visibilitychange")();
  cleanup();

  assert.deepEqual(calls, [
    "set:500",
    "listen:visibilitychange",
    "clear:1",
    "remove:visibilitychange",
  ]);
  assert.deepEqual(dispatched, [
    { type: "tick", clockLength: 3 },
    { type: "pause" },
  ]);
  assert.equal(intervals.size, 0);
  assert.equal(listeners.size, 0);
});

test("reduced motion never starts playback automatically but deliberate play remains available", () => {
  const media = { matches: true };
  const matchMedia = (query) => {
    assert.equal(query, "(prefers-reduced-motion: reduce)");
    return media;
  };
  let timerCount = 0;
  const scheduler = {
    setInterval() {
      timerCount += 1;
      return timerCount;
    },
    clearInterval() {},
  };

  assert.equal(prefersReducedMotion(matchMedia), true);
  const idleCleanup = createPlaybackTimer({
    playing: false,
    playbackView: true,
    clockLength: 3,
    speed: 1,
    activeIndex: 0,
    dispatch() {},
    scheduler,
  });
  assert.equal(timerCount, 0);
  idleCleanup();

  const deliberateCleanup = createPlaybackTimer({
    playing: true,
    playbackView: true,
    clockLength: 3,
    speed: 1,
    activeIndex: 0,
    dispatch() {},
    scheduler,
  });
  assert.equal(timerCount, 1);
  deliberateCleanup();
});

function renderPlayback(child, overrides = {}) {
  const fixture = playbackFixture();
  return renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      { ...fixture, ...overrides },
      child,
    ),
  );
}

function playbackFixture() {
  const rows = [
    { observed: "2027-05-01", cases: 10 },
    { observed: "2027-05-02", cases: 20 },
    { observed: "2027-05-03", cases: 30 },
  ];
  const chart = lineChart();
  return {
    groups: [{
      id: "exercise",
      name: "Exercise timeline",
      primaryClock: { sourceId: "primary", timeField: "observed" },
      matching: { policy: "exact" },
      members: [{ chartId: chart.id, timeRole: "observation" }],
    }],
    charts: [chart],
    loadedData: { primary: rows },
    profiles: { primary: temporalProfile(rows) },
  };
}

function lineChart(overrides = {}) {
  const interaction = overrides.interaction ?? {
    zoom: { enabled: false },
    timeSync: { groupId: "exercise", policy: "exact" },
  };
  return {
    id: "primary-chart",
    typeId: "line",
    title: "Cases over time",
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
    ...overrides,
    interaction,
  };
}

function temporalProfile(rows) {
  return profileDataset(rows, {
    observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
  });
}
