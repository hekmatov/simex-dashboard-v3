import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import {
  canReuseChartRendering,
  resolveChartRendering,
} from "../src/charting/rendering/resolveChartRendering.js";
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
  buildMemberTimeContexts,
  createPlaybackTimer,
  dispatchPlaybackAction,
  prefersReducedMotion,
  useOptionalPlayback,
  usePlayback,
} = await import("../src/components/playback/PlaybackProvider.jsx");
const { default: PlaybackControls } = await import("../src/components/playback/PlaybackControls.jsx");
const { default: PlaybackSurface } = await import("../src/components/playback/PlaybackSurface.jsx");
const { default: PlaybackView } = await import("../src/components/playback/PlaybackView.jsx");
const { default: ChronoController } = await import("../src/components/playback/ChronoController.jsx");
const { default: ChartView } = await import("../src/components/charts/ChartView.jsx");

const MAY_1 = Date.UTC(2027, 4, 1);
const MAY_2 = Date.UTC(2027, 4, 2);
const MAY_3 = Date.UTC(2027, 4, 3);

test("View Chrono reducer owns source, scope, trace, matching, availability, and placement", () => {
  const group = reducePlaybackState(initialPlaybackState, {
    type: "setGroup",
    groupId: "exercise",
    period: { start: MAY_1, end: MAY_3 },
  });
  assert.deepEqual(group.source, { kind: "group", id: "exercise" });
  assert.deepEqual(group.period, { start: MAY_1, end: MAY_3 });
  assert.equal(group.playing, false);

  const scene = reducePlaybackState(group, {
    type: "setScene",
    sceneId: "scene-a",
    period: { start: MAY_2, end: MAY_3 },
  });
  assert.deepEqual(scene.source, { kind: "scene", id: "scene-a" });
  assert.equal(scene.activeSceneId, "scene-a");

  const scoped = reducePlaybackState(scene, { type: "setScope", scope: "group-only" });
  const matched = reducePlaybackState(scoped, { type: "setMatchingOverride", policy: "closest" });
  const traced = reducePlaybackState(matched, { type: "setTraceMode", mode: "full" });
  const available = reducePlaybackState(traced, { type: "toggleAvailability" });
  const moved = reducePlaybackState(available, { type: "moveController", placement: "mast" });
  assert.equal(moved.scope, "group-only");
  assert.equal(moved.matchingOverride, "closest");
  assert.equal(moved.traceMode, "full");
  assert.equal(moved.availabilityVisible, true);
  assert.equal(moved.placement, "mast");
  assert.equal(moved.activeIndex, group.activeIndex);
});

test("View Chrono safety-pauses all consequential session changes", () => {
  const playing = {
    ...initialPlaybackState,
    playbackView: true,
    playing: true,
    activeIndex: 1,
    frameIndex: 1,
    connection: "connected",
  };
  for (const action of [
    { type: "seek", index: 2, clockLength: 4 },
    { type: "previous", clockLength: 4 },
    { type: "next", clockLength: 4 },
    { type: "setScope", scope: "all-page" },
    { type: "setMatchingOverride", policy: "authored" },
    { type: "setTraceMode", mode: "reveal" },
    { type: "navigate" },
    { type: "documentHidden" },
    { type: "modeExit" },
    { type: "blackout", active: true },
    { type: "connectionLost" },
    { type: "reconnected" },
    { type: "end", clockLength: 4 },
  ]) {
    assert.equal(reducePlaybackState(playing, action).playing, false, action.type);
  }
  assert.equal(reducePlaybackState(playing, { type: "connectionLost" }).connection, "lost");
  assert.equal(reducePlaybackState(playing, { type: "reconnected" }).connection, "connected");
});

test("reduced motion prevents automatic Chrono play", () => {
  const state = {
    ...initialPlaybackState,
    playbackView: true,
    reducedMotion: true,
  };
  assert.equal(reducePlaybackState(state, {
    type: "play",
    clockLength: 3,
    automatic: true,
  }).playing, false);
});

test("View Chrono exposes group and Scene sources with viewer-only controls", () => {
  const html = renderPlayback(React.createElement(ChronoController), {
    scenes: [{
      id: "scene-a",
      name: "First operational picture",
      groupId: "exercise",
      pageId: "overview",
      period: { start: "2027-05-01T00:00:00.000Z", end: "2027-05-03T00:00:00.000Z" },
      members: [{ chartId: "primary-chart", width: 4 }],
      frames: { mode: "source", chartId: "primary-chart", selection: "all" },
    }],
    initialState: {
      ...initialPlaybackState,
      activeGroupId: "exercise",
      playbackView: true,
    },
  });

  assert.match(html, /aria-label="Chrono source"/);
  assert.match(html, />Default page timeline</);
  assert.match(html, />Exercise timeline</);
  assert.match(html, />First operational picture</);
  assert.match(html, /aria-label="Chrono chart scope"/);
  assert.match(html, />All page charts</);
  assert.match(html, />Group only</);
  assert.match(html, /aria-label="Chrono matching policy"/);
  assert.match(html, />Use authored settings</);
  assert.match(html, />Concurrent only</);
  assert.match(html, />Interpolate</);
  assert.match(html, />Snap to Latest</);
  assert.match(html, />Snap to Closest</);
  assert.match(html, /aria-label="Chrono trace behavior"/);
  assert.match(html, />Reveal to frame</);
  assert.match(html, />Full timeline</);
  assert.match(html, /aria-label="Show availability information"/);
  assert.match(html, /aria-label="Move Chrono controls to mast"/);
  assert.doesNotMatch(html, /Save Scene|Edit Chrono Group|Build/);
});

test("Scene selection constrains the playback clock and participating charts", () => {
  function Probe() {
    const playback = usePlayback();
    return React.createElement("output", null, JSON.stringify({
      activeScene: playback.activeScene?.id ?? null,
      clock: playback.clock,
      charts: playback.participatingChartIds,
    }));
  }
  const html = renderPlayback(React.createElement(Probe), {
    scenes: [{
      id: "scene-a",
      name: "First operational picture",
      groupId: "exercise",
      pageId: "overview",
      period: { start: "2027-05-02T00:00:00.000Z", end: "2027-05-03T00:00:00.000Z" },
      members: [{ chartId: "primary-chart", width: 4 }],
      frames: {
        mode: "source",
        chartId: "primary-chart",
        selection: "selected",
        selectedEpochs: [MAY_2, MAY_3],
      },
    }],
    initialState: {
      ...initialPlaybackState,
      activeGroupId: "exercise",
      activeSceneId: "scene-a",
      source: { kind: "scene", id: "scene-a" },
      playbackView: true,
    },
  });

  assert.equal(html, `<output>{&quot;activeScene&quot;:&quot;scene-a&quot;,&quot;clock&quot;:[${MAY_2},${MAY_3}],&quot;charts&quot;:[&quot;primary-chart&quot;]}</output>`);
});

test("Snap to Closest session override supplies a bounded renderer tolerance", () => {
  const contexts = buildMemberTimeContexts({
    id: "exercise",
    matching: { policy: "exact" },
    members: [{ chartId: "primary-chart", timeRole: "observation" }],
  }, MAY_2, { sessionMatchingOverride: "closest" });

  assert.deepEqual(contexts["primary-chart"].matching, {
    policy: "nearest",
    toleranceMs: Number.MAX_SAFE_INTEGER,
  });
});

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
  assert.match(html, /<select[^>]*aria-label="Seconds per frame"/);
  assert.match(html, /<span class="visually-hidden">Seconds per frame<\/span>/);
  assert.match(html, />1 seconds</);
  assert.match(html, />2\.5 seconds</);
  assert.match(html, />5 seconds</);
  assert.match(html, /2027-05-02/);
  assert.match(html, />1 seconds</);
  assert.match(html, /aria-label="Close playback view"/);
  assert.match(html, /aria-live="polite"/);
});

test("playback surface mounts the special view only while playback view is open", () => {
  const closed = renderPlayback(
    React.createElement(
      PlaybackSurface,
      null,
      React.createElement("div", { "data-static-dashboard": "true" }),
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
  const open = renderPlayback(
    React.createElement(
      PlaybackSurface,
      null,
      React.createElement("div", { "data-static-dashboard": "true" }),
    ),
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

  assert.match(closed, /aria-label="Open playback view"/);
  assert.match(closed, /data-static-dashboard="true"/);
  assert.doesNotMatch(closed, /class="playback-view"/);
  assert.match(open, /aria-label="Close playback view"/);
  assert.match(open, /class="playback-view"/);
  assert.match(open, /data-chart-id="primary-chart"/);
  assert.doesNotMatch(open, /data-static-dashboard="true"/);
});

test("playback entry is disabled with associated guidance while chart authoring is active", () => {
  const blocked = renderPlayback(
    React.createElement(
      PlaybackSurface,
      {
        entryBlocked: true,
        entryBlockedReason:
          "Finish, save, or discard chart authoring before opening Playback view.",
      },
      React.createElement("div", { "data-static-dashboard": "true" }),
    ),
  );
  const unblocked = renderPlayback(
    React.createElement(
      PlaybackSurface,
      null,
      React.createElement("div", { "data-static-dashboard": "true" }),
    ),
  );
  const alreadyOpen = renderPlayback(
    React.createElement(
      PlaybackSurface,
      {
        entryBlocked: true,
        entryBlockedReason:
          "Finish, save, or discard chart authoring before opening Playback view.",
      },
      React.createElement("div", { "data-static-dashboard": "true" }),
    ),
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

  const blockedEntry = buttonMarkupByAriaLabel(blocked, "Open playback view");
  assert.match(blockedEntry, /aria-describedby="playback-entry-blocked-reason"/);
  assert.match(blockedEntry, /disabled=""/);
  assert.match(
    blocked,
    /id="playback-entry-blocked-reason"[^>]*>Finish, save, or discard chart authoring before opening Playback view\./,
  );
  assert.match(blocked, /data-static-dashboard="true"/);
  assert.doesNotMatch(unblocked, /playback-entry-blocked-reason/);
  assert.doesNotMatch(
    buttonMarkupByAriaLabel(unblocked, "Open playback view"),
    /disabled=""/,
  );
  assert.doesNotMatch(
    buttonMarkupByAriaLabel(alreadyOpen, "Close playback view"),
    /disabled=""/,
  );
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

  assert.match(buttonMarkupByAriaLabel(noGroup, "Play synchronized charts"), /disabled=""/);
  assert.match(noGroup, /No playback times are available for Default page timeline/);
  assert.match(buttonMarkupByAriaLabel(atStart, "Previous time"), /disabled=""/);
  assert.match(buttonMarkupByAriaLabel(atEnd, "Play synchronized charts"), /disabled=""/);
  assert.match(buttonMarkupByAriaLabel(atEnd, "Next time"), /disabled=""/);
  assert.match(buttonMarkupByAriaLabel(closedView, "Play synchronized charts"), /disabled=""/);
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
    initialState: {
      playbackView: true,
    },
  });

  assert.equal(html, `<output>2|${MAY_3}|paused</output>`);
});

test("the provider evaluates the inclusive Chrono Group period in the dashboard timezone", () => {
  const rows = [
    { observed: "2027-05-02T03:59:59.000Z", cases: 10 },
    { observed: "2027-05-02T04:00:00.000Z", cases: 20 },
  ];
  const chart = lineChart({
    id: "timezone-chart",
    sourceId: "timezone-source",
    roles: {
      measurements: { field: "cases" },
      observation: {
        field: "observed",
        interpretation: "temporal",
        format: "ISO-8601",
      },
    },
  });
  function Probe() {
    return React.createElement("output", null, usePlayback().clock.join(","));
  }
  const html = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups: [{
          id: "exercise",
          name: "Exercise timeline",
          period: { start: "2027-05-01", end: "2027-05-01" },
          secondsPerFrame: 1,
          matching: { policy: "exact" },
          members: [{ chartId: chart.id, timeRole: "observation" }],
        }],
        charts: [chart],
        loadedData: { "timezone-source": rows },
        profiles: {
          "timezone-source": profileDataset(rows, {
            observed: { interpretation: "temporal", format: "ISO-8601" },
          }),
        },
        timezone: "America/New_York",
        initialState: {
          activeGroupId: "exercise",
          source: { kind: "group", id: "exercise" },
          playbackView: true,
        },
      },
      React.createElement(Probe),
    ),
  );

  assert.equal(html, `<output>${Date.UTC(2027, 4, 2, 3, 59, 59)}</output>`);
});

test("the provider initializes playback cadence from the active Chrono Group", () => {
  function Probe() {
    return React.createElement("output", null, usePlayback().speed);
  }
  const fixture = playbackFixture();
  const html = renderPlayback(React.createElement(Probe), {
    ...fixture,
    groups: [{ ...fixture.groups[0], secondsPerFrame: 2.5 }],
    initialState: {
      activeGroupId: "exercise",
      source: { kind: "group", id: "exercise" },
    },
  });

  assert.equal(html, "<output>2.5</output>");
});

test("switching Chrono Groups dispatches the selected group's saved cadence", () => {
  assert.equal(
    typeof dispatchPlaybackAction,
    "function",
    "dispatchPlaybackAction must mediate group cadence changes",
  );
  const dispatched = [];
  dispatchPlaybackAction(
    (action) => dispatched.push(action),
    { type: "setGroup", groupId: "slow" },
    {
      activeGroupId: "exercise",
      groups: [
        { id: "exercise", secondsPerFrame: 1 },
        { id: "slow", secondsPerFrame: 5 },
      ],
    },
  );

  assert.deepEqual(dispatched, [
    { type: "setGroup", groupId: "slow" },
    { type: "setSpeed", speed: 5 },
  ]);
});

test("redispatching the active Chrono Group preserves its user cadence override", () => {
  const dispatched = [];
  dispatchPlaybackAction(
    (action) => dispatched.push(action),
    { type: "setGroup", groupId: "exercise" },
    {
      activeGroupId: "exercise",
      groups: [{ id: "exercise", secondsPerFrame: 1 }],
    },
  );

  assert.deepEqual(dispatched, [
    { type: "setGroup", groupId: "exercise" },
  ]);
});

test("presentation can derive immutable member time contexts without mounting playback", () => {
  assert.equal(
    typeof buildMemberTimeContexts,
    "function",
    "buildMemberTimeContexts must be exported for the audience display",
  );
  const contexts = buildMemberTimeContexts({
    id: "exercise",
    matching: { policy: "exact" },
    members: [
      { chartId: "primary-chart", timeRole: "observation" },
      {
        chartId: "secondary-chart",
        timeRole: "observation",
        matching: { policy: "lastKnown", toleranceMs: 86_400_000 },
      },
    ],
  }, MAY_2);

  assert.equal(Object.isFrozen(contexts), true);
  assert.deepEqual(contexts["primary-chart"], {
    groupId: "exercise",
    activeEpochMs: MAY_2,
    matching: { policy: "exact" },
  });
  assert.deepEqual(contexts["secondary-chart"], {
    groupId: "exercise",
    activeEpochMs: MAY_2,
    matching: { policy: "lastKnown", toleranceMs: 86_400_000 },
  });
});

test("closed Chrono does not scan temporal rows until playback opens", () => {
  function countedFixture(playbackView) {
    let reads = 0;
    const row = { cases: 10 };
    Object.defineProperty(row, "observed", {
      enumerable: true,
      get() {
        reads += 1;
        return "2027-05-01";
      },
    });
    const chart = lineChart();
    return {
      props: {
        groups: [{
          id: "exercise",
          name: "Exercise timeline",
          period: { start: "2027-05-01", end: "2027-05-01" },
          secondsPerFrame: 1,
          matching: { policy: "exact" },
          members: [{ chartId: chart.id, timeRole: "observation" }],
        }],
        charts: [chart],
        pageCharts: [chart],
        loadedData: { primary: [row] },
        profiles: {
          primary: {
            rowCount: 1,
            columns: [
              {
                name: "observed",
                type: "temporal",
                temporal: {
                  values: ["2027-05-01"],
                  diagnostics: [],
                  parsingMetadata: {
                    interpretation: "temporal",
                    format: "YYYY-MM-DD",
                    timezone: "date-only",
                  },
                },
              },
              { name: "cases", type: "numeric" },
            ],
          },
        },
        initialState: {
          ...initialPlaybackState,
          source: { kind: "default", id: null },
          activeGroupId: "exercise",
          playbackView,
        },
      },
      reads: () => reads,
    };
  }

  const closed = countedFixture(false);
  renderToStaticMarkup(React.createElement(
    PlaybackProvider,
    closed.props,
    React.createElement("output", null, "closed"),
  ));
  assert.equal(closed.reads(), 0);

  const open = countedFixture(true);
  renderToStaticMarkup(React.createElement(
    PlaybackProvider,
    open.props,
    React.createElement("output", null, "open"),
  ));
  assert.ok(open.reads() > 0);
});

test("Default page timeline uses every page chart instead of the active Chrono Group ledger", () => {
  const memberRows = [
    { observed: "2027-05-01", cases: 10 },
    { observed: "2027-05-03", cases: 30 },
  ];
  const ordinaryRows = [{ observed: "2027-05-02", cases: 20 }];
  const member = lineChart({ id: "page-member", sourceId: "member-source" });
  const ordinary = lineChart({ id: "page-ordinary", sourceId: "ordinary-source" });
  const html = renderPlaybackProbe({
    groups: [{
      id: "exercise",
      name: "Exercise timeline",
      period: { start: "2027-05-01", end: "2027-05-03" },
      secondsPerFrame: 1,
      matching: { policy: "exact" },
      members: [{ chartId: member.id, timeRole: "observation" }],
    }],
    charts: [member, ordinary],
    loadedData: {
      "member-source": memberRows,
      "ordinary-source": ordinaryRows,
    },
    profiles: {
      "member-source": temporalProfile(memberRows),
      "ordinary-source": temporalProfile(ordinaryRows),
    },
    initialState: {
      ...initialPlaybackState,
      source: { kind: "default", id: null },
      activeGroupId: "exercise",
      playbackView: true,
    },
  });

  assert.equal(html, `<output>{&quot;clock&quot;:[${MAY_1},${MAY_2},${MAY_3}],&quot;charts&quot;:[&quot;page-member&quot;,&quot;page-ordinary&quot;]}</output>`);
});

test("All page charts and Group only project different participating chart sets", () => {
  const rows = [
    { observed: "2027-05-01", cases: 10 },
    { observed: "2027-05-02", cases: 20 },
  ];
  const member = lineChart({ id: "scope-member" });
  const ordinary = lineChart({ id: "scope-ordinary" });
  const base = {
    groups: [{
      id: "exercise",
      name: "Exercise timeline",
      period: { start: "2027-05-01", end: "2027-05-03" },
      secondsPerFrame: 1,
      matching: { policy: "exact" },
      members: [{ chartId: member.id, timeRole: "observation" }],
    }],
    charts: [member, ordinary],
    loadedData: { primary: rows },
    profiles: { primary: temporalProfile(rows) },
  };

  const allPage = renderPlaybackProbe({
    ...base,
    initialState: {
      ...initialPlaybackState,
      source: { kind: "group", id: "exercise" },
      activeGroupId: "exercise",
      scope: "all-page",
      playbackView: true,
    },
  });
  const groupOnly = renderPlaybackProbe({
    ...base,
    initialState: {
      ...initialPlaybackState,
      source: { kind: "group", id: "exercise" },
      activeGroupId: "exercise",
      scope: "group-only",
      playbackView: true,
    },
  });
  const allPageView = renderToStaticMarkup(React.createElement(
    PlaybackProvider,
    {
      ...base,
      initialState: {
        ...initialPlaybackState,
        source: { kind: "group", id: "exercise" },
        activeGroupId: "exercise",
        scope: "all-page",
        playbackView: true,
      },
    },
    React.createElement(PlaybackView),
  ));

  assert.match(allPageView, /data-chart-id="scope-member"/);
  assert.match(allPageView, /data-chart-id="scope-ordinary"/);
  assert.match(allPage, /&quot;charts&quot;:\[&quot;scope-member&quot;,&quot;scope-ordinary&quot;\]/);
  assert.match(groupOnly, /&quot;charts&quot;:\[&quot;scope-member&quot;\]/);
});

test("page projection does not narrow dashboard-wide group validation authority", () => {
  const rows = [{ observed: "2027-05-01", cases: 10 }];
  const pageChart = lineChart({ id: "page-chart", sourceId: "page-source" });
  const otherPageChart = lineChart({ id: "other-page-chart", sourceId: "other-source" });
  const html = renderPlaybackProbe({
    groups: [{
      id: "cross-page-group",
      name: "Cross page group",
      period: { start: "2027-05-01", end: "2027-05-01" },
      secondsPerFrame: 1,
      matching: { policy: "exact" },
      members: [
        { chartId: pageChart.id, timeRole: "observation" },
        { chartId: otherPageChart.id, timeRole: "observation" },
      ],
    }],
    charts: [pageChart, otherPageChart],
    pageCharts: [pageChart],
    loadedData: { "page-source": rows, "other-source": rows },
    profiles: {
      "page-source": temporalProfile(rows),
      "other-source": temporalProfile(rows),
    },
    initialState: {
      ...initialPlaybackState,
      source: { kind: "default", id: null },
      scope: "all-page",
      playbackView: true,
    },
  });

  assert.match(html, /&quot;charts&quot;:\[&quot;page-chart&quot;\]/);
  assert.doesNotMatch(html, /other-page-chart/);
});

test("Group-only and Scene participation stay on the active page", () => {
  const rows = [{ observed: "2027-05-01", cases: 10 }];
  const pageChart = lineChart({ id: "page-member", sourceId: "page-source" });
  const otherPageChart = lineChart({ id: "other-page-member", sourceId: "other-source" });
  const base = {
    groups: [{
      id: "cross-page-group",
      name: "Cross page group",
      period: { start: "2027-05-01", end: "2027-05-01" },
      secondsPerFrame: 1,
      matching: { policy: "exact" },
      members: [
        { chartId: pageChart.id, timeRole: "observation" },
        { chartId: otherPageChart.id, timeRole: "observation" },
      ],
    }],
    charts: [pageChart, otherPageChart],
    pageCharts: [pageChart],
    loadedData: { "page-source": rows, "other-source": rows },
    profiles: {
      "page-source": temporalProfile(rows),
      "other-source": temporalProfile(rows),
    },
  };
  const groupOnly = renderPlaybackProbe({
    ...base,
    initialState: {
      ...initialPlaybackState,
      source: { kind: "group", id: "cross-page-group" },
      activeGroupId: "cross-page-group",
      scope: "group-only",
      playbackView: true,
    },
  });
  const sceneOnly = renderPlaybackProbe({
    ...base,
    scenes: [{
      id: "cross-page-scene",
      name: "Cross page scene",
      groupId: "cross-page-group",
      pageId: "active-page",
      period: { start: "2027-05-01T00:00:00.000Z", end: "2027-05-01T23:59:59.999Z" },
      frames: { mode: "source", chartId: pageChart.id, selection: "all" },
      members: [
        { chartId: pageChart.id, width: 2 },
        { chartId: otherPageChart.id, width: 2 },
      ],
    }],
    initialState: {
      ...initialPlaybackState,
      source: { kind: "scene", id: "cross-page-scene" },
      activeGroupId: "cross-page-group",
      activeSceneId: "cross-page-scene",
      scope: "group-only",
      playbackView: true,
    },
  });

  assert.match(groupOnly, /&quot;charts&quot;:\[&quot;page-member&quot;\]/);
  assert.doesNotMatch(groupOnly, /other-page-member/);
  assert.match(sceneOnly, /&quot;charts&quot;:\[&quot;page-member&quot;\]/);
  assert.doesNotMatch(sceneOnly, /other-page-member/);
});

test("saved Scene source frames use only the live scene.frames Frame source", () => {
  const sourceRows = [
    { observed: "2027-05-01", cases: 10 },
    { observed: "2027-05-03", cases: 30 },
  ];
  const otherRows = [{ observed: "2027-05-02", cases: 20 }];
  const sourceChart = lineChart({ id: "scene-source", sourceId: "scene-source-data" });
  const otherChart = lineChart({ id: "scene-other", sourceId: "scene-other-data" });
  const html = renderPlaybackProbe(scenePlaybackFixture({
    sourceChart,
    otherChart,
    sourceRows,
    otherRows,
    frames: { mode: "source", chartId: sourceChart.id, selection: "all" },
  }));

  assert.equal(html, `<output>{&quot;clock&quot;:[${MAY_1},${MAY_3}],&quot;charts&quot;:[&quot;scene-source&quot;,&quot;scene-other&quot;]}</output>`);
});

test("saved Scene calendar frames generate the live scene.frames interval ledger", () => {
  const sourceRows = [
    { observed: "2027-05-01", cases: 10 },
    { observed: "2027-05-03", cases: 30 },
  ];
  const otherRows = [{ observed: "2027-05-03", cases: 30 }];
  const sourceChart = lineChart({ id: "calendar-source", sourceId: "calendar-source-data" });
  const otherChart = lineChart({ id: "calendar-other", sourceId: "calendar-other-data" });
  const html = renderPlaybackProbe(scenePlaybackFixture({
    sourceChart,
    otherChart,
    sourceRows,
    otherRows,
    frames: { mode: "calendar", interval: { value: 1, unit: "day" } },
  }));

  assert.equal(html, `<output>{&quot;clock&quot;:[${MAY_1},${MAY_2},${MAY_3}],&quot;charts&quot;:[&quot;calendar-source&quot;,&quot;calendar-other&quot;]}</output>`);
});

test("playback view renders Chrono Group members and explicit missing states", () => {
  const fixture = playbackFixture();
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
    ],
  };
  const html = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        ...fixture,
        groups: [group],
        charts: [...fixture.charts, missing, staticChart],
        loadedData: {
          ...fixture.loadedData,
          missing: [{ observed: "2027-05-01", cases: 4 }],
        },
        profiles: {
          ...fixture.profiles,
          missing: temporalProfile([{ observed: "2027-05-01", cases: 4 }]),
        },
        initialState: {
          activeGroupId: "exercise",
          source: { kind: "group", id: "exercise" },
          activeIndex: 1,
          playing: false,
          speed: 1,
          scope: "group-only",
          playbackView: true,
        },
      },
      React.createElement(PlaybackView, { accessibilityEnabled: true }),
    ),
  );

  assert.match(
    html,
    /2 participating charts\. 1 available; 1 unavailable\./,
  );
  assert.match(html, /No measurement at this time/);
  assert.match(
    html,
    /class="playback-member playback-member--unavailable" data-chart-id="missing-chart"/,
  );
  assert.match(html, /class="playback-member/);
  assert.doesNotMatch(html, /Static reference/);
  assert.doesNotMatch(html, /ineligible-static-chart/);
});

test("playback view resolves only the map chart's configured GeoJSON source", () => {
  const rows = [
    { observed: "2027-05-01", region: "A", value: 10 },
    { observed: "2027-05-02", region: "A", value: 20 },
  ];
  const chart = chronoChart();
  const group = {
    id: "exercise",
    name: "Exercise timeline",
    period: { start: "2027-05-01", end: "2027-05-02" },
    secondsPerFrame: 1,
    matching: { policy: "exact" },
    members: [{ chartId: chart.id, timeRole: "time" }],
  };
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
  });
  const geo = geoFixture("A");
  const render = (geoSource, loadedData) => renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups: [group],
        charts: [{
          ...chart,
          presentation: {
            ...chart.presentation,
            map: {
              ...chart.presentation.map,
              geoSource,
            },
          },
        }],
        loadedData: { "geo-values": rows, ...loadedData },
        profiles: { "geo-values": profile },
        initialState: {
          activeGroupId: "exercise",
          activeIndex: 1,
          playing: false,
          speed: 1,
          playbackView: true,
        },
      },
      React.createElement(PlaybackView, { accessibilityEnabled: true }),
    ),
  );

  const configured = render("configured-geo", {
    "configured-geo": geo,
    "unrelated-geo": geoFixture("WRONG"),
  });
  const missing = render("missing-configured-geo", {
    "unrelated-geo": geo,
  });

  assert.match(
    configured,
    /1 participating charts\. 1 available; 0 unavailable\./,
  );
  assert.doesNotMatch(configured, /playback-member--unavailable/);
  assert.match(configured, /A: 20 at 2027-05-02, joined/);
  assert.doesNotMatch(configured, /GeoJSON source/);
  assert.match(
    missing,
    /1 participating charts\. 0 available; 1 unavailable\./,
  );
  assert.match(
    missing,
    /class="playback-member playback-member--unavailable"/,
  );
  assert.match(
    missing,
    /GeoJSON source &quot;missing-configured-geo&quot; is unavailable or invalid/,
  );
  assert.doesNotMatch(missing, /A: 20 at 2027-05-02, joined/);
});

test("playback availability includes renderer preflight failures", () => {
  const rows = [
    {
      observed: "2027-05-01",
      ward: "Ward A",
      actual: 4,
      capacity: 8,
    },
    {
      observed: "2027-05-01",
      ward: " Ward A ",
      actual: 6,
      capacity: 8,
    },
  ];
  const chart = createChartDraft("bullet", {
    id: "colliding-targets",
    title: "Colliding target identities",
    sourceId: "targets",
    roles: {
      actual: { field: "actual" },
      target: { field: "capacity" },
      entity: { field: "ward" },
      time: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    interaction: {
      zoom: { enabled: false },
      timeSync: null,
    },
  });
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
  });
  const html = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups: [{
          id: "exercise",
          name: "Exercise timeline",
          period: { start: "2027-05-01", end: "2027-05-01" },
          secondsPerFrame: 1,
          matching: { policy: "exact" },
          members: [{ chartId: chart.id, timeRole: "time" }],
        }],
        charts: [chart],
        loadedData: { targets: rows },
        profiles: { targets: profile },
        initialState: {
          activeGroupId: "exercise",
          activeIndex: 0,
          playing: false,
          speed: 1,
          playbackView: true,
        },
      },
      React.createElement(PlaybackView),
    ),
  );

  assert.match(
    html,
    /1 participating charts\. 0 available; 1 unavailable\./,
  );
  assert.match(
    html,
    /class="playback-member playback-member--unavailable"/,
  );
  assert.match(
    html,
    /Repeated bullet observations have duplicate collection identity &quot;Ward A&quot;/,
  );
});

test("a current shared resolution is reused while changed inputs are rejected", () => {
  const rows = [
    { observed: "2027-05-01", cases: 10 },
    { observed: "2027-05-02", cases: 20 },
  ];
  const chart = lineChart();
  const datasetProfile = temporalProfile(rows);
  let rowReads = 0;
  const trackedRows = new Proxy(rows, {
    get(target, property, receiver) {
      if (property === "0" || property === "1") rowReads += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  const props = {
    chart,
    rows: trackedRows,
    datasetProfile,
    accessibilityEnabled: true,
    renderContext: { accessibilityEnabled: true },
  };
  const resolution = resolveChartRendering(props);

  assert.equal(resolution.status, "available");
  assert.equal(canReuseChartRendering(resolution, props), true);
  assert.equal(
    canReuseChartRendering(resolution, { ...props, rows: [...trackedRows] }),
    false,
  );
  rowReads = 0;
  const html = renderToStaticMarkup(
    React.createElement(ChartView, {
      ...props,
      resolvedRendering: resolution,
    }),
  );

  assert.equal(rowReads, 0);
  assert.match(html, /Cases over time/);
});

test("shared rendering resolution contains throwing top-level accessors without rereading them", async (t) => {
  const properties = [
    "chart",
    "rows",
    "datasetProfile",
    "geoData",
    "timeContext",
    "renderContext",
  ];

  for (const property of properties) {
    await t.test(property, () => {
      const rows = [
        { observed: "2027-05-01", cases: 10 },
        { observed: "2027-05-02", cases: 20 },
      ];
      const input = {
        chart: lineChart(),
        rows,
        datasetProfile: temporalProfile(rows),
        geoData: null,
        timeContext: null,
        renderContext: {},
      };
      let reads = 0;
      Object.defineProperty(input, property, {
        configurable: true,
        get() {
          reads += 1;
          throw new Error(`hostile ${property} accessor`);
        },
      });

      let resolution;
      assert.doesNotThrow(() => {
        resolution = resolveChartRendering(input);
      });
      assert.equal(resolution.status, "unavailable");
      assert.equal(resolution.model.kind, "error");
      assert.equal(resolution.message, "This chart cannot be displayed.");
      assert.equal(resolution.inputKey, null);
      assert.equal(canReuseChartRendering(resolution, input), false);
      assert.equal(reads, 1);
    });
  }
});

test("shared rendering resolution fails closed for null, primitive, and hostile proxy inputs", () => {
  const validRows = [
    { observed: "2027-05-01", cases: 10 },
    { observed: "2027-05-02", cases: 20 },
  ];
  const validInput = {
    chart: lineChart(),
    rows: validRows,
    datasetProfile: temporalProfile(validRows),
  };
  const invalidInputs = [null, 0, "chart", true, Symbol("chart")];

  for (const input of invalidInputs) {
    let resolution;
    assert.doesNotThrow(() => {
      resolution = resolveChartRendering(input);
    });
    assert.equal(resolution.status, "unavailable");
    assert.equal(resolution.model.kind, "error");
    assert.equal(resolution.message, "This chart cannot be displayed.");
    assert.equal(resolution.inputKey, null);
    assert.equal(canReuseChartRendering(resolution, validInput), false);
  }

  let proxyReads = 0;
  const hostileProxy = new Proxy({}, {
    get() {
      proxyReads += 1;
      throw new Error("hostile proxy accessor");
    },
  });
  let proxyResolution;
  assert.doesNotThrow(() => {
    proxyResolution = resolveChartRendering(hostileProxy);
  });
  assert.equal(proxyResolution.status, "unavailable");
  assert.equal(proxyResolution.model.kind, "error");
  assert.equal(proxyResolution.message, "This chart cannot be displayed.");
  assert.equal(proxyResolution.inputKey, null);
  assert.equal(canReuseChartRendering(proxyResolution, hostileProxy), false);
  assert.equal(proxyReads, 1);
});

test("rendering reuse checks fail closed when a candidate accessor throws", () => {
  const rows = [
    { observed: "2027-05-01", cases: 10 },
    { observed: "2027-05-02", cases: 20 },
  ];
  const input = {
    chart: lineChart(),
    rows,
    datasetProfile: temporalProfile(rows),
  };
  const resolution = resolveChartRendering(input);
  let reads = 0;
  const hostileCandidate = new Proxy(input, {
    get(target, property, receiver) {
      if (property === "chart") {
        reads += 1;
        throw new Error("hostile reuse accessor");
      }
      return Reflect.get(target, property, receiver);
    },
  });

  assert.equal(resolution.status, "available");
  assert.doesNotThrow(() => {
    assert.equal(
      canReuseChartRendering(resolution, hostileCandidate),
      false,
    );
  });
  assert.equal(reads, 1);
  assert.equal(canReuseChartRendering(resolution, input), true);
});

test("shared rendering resolution converts preparation exceptions to bounded unavailable state", () => {
  const resolution = resolveChartRendering({
    chart: {
      id: "unknown-chart",
      typeId: "not-a-chart-type",
      sourceId: "unknown",
    },
    rows: [],
    datasetProfile: { columns: [], diagnostics: [] },
  });

  assert.equal(resolution.status, "unavailable");
  assert.equal(resolution.model.kind, "error");
  assert.equal(resolution.message, "This chart cannot be displayed.");
  assert.ok(resolution.message.length <= 240);
  assert.equal(resolution.inputKey, null);
  assert.equal(
    canReuseChartRendering(resolution, {
      chart: lineChart(),
      rows: [],
      datasetProfile: { columns: [], diagnostics: [] },
    }),
    false,
  );
});

test("playback view reports no group and empty clocks without claiming participation", () => {
  const noGroup = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      { groups: [], charts: [], loadedData: {}, profiles: {} },
      React.createElement(PlaybackView),
    ),
  );

  assert.match(noGroup, /No playback times are available for Default page timeline/);
  assert.doesNotMatch(noGroup, /playback-member/);
});

test("ChartView receives active time when the active Chrono Group lists it as a member", () => {
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
    accessibilityEnabled: true,
    renderContext: { accessibilityEnabled: true },
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
        source: { kind: "group", id: "exercise" },
        activeIndex: 1,
        playing: false,
        speed: 1,
        scope: "group-only",
        playbackView: true,
      },
    },
  );
  const synchronized = renderPlayback(
    React.createElement(ChartView, {
      chart: fixture.charts[0],
      rows: fixture.loadedData.primary,
      datasetProfile: fixture.profiles.primary,
      accessibilityEnabled: true,
      renderContext: { accessibilityEnabled: true },
    }),
    {
      ...fixture,
      initialState: {
        activeGroupId: "exercise",
        source: { kind: "group", id: "exercise" },
        activeIndex: 1,
        playing: false,
        speed: 1,
        scope: "group-only",
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
    accessibilityEnabled: true,
    renderContext: { accessibilityEnabled: true },
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
    period: { start: "2027-05-01", end: "2027-05-03" },
    secondsPerFrame: 1,
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
        accessibilityEnabled: true,
        renderContext: { accessibilityEnabled: true },
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
  const clockChart = lineChart({ id: "clock-chart" });
  const html = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups: [{
          id: "exercise",
          name: "Exercise timeline",
          period: { start: "2027-05-01", end: "2027-05-03" },
          secondsPerFrame: 1,
          matching: { policy: "lastKnown" },
          members: [
            { chartId: clockChart.id, timeRole: "observation" },
            { chartId: chart.id, timeRole: "time" },
          ],
        }],
        charts: [clockChart, chart],
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
  const clockChart = lineChart({ id: "clock-chart" });
  const html = renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      {
        groups: [{
          id: "exercise",
          name: "Exercise timeline",
          period: { start: "2027-05-01", end: "2027-05-03" },
          secondsPerFrame: 1,
          matching: { policy: "exact" },
          members: [{
            chartId: chart.id,
            timeRole: "time",
            matching: { policy: "interpolate" },
          }, { chartId: clockChart.id, timeRole: "observation" }],
        }],
        charts: [chart, clockChart],
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
      period: { start: "2027-05-01", end: "2027-06-20" },
      secondsPerFrame: 1,
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
      accessibilityEnabled: true,
      renderContext: { accessibilityEnabled: true },
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
        accessibilityEnabled: true,
        renderContext: { accessibilityEnabled: true },
      }),
      {
        groups: [{
          id: "exercise",
          name: "Exercise timeline",
          period: { start: "2027-05-01", end: "2027-05-03" },
          secondsPerFrame: 1,
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
    "set:2000",
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

function renderPlaybackProbe(props) {
  function Probe() {
    const playback = usePlayback();
    return React.createElement("output", null, JSON.stringify({
      clock: playback.clock,
      charts: playback.participatingChartIds,
    }));
  }
  return renderToStaticMarkup(React.createElement(
    PlaybackProvider,
    { timezone: "UTC", ...props },
    React.createElement(Probe),
  ));
}

function scenePlaybackFixture({ sourceChart, otherChart, sourceRows, otherRows, frames }) {
  return {
    groups: [{
      id: "scene-group",
      name: "Scene group",
      period: { start: "2027-05-01", end: "2027-05-03" },
      secondsPerFrame: 1,
      matching: { policy: "exact" },
      members: [
        { chartId: sourceChart.id, timeRole: "observation" },
        { chartId: otherChart.id, timeRole: "observation" },
      ],
    }],
    scenes: [{
      id: "scene-live-frames",
      name: "Live frame schema",
      chronoGroupId: "scene-group",
      period: {
        start: "2027-05-01T00:00:00.000Z",
        end: "2027-05-03T00:00:00.000Z",
      },
      frames,
      members: [
        { chartId: sourceChart.id, width: 2 },
        { chartId: otherChart.id, width: 2 },
      ],
    }],
    charts: [sourceChart, otherChart],
    loadedData: {
      [sourceChart.sourceId]: sourceRows,
      [otherChart.sourceId]: otherRows,
    },
    profiles: {
      [sourceChart.sourceId]: temporalProfile(sourceRows),
      [otherChart.sourceId]: temporalProfile(otherRows),
    },
    initialState: {
      ...initialPlaybackState,
      source: { kind: "scene", id: "scene-live-frames" },
      activeGroupId: "scene-group",
      activeSceneId: "scene-live-frames",
      scope: "group-only",
      playbackView: true,
    },
  };
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
      period: { start: "2027-05-01", end: "2027-05-03" },
      secondsPerFrame: 1,
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
    timeSync: null,
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

function chronoChart() {
  return {
    id: "geo-chart",
    typeId: "chronoChoroplethMap",
    title: "Regional playback",
    sourceId: "geo-values",
    roles: {
      geography: { field: "region" },
      value: { field: "value" },
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
      labels: null,
      accessibility: null,
      map: {
        geoSource: "configured-geo",
        featureProperty: "code",
      },
    },
    interaction: {
      zoom: { enabled: false },
      timeSync: null,
    },
  };
}

function geoFixture(code) {
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { code },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [4, 52],
          [5, 52],
          [5, 53],
          [4, 53],
          [4, 52],
        ]],
      },
    }],
  };
}

function kpiChart(overrides = {}) {
  const interaction = overrides.interaction ?? {
    zoom: { enabled: false },
    timeSync: null,
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
      timeSync: null,
    },
  };
}

function buttonMarkupByAriaLabel(html, label) {
  const marker = `aria-label="${label}"`;
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing button ${label}`);
  const start = html.lastIndexOf("<button", markerIndex);
  const end = html.indexOf("</button>", markerIndex);
  assert.ok(start >= 0 && end >= markerIndex, `Malformed button ${label}`);
  return html.slice(start, end + "</button>".length);
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
      timeSync: null,
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
