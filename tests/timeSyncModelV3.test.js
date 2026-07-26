import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrimaryClock,
  getTimeSyncGroup,
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
      timeSync: { groupId: "exercise", policy: "exact" },
    },
    ...overrides,
  };
}

function synchronizationGroup(overrides = {}) {
  return {
    id: "exercise",
    name: "Exercise playback",
    primaryClock: {
      sourceId: "primary-cases",
      timeField: "reportedAt",
    },
    matching: { policy: "exact" },
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

test("an absent or empty synchronization-group collection has no active clock", () => {
  const groups = [];

  assert.equal(
    validateTimeSyncGroups(groups, validationContext({ charts: [] })),
    groups,
  );
  assert.equal(getTimeSyncGroup(groups, null), null);
  assert.deepEqual(buildPrimaryClock(null, {}, {}), []);
});

test("a group derives its ordered clock only from designated profile evidence", () => {
  const group = synchronizationGroup();
  const context = validationContext({
    loadedData: {
      "primary-cases": [
        { reportedAt: "2027-05-04", cases: 40 },
        { reportedAt: "2027-05-01", cases: 10 },
      ],
      "member-only-source": [
        { reportedAt: "2027-04-01", cases: 1 },
      ],
    },
  });

  assert.deepEqual(
    buildPrimaryClock(group, context.loadedData, context.profiles),
    [MAY_1, MAY_2, MAY_3],
  );
});

test("primary clocks use canonical date-only and instant profile values", () => {
  const group = synchronizationGroup();
  const context = validationContext({
    profiles: {
      "primary-cases": profileWithTimes([
        "2027-05-01",
        "2027-05-02T12:30:15.125Z",
      ]),
    },
  });

  assert.deepEqual(
    buildPrimaryClock(group, context.loadedData, context.profiles),
    [MAY_1, Date.UTC(2027, 4, 2, 12, 30, 15, 125)],
  );
});

test("an explicitly temporal primary source may currently have an empty clock", () => {
  const group = synchronizationGroup();
  const context = validationContext({
    profiles: {
      "primary-cases": profileWithTimes([]),
    },
  });

  assert.deepEqual(
    buildPrimaryClock(group, context.loadedData, context.profiles),
    [],
  );
});

test("missing primary source, profile, field, or temporal evidence is actionable", () => {
  const group = synchronizationGroup();
  const base = validationContext();
  const cases = [
    {
      loadedData: {},
      profiles: base.profiles,
      message: /primary source "primary-cases".*not loaded/i,
    },
    {
      loadedData: { "primary-cases": null },
      profiles: base.profiles,
      message: /primary source "primary-cases".*not loaded/i,
    },
    {
      loadedData: { "primary-cases": undefined },
      profiles: base.profiles,
      message: /primary source "primary-cases".*not loaded/i,
    },
    {
      loadedData: base.loadedData,
      profiles: {},
      message: /profile.*primary-cases.*required/i,
    },
    {
      loadedData: base.loadedData,
      profiles: {
        "primary-cases": {
          columns: [{ name: "cases", type: "numeric" }],
        },
      },
      message: /time field "reportedAt".*profile/i,
    },
    {
      loadedData: base.loadedData,
      profiles: {
        "primary-cases": {
          columns: [{
            name: "reportedAt",
            type: "category",
            temporal: { values: ["2027-05-01"], diagnostics: [] },
          }],
        },
      },
      message: /time field "reportedAt".*temporal/i,
    },
    {
      loadedData: base.loadedData,
      profiles: {
        "primary-cases": {
          columns: [{
            name: "reportedAt",
            type: "temporal",
            temporal: { values: ["2027-05-01"] },
          }],
        },
      },
      message: /temporal profile evidence/i,
    },
  ];

  for (const fixture of cases) {
    assert.throws(
      () => buildPrimaryClock(
        group,
        fixture.loadedData,
        fixture.profiles,
      ),
      fixture.message,
    );
  }
});

test("duplicate or unsorted canonical primary timestamps are rejected", () => {
  const group = synchronizationGroup();
  const context = validationContext();

  for (const [values, message] of [
    [["2027-05-01", "2027-05-01"], /duplicate.*primary.*timestamp/i],
    [["2027-05-02", "2027-05-01"], /strictly increasing/i],
  ]) {
    assert.throws(
      () => buildPrimaryClock(
        group,
        context.loadedData,
        {
          "primary-cases": profileWithTimes(values),
        },
      ),
      message,
    );
  }
});

test("malformed canonical temporal profile values are never guessed or coerced", () => {
  const group = synchronizationGroup();
  const context = validationContext();

  for (const value of [
    "02/05/2027",
    "2027-02-30",
    "2027-05-01T12:00:00Z",
    MAY_1,
    { epochMs: MAY_1 },
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ]) {
    assert.throws(
      () => buildPrimaryClock(
        group,
        context.loadedData,
        {
          "primary-cases": profileWithTimes([value]),
        },
      ),
      /finite canonical temporal value/i,
      String(value),
    );
  }
});

test("top-level, group, primary-clock, and member shapes are strict", () => {
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
      groups: [synchronizationGroup({ primaryClock: null })],
      message: /primaryClock must be an object/i,
    },
    {
      groups: [synchronizationGroup({
        primaryClock: {
          sourceId: "primary-cases",
          timeField: "reportedAt",
          extra: true,
        },
      })],
      message: /unknown primary clock property "extra"/i,
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
      timeSync: { groupId: "exercise", policy: "exact" },
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

test("member and chart group references must agree in both directions", () => {
  const context = validationContext();
  assert.throws(
    () => validateTimeSyncGroups(
      [synchronizationGroup()],
      {
        ...context,
        charts: [lineChart({
          interaction: {
            timeSync: { groupId: "", policy: "exact" },
          },
        })],
      },
    ),
    /chart "outbreak-trend".*groupId is required/i,
  );

  assert.throws(
    () => validateTimeSyncGroups(
      [synchronizationGroup()],
      {
        ...context,
        charts: [lineChart({
          interaction: {
            timeSync: { groupId: "another-group", policy: "exact" },
          },
        })],
      },
    ),
    /chart "outbreak-trend".*references group "another-group".*"exercise"/i,
  );

  assert.throws(
    () => validateTimeSyncGroups(
      [synchronizationGroup({
        members: [{
          chartId: "secondary-trend",
          timeRole: "observation",
        }],
      })],
      {
        ...context,
        charts: [
          lineChart(),
          lineChart({
            id: "secondary-trend",
            interaction: {
              timeSync: { groupId: "exercise", policy: "exact" },
            },
          }),
        ],
      },
    ),
    /chart "outbreak-trend".*references group "exercise".*not a member/i,
  );
});

test("member temporal roles require canonical profile evidence", () => {
  const secondary = lineChart({
    id: "secondary-trend",
    sourceId: "secondary-cases",
  });
  const group = synchronizationGroup({
    members: [{
      chartId: "secondary-trend",
      timeRole: "observation",
    }],
  });
  const context = validationContext({
    charts: [secondary],
    profiles: {
      "primary-cases": profileWithTimes(),
      "secondary-cases": profileWithTimes(["02/05/2027"]),
    },
  });

  assert.throws(
    () => validateTimeSyncGroups([group], context),
    /member chart "secondary-trend".*finite canonical temporal values/i,
  );
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
      timeSync: { groupId: "exercise", policy: "exact" },
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

test("ticks advance while playing and stop once already at the end", () => {
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
    { ...playing, activeIndex: 2 },
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
  for (const speed of [0, 1.5, 4, "2"]) {
    assert.throws(
      () => reducePlaybackState(state, {
        type: "setSpeed",
        speed,
      }),
      /playback speed must be 1, 2, or 3/i,
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
