import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import {
  initialPlaybackState,
  reducePlaybackState,
} from "../src/charting/time/playbackReducer.js";

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
  const closedView = renderPlayback(
    React.createElement(PlaybackControls),
    {
      initialState: {
        activeGroupId: "exercise",
        activeIndex: 0,
        playing: false,
        speed: 1,
        playbackView: false,
      },
    },
  );

  assert.match(noGroup, /aria-label="Play synchronized charts"[^>]*disabled/);
  assert.match(noGroup, /No playback group is available/);
  assert.match(atStart, /aria-label="Previous time"[^>]*disabled/);
  assert.match(atEnd, /aria-label="Play synchronized charts"[^>]*disabled/);
  assert.match(atEnd, /aria-label="Next time"[^>]*disabled/);
  assert.match(closedView, /aria-label="Play synchronized charts"[^>]*disabled/);
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

test("a live provider can initialize paused synchronized charts at the latest group time", () => {
  function Probe() {
    const playback = usePlayback();
    return React.createElement("output", null, [
      playback.activeIndex,
      playback.activeEpochMs,
      playback.playing ? "playing" : "paused",
    ].join("|"));
  }

  const html = renderPlayback(React.createElement(Probe), {
    initialPosition: "latest",
  });

  assert.equal(html, `<output>2|${MAY_3}|paused</output>`);
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

test("closing playback removes chart time context and restores static line and latest choropleth rendering", () => {
  const fixture = playbackFixture();
  const chart = fixture.charts[0];
  const chartProps = {
    chart,
    rows: fixture.loadedData.primary,
    datasetProfile: fixture.profiles.primary,
  };
  const outsideProvider = renderToStaticMarkup(
    React.createElement(ChartView, chartProps),
  );

  function ContextProbe() {
    const playback = usePlayback();
    return React.createElement("output", null, [
      playback.timeContext === null ? "no-group-context" : "group-context",
      playback.timeContextForChart(chart.id) === null
        ? "no-chart-context"
        : "chart-context",
    ].join("|"));
  }

  const closedLine = renderPlayback(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(ContextProbe),
      React.createElement(ChartView, chartProps),
    ),
    {
      initialState: {
        activeGroupId: "exercise",
        activeIndex: 1,
        playing: false,
        speed: 1,
        playbackView: false,
      },
    },
  );

  assert.match(outsideProvider, /at 2027-05-01: 10/);
  assert.match(outsideProvider, /at 2027-05-03: 30/);
  assert.match(closedLine, /no-group-context\|no-chart-context/);
  assert.match(closedLine, /at 2027-05-01: 10/);
  assert.match(closedLine, /at 2027-05-03: 30/);

  const geographyRows = [
    { observed: "2027-05-01", area: "A", cases: 10 },
    { observed: "2027-05-03", area: "A", cases: 30 },
  ];
  const geographyChart = chronoChoroplethChart();
  const geographyProfile = temporalProfile(geographyRows);
  const geographyGroup = {
    id: "exercise",
    name: "Exercise timeline",
    primaryClock: { sourceId: "primary", timeField: "observed" },
    matching: { policy: "exact" },
    members: [{ chartId: geographyChart.id, timeRole: "time" }],
  };
  const closedChoropleth = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups: [geographyGroup],
        charts: [geographyChart],
        loadedData: { primary: geographyRows },
        profiles: { primary: geographyProfile },
        initialState: {
          activeGroupId: "exercise",
          activeIndex: 0,
          playing: false,
          speed: 1,
          playbackView: false,
        },
      },
      React.createElement(ChartView, {
        chart: geographyChart,
        rows: geographyRows,
        datasetProfile: geographyProfile,
        geoData: oneAreaGeoJson(),
      }),
    ),
  );
  assert.match(closedChoropleth, /2027-05-03/);
  assert.doesNotMatch(closedChoropleth, /2027-05-01/);

  const atSecondTime = {
    ...initialPlaybackState,
    activeGroupId: "exercise",
    activeIndex: 1,
    playbackView: true,
  };
  const reopened = reducePlaybackState(
    reducePlaybackState(atSecondTime, { type: "closeView" }),
    { type: "openView" },
  );
  assert.equal(reopened.activeIndex, 1);
  assert.equal(reopened.playbackView, true);
});

test("group matching defaults reach ChartView and disclose carried card provenance", () => {
  const primaryRows = [
    { observed: "2027-05-01", cases: 1 },
    { observed: "2027-05-02", cases: 2 },
    { observed: "2027-05-03", cases: 3 },
  ];
  const sparseRows = [
    { observed: "2027-05-01", value: 10 },
    { observed: "2027-05-03", value: 30 },
  ];
  const chart = kpiChart();
  const html = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups: [{
          id: "exercise",
          name: "Exercise timeline",
          primaryClock: { sourceId: "primary", timeField: "observed" },
          matching: { policy: "lastKnown" },
          members: [{ chartId: chart.id, timeRole: "time" }],
        }],
        charts: [chart],
        loadedData: { primary: primaryRows, sparse: sparseRows },
        profiles: {
          primary: temporalProfile(primaryRows),
          sparse: temporalProfile(sparseRows),
        },
        initialState: {
          activeGroupId: "exercise",
          activeIndex: 1,
          playing: false,
          speed: 1,
          playbackView: true,
        },
      },
      React.createElement(ChartView, {
        chart,
        rows: sparseRows,
        datasetProfile: temporalProfile(sparseRows),
      }),
    ),
  );

  assert.match(html, /<dt>Value<\/dt><dd>10<\/dd>/);
  assert.match(html, /<dt>Playback time<\/dt><dd>2027-05-02<\/dd>/);
  assert.match(html, /Last measured 2027-05-01/);
  assert.doesNotMatch(html, /No measurement at this time/);
});

test("member matching overrides carry validated interpolation permission into ChartView", () => {
  const primaryRows = [
    { observed: "2027-05-01", cases: 1 },
    { observed: "2027-05-02", cases: 2 },
    { observed: "2027-05-03", cases: 3 },
  ];
  const sparseRows = [
    { observed: "2027-05-01", value: 10 },
    { observed: "2027-05-03", value: 30 },
  ];
  const chart = kpiChart({
    roles: {
      value: { field: "value", interpolationAllowed: true },
      time: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
  });
  const sparseProfile = temporalProfile(sparseRows, ["value"]);
  const html = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups: [{
          id: "exercise",
          name: "Exercise timeline",
          primaryClock: { sourceId: "primary", timeField: "observed" },
          matching: { policy: "exact" },
          members: [{
            chartId: chart.id,
            timeRole: "time",
            matching: { policy: "interpolate" },
          }],
        }],
        charts: [chart],
        loadedData: { primary: primaryRows, sparse: sparseRows },
        profiles: {
          primary: temporalProfile(primaryRows),
          sparse: sparseProfile,
        },
        initialState: {
          activeGroupId: "exercise",
          activeIndex: 1,
          playing: false,
          speed: 1,
          playbackView: true,
        },
      },
      React.createElement(ChartView, {
        chart,
        rows: sparseRows,
        datasetProfile: sparseProfile,
      }),
    ),
  );

  assert.match(html, /<dt>Value<\/dt><dd>20<\/dd>/);
  assert.match(html, /Interpolated between 2027-05-01 and 2027-05-03/);
  assert.doesNotMatch(html, /No measurement at this time/);
});

test("the provider exposes stopped playback when an initial clock state cannot advance", () => {
  function PlayingProbe() {
    return React.createElement(
      "output",
      null,
      usePlayback().playing ? "playing" : "stopped",
    );
  }

  const atEnd = renderPlayback(React.createElement(PlayingProbe), {
    initialState: {
      activeGroupId: "exercise",
      activeIndex: 2,
      playing: true,
      speed: 1,
      playbackView: true,
    },
  });
  const closed = renderPlayback(React.createElement(PlayingProbe), {
    initialState: {
      activeGroupId: "exercise",
      activeIndex: 0,
      playing: true,
      speed: 1,
      playbackView: false,
    },
  });

  assert.equal(atEnd, "<output>stopped</output>");
  assert.equal(closed, "<output>stopped</output>");
});

test("ChartView announces an active trace point beyond the 50-row accessibility cap", () => {
  const rows = Array.from({ length: 51 }, (_, index) => ({
    observed: new Date(MAY_1 + (index * 86_400_000)).toISOString().slice(0, 10),
    cases: index + 1,
  }));
  const chart = lineChart();
  const fixture = {
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
  const html = renderPlayback(
    React.createElement(ChartView, {
      chart,
      rows,
      datasetProfile: fixture.profiles.primary,
    }),
    {
      ...fixture,
      initialState: {
        activeGroupId: "exercise",
        activeIndex: 50,
        playing: false,
        speed: 1,
        playbackView: true,
      },
    },
  );

  assert.match(html, /value at 2027-06-20: 51/);
  assert.doesNotMatch(html, /value at 2027-05-01: 1/);
});

test("timeline and swimlane playback companions announce only active events", () => {
  const rows = [
    { event: "Mobilize", start: "2027-05-01", end: "2027-05-01", lane: "Ops", status: "Planned" },
    { event: "Activate", start: "2027-05-02", end: "2027-05-02", lane: "Ops", status: "Active" },
    { event: "Demobilize", start: "2027-05-03", end: "2027-05-03", lane: "Ops", status: "Done" },
  ];
  const profile = profileDataset(rows, {
    start: { interpretation: "temporal", format: "YYYY-MM-DD" },
    end: { interpretation: "temporal", format: "YYYY-MM-DD" },
  });

  for (const typeId of ["timeline", "swimlane"]) {
    const chart = timelineChart(typeId);
    const html = renderPlayback(
      React.createElement(ChartView, {
        chart,
        rows,
        datasetProfile: profile,
      }),
      {
        groups: [{
          id: "exercise",
          name: "Exercise timeline",
          primaryClock: { sourceId: "primary", timeField: "start" },
          matching: { policy: "exact" },
          members: [{ chartId: chart.id, timeRole: "start" }],
        }],
        charts: [chart],
        loadedData: { primary: rows },
        profiles: { primary: profile },
        initialState: {
          activeGroupId: "exercise",
          activeIndex: 1,
          playing: false,
          speed: 1,
          playbackView: true,
        },
      },
    );

    assert.match(html, /Activate starts 2027-05-02, state Active/);
    assert.doesNotMatch(html, /Mobilize/);
    assert.doesNotMatch(html, /Demobilize/);
  }
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

test("an initially hidden playback timer pauses without allocating resources", () => {
  const calls = [];
  const scheduler = {
    setInterval() {
      calls.push("set");
      return 1;
    },
    clearInterval() {
      calls.push("clear");
    },
  };
  const documentTarget = {
    hidden: true,
    addEventListener() {
      calls.push("listen");
    },
    removeEventListener() {
      calls.push("remove");
    },
  };
  const dispatched = [];

  const cleanup = createPlaybackTimer({
    playing: true,
    playbackView: true,
    clockLength: 3,
    speed: 1,
    activeIndex: 0,
    dispatch: (action) => dispatched.push(action),
    documentTarget,
    scheduler,
  });
  cleanup();

  assert.deepEqual(dispatched, [{ type: "pause" }]);
  assert.deepEqual(calls, []);
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
    timeSync: { groupId: "exercise" },
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

function kpiChart(overrides = {}) {
  const interaction = overrides.interaction ?? {
    zoom: { enabled: false },
    timeSync: { groupId: "exercise" },
  };
  return {
    id: "sparse-kpi",
    typeId: "kpi",
    title: "Sparse status",
    sourceId: "sparse",
    roles: {
      value: { field: "value" },
      time: {
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

function timelineChart(typeId) {
  return {
    id: `${typeId}-chart`,
    typeId,
    title: `${typeId} events`,
    sourceId: "primary",
    roles: {
      event: { field: "event" },
      start: {
        field: "start",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
      end: {
        field: "end",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
      lane: { field: "lane" },
      status: { field: "status" },
    },
    presentation: { collection: null, labels: null, accessibility: null },
    interaction: {
      zoom: { enabled: false },
      timeSync: { groupId: "exercise" },
    },
  };
}

function chronoChoroplethChart() {
  return {
    id: "chrono-map",
    typeId: "chronoChoroplethMap",
    title: "Cases by area",
    sourceId: "primary",
    roles: {
      geography: { field: "area" },
      value: { field: "cases" },
      time: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    transformations: {
      filters: [],
      grouping: null,
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
    },
    presentation: {
      collection: null,
      labels: { visible: true },
      map: {
        geoSource: "areas",
        joinField: "id",
        scale: "sequential",
      },
    },
    interaction: {
      zoom: { enabled: true },
      timeSync: { groupId: "exercise" },
    },
  };
}

function oneAreaGeoJson() {
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: "A",
      properties: { id: "A" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ]],
      },
    }],
  };
}

function temporalProfile(rows, interpolationFields = []) {
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
  });
  for (const field of interpolationFields) {
    profile.columns.find(({ name }) => name === field).interpolationAllowed = true;
  }
  return profile;
}
