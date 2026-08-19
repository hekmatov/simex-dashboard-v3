import assert from "node:assert/strict";
import test from "node:test";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import * as timeSyncModel from "../src/charting/time/timeSyncModel.js";

import {
  buildPrimaryClock,
  getTimeSyncGroup,
  validateEffectiveTimeSyncMatching,
  validateTimeSyncGroups,
} from "../src/charting/time/timeSyncModel.js";
import {
  initialPlaybackState,
  reducePlaybackState,
} from "../src/charting/time/playbackReducer.js";

const MAY_1 = Date.UTC(2027, 4, 1);
const MAY_2 = Date.UTC(2027, 4, 2);
const MAY_3 = Date.UTC(2027, 4, 3);
const MAY_4 = Date.UTC(2027, 4, 4);

function profileWithTimes(values = [
  "2027-05-01",
  "2027-05-02",
  "2027-05-03",
]) {
  return {
    rowCount: values.length,
    columns: [
      {
        name: "reportedAt",
        type: "temporal",
        temporal: {
          values,
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
  };
}

function lineChart(overrides = {}) {
  return {
    id: "outbreak-trend",
    typeId: "line",
    sourceId: "primary-cases",
    roles: {
      measurements: [{ field: "cases" }],
      observation: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    interaction: {
      timeSync: { groupId: "exercise" },
    },
    ...overrides,
  };
}

function synchronizationGroup(overrides = {}) {
  return {
    id: "exercise",
    name: "Exercise playback",
    period: { start: "2027-05-01", end: "2027-05-04" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [
      {
        chartId: "outbreak-trend",
        timeRole: "observation",
      },
    ],
    ...overrides,
  };
}

function validationContext(overrides = {}) {
  return {
    charts: [lineChart()],
    loadedData: {
      "primary-cases": [
        { reportedAt: "raw values are not parsed", cases: 100 },
        { reportedAt: "2027-05-04", cases: 200 },
      ],
    },
    profiles: {
      "primary-cases": profileWithTimes(),
    },
    ...overrides,
  };
}

function validReducerState(overrides = {}) {
  return {
    ...initialPlaybackState,
    activeGroupId: "exercise",
    playbackView: true,
    ...overrides,
  };
}

function canonicalSynchronizationGroup(overrides = {}) {
  return {
    id: "exercise",
    name: "Exercise playback",
    period: {
      start: "2027-05-01",
      end: "2027-05-04",
    },
    matching: { policy: "exact" },
    secondsPerFrame: 1.5,
    members: [{
      chartId: "outbreak-trend",
      timeRole: "observation",
    }],
    ...overrides,
  };
}

function canonicalValidationContext(overrides = {}) {
  const rows = [
    { reportedAt: "2027-05-01", cases: 10 },
    { reportedAt: "2027-05-02", cases: 20 },
  ];
  return {
    charts: [lineChart({ interaction: { timeSync: null } })],
    loadedData: { "primary-cases": rows },
    profiles: {
      "primary-cases": profileDataset(rows, {
        reportedAt: { interpretation: "temporal", format: "YYYY-MM-DD" },
      }),
    },
    timezone: "UTC",
    ...overrides,
  };
}

test("canonical Time Group validation owns period, speed, and many-to-many membership", () => {
  const context = canonicalValidationContext();
  const exercise = canonicalSynchronizationGroup();
  const review = canonicalSynchronizationGroup({
    id: "review",
    name: "Review playback",
    matching: { policy: "lastKnown" },
  });
  const groups = [exercise, review];

  assert.equal(validateTimeSyncGroups(groups, context), groups);
  assert.equal(validateTimeSyncGroups(groups, {
    ...context,
    timezone: undefined,
  }), groups);
  assert.equal(context.charts[0].interaction.timeSync, null);
});

test("canonical Time Group validation rejects legacy, invalid period, speed, and timezone contracts", () => {
  const context = canonicalValidationContext();
  const fixtures = [
    [canonicalSynchronizationGroup({ primaryClock: { sourceId: "primary-cases", timeField: "reportedAt" } }), /unknown time synchronization group property "primaryClock"/i],
    [canonicalSynchronizationGroup({ period: null }), /period must be an object/i],
    [canonicalSynchronizationGroup({ period: { start: "05\/01\/2027", end: "2027-05-04" } }), /period start.*YYYY-MM-DD/i],
    [canonicalSynchronizationGroup({ period: { start: "2027-02-30", end: "2027-05-04" } }), /period start.*calendar date/i],
    [canonicalSynchronizationGroup({ period: { start: "2027-05-05", end: "2027-05-04" } }), /period end.*before.*start/i],
    [canonicalSynchronizationGroup({ secondsPerFrame: 0 }), /secondsPerFrame.*positive finite/i],
    [canonicalSynchronizationGroup({ secondsPerFrame: Number.POSITIVE_INFINITY }), /secondsPerFrame.*positive finite/i],
  ];

  for (const [group, message] of fixtures) {
    assert.throws(
      () => validateTimeSyncGroups([group], context),
      message,
    );
  }
  assert.throws(
    () => validateTimeSyncGroups([canonicalSynchronizationGroup()], {
      ...context,
      timezone: "Mars/Olympus_Mons",
    }),
    /IANA timezone/i,
  );
});

test("canonical Time Group clock unions filtered valid plotted observations inside its inclusive period", () => {
  assert.equal(typeof timeSyncModel.buildTimeGroupClock, "function");

  const lineRows = [
    { reportedAt: "2027-04-30", cases: 1, include: "yes" },
    { reportedAt: "2027-05-01", cases: null, include: "yes" },
    { reportedAt: "2027-05-02", cases: 2, include: "yes" },
    { reportedAt: "2027-05-02", cases: 3, include: "yes" },
    { reportedAt: "2027-05-03", cases: "invalid", include: "yes" },
    { reportedAt: "2027-05-04", cases: 4, include: "no" },
    { reportedAt: "not-a-date", cases: 5, include: "yes" },
    { reportedAt: "2027-05-05", cases: 6, include: "yes" },
  ];
  const eventRows = [
    { start: "2027-05-01", event: "Exercise begins" },
    { start: "2027-05-03", event: "" },
    { start: "2027-05-04", event: "Exercise ends" },
  ];
  const charts = [
    lineChart({
      interaction: { timeSync: null },
      transformations: {
        filters: [{ field: "include", operator: "equals", value: "yes" }],
      },
    }),
    {
      id: "events",
      typeId: "timeline",
      sourceId: "events-source",
      roles: {
        event: { field: "event" },
        start: {
          field: "start",
          interpretation: "temporal",
          format: "YYYY-MM-DD",
        },
      },
      interaction: { timeSync: null },
      transformations: { filters: [] },
    },
  ];
  const group = canonicalSynchronizationGroup({
    members: [
      { chartId: "outbreak-trend", timeRole: "observation" },
      { chartId: "events", timeRole: "start" },
    ],
  });
  const clock = timeSyncModel.buildTimeGroupClock(group, {
    charts,
    loadedData: {
      "primary-cases": lineRows,
      "events-source": eventRows,
    },
    profiles: {
      "primary-cases": profileDataset(lineRows, {
        reportedAt: { interpretation: "temporal", format: "YYYY-MM-DD" },
        cases: { interpretation: "number" },
      }),
      "events-source": profileDataset(eventRows, {
        start: { interpretation: "temporal", format: "YYYY-MM-DD" },
      }),
    },
    timezone: "UTC",
  });

  assert.deepEqual(clock, [MAY_1, MAY_2, MAY_4]);
  assert.equal(Object.isFrozen(clock), true);
});

test("canonical Time Group clock compares instant observations to period dates in the dashboard timezone", () => {
  assert.equal(typeof timeSyncModel.buildTimeGroupClock, "function");

  const rows = [
    { at: "2027-05-02T03:59:59.000Z", value: 1 },
    { at: "2027-05-02T04:00:00.000Z", value: 2 },
  ];
  const chart = lineChart({
    id: "timezone-chart",
    sourceId: "timezone-source",
    roles: {
      measurements: [{ field: "value" }],
      observation: {
        field: "at",
        interpretation: "temporal",
        format: "ISO-8601",
      },
    },
    interaction: { timeSync: null },
  });
  const clock = timeSyncModel.buildTimeGroupClock(
    canonicalSynchronizationGroup({
      period: { start: "2027-05-01", end: "2027-05-01" },
      members: [{ chartId: chart.id, timeRole: "observation" }],
    }),
    {
      charts: [chart],
      loadedData: { "timezone-source": rows },
      profiles: {
        "timezone-source": profileDataset(rows, {
          at: { interpretation: "temporal", format: "ISO-8601" },
        }),
      },
      timezone: "America/New_York",
    },
  );

  assert.deepEqual(clock, [Date.UTC(2027, 4, 2, 3, 59, 59)]);
});

test("an absent or empty synchronization-group collection has no active clock", () => {
  const groups = [];

  assert.equal(
    validateTimeSyncGroups(groups, validationContext({ charts: [] })),
    groups,
  );
  assert.equal(getTimeSyncGroup(groups, null), null);
  assert.deepEqual(buildPrimaryClock(null, {}, {}), []);
});

test("top-level, group, period, and member shapes are strict", () => {
  const context = validationContext();
  const malformed = [
    {
      groups: {},
      message: /groups must be an array/i,
    },
    {
      groups: [{ ...synchronizationGroup(), surprise: true }],
      message: /unknown time synchronization group property "surprise"/i,
    },
    {
      groups: [synchronizationGroup({ name: " " })],
      message: /group name is required/i,
    },
    {
      groups: [synchronizationGroup({ matching: undefined })],
      message: /group "exercise" matching is required/i,
    },
    {
      groups: [synchronizationGroup({ matching: {} })],
      message: /matching policy is required/i,
    },
    {
      groups: [synchronizationGroup({ period: null })],
      message: /period must be an object/i,
    },
    {
      groups: [synchronizationGroup({
        period: {
          start: "2027-05-01",
          end: "2027-05-04",
          extra: true,
        },
      })],
      message: /unknown time synchronization period property "extra"/i,
    },
    {
      groups: [synchronizationGroup({ members: [] })],
      message: /members must be a non-empty array/i,
    },
    {
      groups: [synchronizationGroup({
        members: [{
          chartId: "outbreak-trend",
          timeRole: "observation",
          extra: true,
        }],
      })],
      message: /unknown time synchronization member property "extra"/i,
    },
  ];

  for (const fixture of malformed) {
    assert.throws(
      () => validateTimeSyncGroups(fixture.groups, context),
      fixture.message,
    );
  }
});

test("group IDs and member chart IDs are non-empty and unique", () => {
  const context = validationContext();

  assert.throws(
    () => validateTimeSyncGroups([
      synchronizationGroup({ id: " " }),
    ], context),
    /group id is required/i,
  );
  assert.throws(
    () => validateTimeSyncGroups([
      synchronizationGroup(),
      synchronizationGroup(),
    ], context),
    /duplicate time synchronization group id "exercise"/i,
  );
  assert.throws(
    () => validateTimeSyncGroups([
      synchronizationGroup({
        members: [
          { chartId: "outbreak-trend", timeRole: "observation" },
          { chartId: "outbreak-trend", timeRole: "observation" },
        ],
      }),
    ], context),
    /duplicate member chart id "outbreak-trend"/i,
  );
});

test("members must reference existing eligible charts and bound temporal roles", () => {
  const context = validationContext();

  assert.throws(
    () => validateTimeSyncGroups([
      synchronizationGroup({
        members: [{
          chartId: "missing-chart",
          timeRole: "observation",
        }],
      }),
    ], context),
    /member chart "missing-chart" does not exist/i,
  );

  const pie = {
    id: "composition",
    typeId: "pie",
    sourceId: "primary-cases",
    roles: {
      category: { field: "region" },
      value: { field: "cases" },
    },
    interaction: {
      timeSync: { groupId: "exercise" },
    },
  };
  assert.throws(
    () => validateTimeSyncGroups([
      synchronizationGroup({
        members: [{
          chartId: "composition",
          timeRole: "category",
        }],
      }),
    ], {
      ...context,
      charts: [pie],
    }),
    /chart "composition".*does not support time synchronization/i,
  );

  assert.throws(
    () => validateTimeSyncGroups([
      synchronizationGroup({
        members: [{
          chartId: "outbreak-trend",
          timeRole: "cluster",
        }],
      }),
    ], context),
    /time role "cluster".*not a temporal role/i,
  );
});

test("Time Group membership ignores obsolete chart backlinks", () => {
  const context = validationContext();
  const groups = [synchronizationGroup()];

  assert.equal(validateTimeSyncGroups(groups, {
    ...context,
    charts: [lineChart({
      interaction: { timeSync: { groupId: "obsolete-group" } },
    })],
  }), groups);
});

test("matching requires an explicit exact, last-known, or bounded nearest policy", () => {
  const context = validationContext();
  const exact = synchronizationGroup({ matching: { policy: "exact" } });
  const lastKnown = synchronizationGroup({
    matching: { policy: "lastKnown" },
  });
  const nearest = synchronizationGroup({
    matching: { policy: "nearest", toleranceMs: 86_400_000 },
  });

  assert.equal(
    validateTimeSyncGroups([exact], context)[0],
    exact,
  );
  assert.equal(
    validateTimeSyncGroups([lastKnown], context)[0],
    lastKnown,
  );
  assert.equal(
    validateTimeSyncGroups([nearest], context)[0],
    nearest,
  );
});

test("unknown policies and invalid or misplaced tolerances fail closed", () => {
  const context = validationContext();

  for (const [matching, message] of [
    [{ policy: "closest" }, /unknown temporal matching policy "closest"/i],
    [{ policy: "nearest" }, /nearest.*finite, non-negative toleranceMs/i],
    [{ policy: "nearest", toleranceMs: -1 }, /nearest.*finite, non-negative toleranceMs/i],
    [{ policy: "nearest", toleranceMs: Number.POSITIVE_INFINITY }, /nearest.*finite, non-negative toleranceMs/i],
    [{ policy: "exact", toleranceMs: 0 }, /only nearest.*toleranceMs/i],
  ]) {
    assert.throws(
      () => validateTimeSyncGroups([
        synchronizationGroup({ matching }),
      ], context),
      message,
    );
  }
});

test("the effective matching authority accepts only owned inert fields on a plain object", () => {
  assert.deepEqual(
    validateEffectiveTimeSyncMatching({ policy: "exact" }),
    { policy: "exact" },
  );
  assert.deepEqual(
    validateEffectiveTimeSyncMatching({
      policy: "nearest",
      toleranceMs: 3_600_000,
    }),
    { policy: "nearest", toleranceMs: 3_600_000 },
  );

  let accessorReads = 0;
  const accessor = {};
  Object.defineProperty(accessor, "policy", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return "exact";
    },
  });
  const inherited = Object.create({ policy: "exact" });
  const symbolic = { policy: "exact" };
  symbolic[Symbol("hidden")] = true;

  for (const [matching, message] of [
    [inherited, /matching must be a plain object/i],
    [accessor, /matching property "policy".*data property/i],
    [symbolic, /matching.*symbol/i],
    [{ policy: "exact", unexpected: true }, /unknown temporal matching property "unexpected"/i],
    [{ policy: "closest" }, /unknown temporal matching policy "closest"/i],
    [{ policy: "nearest" }, /nearest.*finite, non-negative toleranceMs/i],
    [{ policy: "nearest", toleranceMs: -1 }, /nearest.*finite, non-negative toleranceMs/i],
    [{ policy: "nearest", toleranceMs: Number.NaN }, /nearest.*finite, non-negative toleranceMs/i],
    [{ policy: "exact", toleranceMs: 0 }, /only nearest.*toleranceMs/i],
  ]) {
    assert.throws(
      () => validateEffectiveTimeSyncMatching(matching),
      message,
    );
  }
  assert.equal(accessorReads, 0);
});

test("member matching overrides are validated independently", () => {
  const context = validationContext();
  const group = synchronizationGroup({
    matching: { policy: "lastKnown" },
    members: [{
      chartId: "outbreak-trend",
      timeRole: "observation",
      matching: {
        policy: "nearest",
        toleranceMs: 3_600_000,
      },
    }],
  });

  assert.equal(validateTimeSyncGroups([group], context)[0], group);
  group.members[0].matching = { policy: "nearest" };
  assert.throws(
    () => validateTimeSyncGroups([group], context),
    /member "outbreak-trend".*nearest.*toleranceMs/i,
  );
});

test("interpolation requires explicit measure permission and a non-discrete schema", () => {
  const context = validationContext();
  const continuous = synchronizationGroup({
    matching: { policy: "interpolate" },
  });
  assert.throws(
    () => validateTimeSyncGroups([continuous], context),
    /chart "outbreak-trend".*explicitly permit interpolation/i,
  );

  const permittedContext = validationContext();
  permittedContext.profiles["primary-cases"].columns
    .find(({ name }) => name === "cases")
    .interpolationAllowed = true;
  assert.equal(
    validateTimeSyncGroups([continuous], permittedContext)[0],
    continuous,
  );

  const timeline = {
    id: "events",
    typeId: "timeline",
    sourceId: "primary-cases",
    roles: {
      event: { field: "event" },
      start: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    interaction: {
      timeSync: { groupId: "exercise" },
    },
  };
  const eventGroup = synchronizationGroup({
    matching: { policy: "interpolate" },
    members: [{
      chartId: "events",
      timeRole: "start",
    }],
  });

  assert.throws(
    () => validateTimeSyncGroups([eventGroup], {
      ...context,
      charts: [timeline],
    }),
    /chart "events".*event.*does not permit interpolation/i,
  );
});

test("group lookup returns the original group and reports deterministic diagnostics", () => {
  const exercise = synchronizationGroup();
  const logistics = synchronizationGroup({
    id: "logistics",
    name: "Logistics playback",
  });
  const groups = [exercise, logistics];

  assert.equal(getTimeSyncGroup(groups, "logistics"), logistics);
  assert.throws(
    () => getTimeSyncGroup(groups, "unknown"),
    /unknown time synchronization group "unknown"/i,
  );
  assert.throws(
    () => getTimeSyncGroup([exercise, exercise], "exercise"),
    /duplicate time synchronization group id "exercise"/i,
  );
  assert.throws(
    () => getTimeSyncGroup(groups, ""),
    /group id is required/i,
  );
});

test("the initial playback state is immutable and matches the v3 contract", () => {
  assert.deepEqual(initialPlaybackState, {
    activeGroupId: null,
    activeIndex: 0,
    playing: false,
    speed: 1,
    playbackView: false,
  });
  assert.equal(Object.isFrozen(initialPlaybackState), true);
});

test("play, pause, speed, and view actions transition deterministically", () => {
  const base = validReducerState({ playing: false });
  const playing = reducePlaybackState(base, {
    type: "play",
    clockLength: 3,
  });
  const faster = reducePlaybackState(playing, {
    type: "setSpeed",
    speed: 3,
  });
  const closed = reducePlaybackState(faster, { type: "closeView" });
  const reopened = reducePlaybackState(
    { ...faster, playing: true, playbackView: false },
    { type: "openView" },
  );

  assert.deepEqual(playing, { ...base, playing: true });
  assert.deepEqual(
    reducePlaybackState(playing, { type: "pause" }),
    base,
  );
  assert.deepEqual(faster, { ...playing, speed: 3 });
  assert.deepEqual(closed, {
    ...faster,
    playing: false,
    playbackView: false,
  });
  assert.deepEqual(reopened, {
    ...faster,
    playing: false,
    playbackView: true,
  });
});

test("changing groups resets the index and pauses playback", () => {
  const state = validReducerState({
    activeIndex: 2,
    playing: true,
  });

  assert.deepEqual(
    reducePlaybackState(state, {
      type: "setGroup",
      groupId: "logistics",
    }),
    {
      ...state,
      activeGroupId: "logistics",
      activeIndex: 0,
      playing: false,
    },
  );
  assert.deepEqual(
    reducePlaybackState(state, {
      type: "setGroup",
      groupId: null,
    }),
    {
      ...state,
      activeGroupId: null,
      activeIndex: 0,
      playing: false,
    },
  );
});

test("previous, next, and seek clamp indices and pause manual navigation", () => {
  const state = validReducerState({
    activeIndex: 1,
    playing: true,
  });

  assert.deepEqual(
    reducePlaybackState(state, {
      type: "previous",
      clockLength: 3,
    }),
    { ...state, activeIndex: 0, playing: false },
  );
  assert.deepEqual(
    reducePlaybackState(state, {
      type: "next",
      clockLength: 3,
    }),
    { ...state, activeIndex: 2, playing: false },
  );
  assert.deepEqual(
    reducePlaybackState(state, {
      type: "seek",
      index: -10,
      clockLength: 3,
    }),
    { ...state, activeIndex: 0, playing: false },
  );
  assert.deepEqual(
    reducePlaybackState(state, {
      type: "seek",
      index: 99,
      clockLength: 3,
    }),
    { ...state, activeIndex: 2, playing: false },
  );
});

test("a tick entering the final time atomically stops playback", () => {
  const playing = validReducerState({
    activeIndex: 1,
    playing: true,
  });
  const atEnd = {
    ...playing,
    activeIndex: 2,
  };

  assert.deepEqual(
    reducePlaybackState(playing, {
      type: "tick",
      clockLength: 3,
    }),
    { ...playing, activeIndex: 2, playing: false },
  );
  assert.deepEqual(
    reducePlaybackState(atEnd, {
      type: "tick",
      clockLength: 3,
    }),
    { ...atEnd, playing: false },
  );
  assert.equal(
    reducePlaybackState(
      { ...playing, playing: false },
      { type: "tick", clockLength: 3 },
    ).activeIndex,
    1,
  );
});

test("play is unavailable while the playback view is closed or the clock cannot advance", () => {
  const closed = validReducerState({
    activeIndex: 0,
    playing: false,
    playbackView: false,
  });
  const singleTime = validReducerState({
    activeIndex: 0,
    playing: false,
  });
  const atEnd = validReducerState({
    activeIndex: 2,
    playing: false,
  });

  assert.equal(
    reducePlaybackState(closed, { type: "play", clockLength: 3 }),
    closed,
  );
  assert.equal(
    reducePlaybackState(singleTime, { type: "play", clockLength: 1 }),
    singleTime,
  );
  assert.equal(
    reducePlaybackState(atEnd, { type: "play", clockLength: 3 }),
    atEnd,
  );
});

test("a zero-length clock always has index zero and cannot play", () => {
  const invalidForEmptyClock = validReducerState({
    activeIndex: 8,
    playing: true,
  });

  for (const action of [
    { type: "play", clockLength: 0 },
    { type: "previous", clockLength: 0 },
    { type: "next", clockLength: 0 },
    { type: "seek", index: 5, clockLength: 0 },
    { type: "tick", clockLength: 0 },
  ]) {
    assert.deepEqual(
      reducePlaybackState(invalidForEmptyClock, action),
      {
        ...invalidForEmptyClock,
        activeIndex: 0,
        playing: false,
      },
      action.type,
    );
  }
});

test("invalid reducer boundaries, speeds, and group IDs fail closed", () => {
  const state = validReducerState();

  assert.throws(
    () => reducePlaybackState(state, { type: "play" }),
    /clockLength must be a non-negative integer/i,
  );
  for (const clockLength of [
    undefined,
    -1,
    1.5,
    Number.POSITIVE_INFINITY,
  ]) {
    assert.throws(
      () => reducePlaybackState(state, {
        type: "next",
        clockLength,
      }),
      /clockLength must be a non-negative integer/i,
      String(clockLength),
    );
  }
  for (const index of [1.5, Number.NaN, "1"]) {
    assert.throws(
      () => reducePlaybackState(state, {
        type: "seek",
        index,
        clockLength: 3,
      }),
      /seek index must be an integer/i,
      String(index),
    );
  }
  for (const speed of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, "2"]) {
    assert.throws(
      () => reducePlaybackState(state, {
        type: "setSpeed",
        speed,
      }),
      /playback seconds per frame must be a positive finite number/i,
      String(speed),
    );
  }
  assert.throws(
    () => reducePlaybackState(state, {
      type: "setGroup",
      groupId: "",
    }),
    /groupId must be null or a non-empty string/i,
  );
});

test("unknown actions are identity no-ops and reducer inputs stay unchanged", () => {
  const state = Object.freeze(validReducerState({
    activeIndex: 1,
    playing: true,
  }));
  const action = Object.freeze({ type: "future-action", value: 42 });
  const beforeState = structuredClone(state);
  const beforeAction = structuredClone(action);

  const result = reducePlaybackState(state, action);

  assert.equal(result, state);
  assert.deepEqual(state, beforeState);
  assert.deepEqual(action, beforeAction);
});
