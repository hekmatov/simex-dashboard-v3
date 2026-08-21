import assert from "node:assert/strict";
import test from "node:test";

import {
  MATCHING_POLICY_LABELS,
  matchTemporalObservation,
  resolveMatchingPolicy,
  resolveSecondsPerFrame,
  summarizeTemporalProvenance,
} from "../src/charting/time/temporalMatch.js";

const MAY_1 = Date.UTC(2027, 4, 1);
const MAY_2 = Date.UTC(2027, 4, 2);
const MAY_3 = Date.UTC(2027, 4, 3);
const MAY_4 = Date.UTC(2027, 4, 4);
const DAY_MS = 24 * 60 * 60 * 1_000;

const samples = Object.freeze([
  Object.freeze({ epochMs: MAY_1, value: 10, note: "first" }),
  Object.freeze({ epochMs: MAY_3, value: 20, note: "third" }),
]);

const missing = Object.freeze({ status: "missing", observation: null });

test("exact matching is the fail-closed default and never invents a value", () => {
  const match = matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_2,
  });

  assert.deepEqual(match, missing);
  assert.equal(Object.isFrozen(match), true);
  assert.throws(() => {
    match.status = "observed";
  }, TypeError);
});

test("an exact match preserves the canonical observation and reports its source timestamp", () => {
  const match = matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_3,
    policy: "exact",
  });

  assert.deepEqual(match, {
    status: "observed",
    observation: samples[1],
    sourceEpochMs: MAY_3,
  });
  assert.strictEqual(match.observation, samples[1]);
});

test("matched result wrappers are immutable without freezing or detaching canonical observations", () => {
  const observations = [
    { epochMs: MAY_1, value: 10 },
    { epochMs: MAY_3, value: 20 },
  ];
  const cases = [
    {
      input: { activeEpochMs: MAY_1, policy: "exact" },
      source: observations[0],
    },
    {
      input: { activeEpochMs: MAY_2, policy: "lastKnown" },
      source: observations[0],
    },
    {
      input: {
        activeEpochMs: MAY_3 - 1,
        policy: "nearest",
        toleranceMs: 1,
      },
      source: observations[1],
    },
  ];

  for (const { input, source } of cases) {
    const match = matchTemporalObservation({ observations, ...input });

    assert.equal(Object.isFrozen(match), true, input.policy);
    assert.strictEqual(match.observation, source, input.policy);
    assert.equal(Object.isFrozen(source), false, input.policy);
    assert.throws(() => {
      match.status = "missing";
    }, TypeError, input.policy);
  }
});

test("all matching policies treat observations at the range boundaries as observed", () => {
  const inputs = [
    { policy: "exact" },
    { policy: "lastKnown" },
    { policy: "nearest", toleranceMs: 0 },
    { policy: "interpolate", interpolationAllowed: true },
  ];

  for (const options of inputs) {
    const first = matchTemporalObservation({
      observations: samples,
      activeEpochMs: MAY_1,
      ...options,
    });
    const last = matchTemporalObservation({
      observations: samples,
      activeEpochMs: MAY_3,
      ...options,
    });

    assert.equal(first.status, "observed", options.policy);
    assert.strictEqual(first.observation, samples[0], options.policy);
    assert.equal(last.status, "observed", options.policy);
    assert.strictEqual(last.observation, samples[1], options.policy);
  }
});

test("last-known matching carries only the latest observation at or before the active time", () => {
  const match = matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_2,
    policy: "lastKnown",
  });

  assert.deepEqual(match, {
    status: "carried",
    observation: samples[0],
    sourceEpochMs: MAY_1,
  });
  assert.strictEqual(match.observation, samples[0]);
});

test("last-known matching remains missing before the first observation", () => {
  assert.deepEqual(matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_1 - 1,
    policy: "lastKnown",
  }), missing);
});

test("last-known matching can carry the final observation beyond the observed range", () => {
  const match = matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_4,
    policy: "lastKnown",
  });

  assert.equal(match.status, "carried");
  assert.strictEqual(match.observation, samples[1]);
  assert.equal(match.sourceEpochMs, MAY_3);
});

test("nearest matching preserves the closest observation within tolerance", () => {
  const match = matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_3 - 60_000,
    policy: "nearest",
    toleranceMs: 60_001,
  });

  assert.deepEqual(match, {
    status: "nearest",
    observation: samples[1],
    sourceEpochMs: MAY_3,
  });
  assert.strictEqual(match.observation, samples[1]);
});

test("nearest matching includes an observation exactly on the tolerance boundary", () => {
  const match = matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_3 - 60_000,
    policy: "nearest",
    toleranceMs: 60_000,
  });

  assert.equal(match.status, "nearest");
  assert.strictEqual(match.observation, samples[1]);
  assert.equal(match.sourceEpochMs, MAY_3);
});

test("nearest matching returns missing when every observation is outside tolerance", () => {
  assert.deepEqual(matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_2,
    policy: "nearest",
    toleranceMs: DAY_MS - 1,
  }), missing);
});

test("nearest matching resolves an equidistant tie to the earlier observation", () => {
  const match = matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_2,
    policy: "nearest",
    toleranceMs: DAY_MS,
  });

  assert.equal(match.status, "nearest");
  assert.strictEqual(match.observation, samples[0]);
  assert.equal(match.sourceEpochMs, MAY_1);
});

test("numeric interpolation reports both bounds and uses the active timestamp", () => {
  const observations = [
    { epochMs: MAY_1, value: 10 },
    { epochMs: MAY_3, value: 20 },
  ];
  const match = matchTemporalObservation({
    observations,
    activeEpochMs: MAY_2,
    policy: "interpolate",
    interpolationAllowed: true,
  });

  assert.deepEqual(match, {
    status: "interpolated",
    observation: { value: 15, epochMs: MAY_2 },
    lowerEpochMs: MAY_1,
    upperEpochMs: MAY_3,
  });
  assert.equal(Object.isFrozen(match), true);
  assert.equal(Object.isFrozen(match.observation), true);
  assert.notStrictEqual(match.observation, observations[0]);
  assert.notStrictEqual(match.observation, observations[1]);
  assert.throws(() => {
    match.observation.value = 999;
  }, TypeError);

  observations[0].value = -100;
  observations[1].value = 1_000;
  assert.equal(match.observation.value, 15);
});

test("numeric interpolation does not expose binary floating-point artifacts", () => {
  const match = matchTemporalObservation({
    observations: [
      { epochMs: Date.UTC(2027, 1, 20), value: 1 },
      { epochMs: Date.UTC(2027, 1, 23), value: 7 },
    ],
    activeEpochMs: Date.UTC(2027, 1, 22),
    policy: "interpolate",
    interpolationAllowed: true,
  });

  assert.equal(match.observation.value, 5);
});

test("interpolation normalization preserves endpoints and legitimate decimal, negative, large, small, and recurring precision", () => {
  const interpolate = (lower, upper, activeEpochMs = 1, upperEpochMs = 2) => (
    matchTemporalObservation({
      observations: [
        { epochMs: 0, value: lower },
        { epochMs: upperEpochMs, value: upper },
      ],
      activeEpochMs,
      policy: "interpolate",
      interpolationAllowed: true,
    }).observation.value
  );
  const preciseEndpoint = 1.234567890123456;
  const endpoint = { epochMs: 0, value: preciseEndpoint };
  const exact = matchTemporalObservation({
    observations: [endpoint, { epochMs: 2, value: 2 }],
    activeEpochMs: 0,
    policy: "interpolate",
    interpolationAllowed: true,
  });

  assert.strictEqual(exact.observation, endpoint);
  assert.equal(exact.observation.value, preciseEndpoint);
  assert.equal(interpolate(0.1, 0.5), 0.3);
  assert.equal(interpolate(-7, -1), -4);
  assert.equal(
    interpolate(1_000_000_000_000.25, 1_000_000_000_000.75),
    1_000_000_000_000.5,
  );
  assert.equal(interpolate(1e-12, 3e-12), 2e-12);
  assert.equal(interpolate(0, 1, 1, 3), 0.3333333333333333);
});

test("interpolation fails closed unless the schema explicitly permits it", () => {
  for (const interpolationAllowed of [undefined, false]) {
    assert.throws(
      () => matchTemporalObservation({
        observations: samples,
        activeEpochMs: MAY_2,
        policy: "interpolate",
        interpolationAllowed,
      }),
      /does not permit interpolation/,
    );
  }
});

test("interpolation rejects categorical and non-finite bounding values", () => {
  for (const value of ["10", "alert", Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => matchTemporalObservation({
        observations: [
          { epochMs: MAY_1, value },
          { epochMs: MAY_3, value: 20 },
        ],
        activeEpochMs: MAY_2,
        policy: "interpolate",
        interpolationAllowed: true,
      }),
      /finite numeric observation values/,
      String(value),
    );
  }
});

test("interpolation never extrapolates beyond the observed range", () => {
  for (const activeEpochMs of [MAY_1 - 1, MAY_3 + 1]) {
    assert.deepEqual(matchTemporalObservation({
      observations: samples,
      activeEpochMs,
      policy: "interpolate",
      interpolationAllowed: true,
    }), missing);
  }
});

test("empty observations return the explicit missing state for every valid policy", () => {
  const inputs = [
    { policy: "exact" },
    { policy: "lastKnown" },
    { policy: "nearest", toleranceMs: DAY_MS },
    { policy: "interpolate", interpolationAllowed: true },
  ];

  for (const options of inputs) {
    assert.deepEqual(matchTemporalObservation({
      observations: [],
      activeEpochMs: MAY_2,
      ...options,
    }), missing, options.policy);
  }
});

test("duplicate canonical timestamps must be aggregated before matching", () => {
  assert.throws(
    () => matchTemporalObservation({
      observations: [
        { epochMs: MAY_1, value: 10 },
        { epochMs: MAY_1, value: 12 },
      ],
      activeEpochMs: MAY_1,
      policy: "exact",
    }),
    /Duplicate canonical timestamp/,
  );
});

test("observations must already be sorted by canonical epoch milliseconds", () => {
  assert.throws(
    () => matchTemporalObservation({
      observations: [
        { epochMs: MAY_3, value: 20 },
        { epochMs: MAY_1, value: 10 },
      ],
      activeEpochMs: MAY_2,
      policy: "lastKnown",
    }),
    /sorted by strictly increasing epochMs/,
  );
});

test("canonical timestamps must be finite numbers and are never reparsed from date text", () => {
  for (const epochMs of [undefined, "2027-05-01", Number.NaN, Number.NEGATIVE_INFINITY]) {
    assert.throws(
      () => matchTemporalObservation({
        observations: [{ epochMs, value: 10 }],
        activeEpochMs: MAY_1,
        policy: "exact",
      }),
      /finite numeric epochMs/,
      String(epochMs),
    );
  }
});

test("malformed observation collections and entries are rejected", () => {
  assert.throws(
    () => matchTemporalObservation({
      observations: null,
      activeEpochMs: MAY_1,
      policy: "exact",
    }),
    /observations must be an array/,
  );
  assert.throws(
    () => matchTemporalObservation({
      observations: {},
      activeEpochMs: MAY_1,
      policy: "exact",
    }),
    /observations must be an array/,
  );
  assert.throws(
    () => matchTemporalObservation({
      observations: [null],
      activeEpochMs: MAY_1,
      policy: "exact",
    }),
    /Observation at index 0 must be an object/,
  );
});

test("the active timestamp must be a finite canonical epoch number", () => {
  for (const activeEpochMs of [undefined, "2027-05-02", Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => matchTemporalObservation({
        observations: samples,
        activeEpochMs,
        policy: "exact",
      }),
      /activeEpochMs must be a finite number/,
      String(activeEpochMs),
    );
  }
});

test("nearest matching requires a finite non-negative tolerance", () => {
  for (const toleranceMs of [undefined, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => matchTemporalObservation({
        observations: samples,
        activeEpochMs: MAY_2,
        policy: "nearest",
        toleranceMs,
      }),
      /finite, non-negative toleranceMs/,
      String(toleranceMs),
    );
  }
});

test("a supplied tolerance is rejected when it is negative or non-finite for any policy", () => {
  for (const policy of ["exact", "lastKnown", "interpolate"]) {
    for (const toleranceMs of [-1, Number.NEGATIVE_INFINITY]) {
      assert.throws(
        () => matchTemporalObservation({
          observations: samples,
          activeEpochMs: MAY_2,
          policy,
          toleranceMs,
          interpolationAllowed: true,
        }),
        /toleranceMs must be a finite, non-negative number/,
        `${policy}: ${toleranceMs}`,
      );
    }
  }
});

test("unknown temporal matching policies are rejected even at an exact timestamp", () => {
  assert.throws(
    () => matchTemporalObservation({
      observations: samples,
      activeEpochMs: MAY_1,
      policy: "futureGuess",
    }),
    /Unknown temporal matching policy "futureGuess"/,
  );
});

test("approved policy resolution follows group, member, Scene, and View-session precedence", () => {
  assert.deepEqual(resolveMatchingPolicy({
    groupDefault: MATCHING_POLICY_LABELS.CONCURRENT_ONLY,
    memberFallback: MATCHING_POLICY_LABELS.SNAP_TO_LATEST,
    sceneOverride: MATCHING_POLICY_LABELS.INTERPOLATE,
    sessionOverride: MATCHING_POLICY_LABELS.SNAP_TO_CLOSEST,
  }), {
    policy: "Snap to Closest",
    source: "session",
  });

  assert.deepEqual(resolveMatchingPolicy({
    groupDefault: MATCHING_POLICY_LABELS.CONCURRENT_ONLY,
    memberFallback: MATCHING_POLICY_LABELS.SNAP_TO_LATEST,
    sceneOverride: MATCHING_POLICY_LABELS.INTERPOLATE,
    sessionOverride: MATCHING_POLICY_LABELS.USE_AUTHORED_SETTINGS,
  }), {
    policy: "Interpolate",
    source: "scene",
  });
});

test("approved labels return provenance-rich concurrent, snapped, missing, and unavailable results", () => {
  const concurrent = matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_1,
    policy: MATCHING_POLICY_LABELS.CONCURRENT_ONLY,
  });
  assert.deepEqual(concurrent, {
    status: "concurrent",
    observation: samples[0],
    observationEpochs: [MAY_1],
    signedOffsetMs: 0,
    reason: null,
  });

  assert.deepEqual(matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_2,
    policy: MATCHING_POLICY_LABELS.SNAP_TO_LATEST,
  }), {
    status: "snapped-latest",
    observation: samples[0],
    observationEpochs: [MAY_1],
    signedOffsetMs: -DAY_MS,
    reason: null,
  });

  assert.deepEqual(matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_2,
    policy: MATCHING_POLICY_LABELS.SNAP_TO_CLOSEST,
  }).observation, samples[0]);

  assert.equal(matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_2,
    policy: MATCHING_POLICY_LABELS.CONCURRENT_ONLY,
  }).status, "missing");

  assert.deepEqual(matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_2,
    policy: MATCHING_POLICY_LABELS.INTERPOLATE,
    interpolationAllowed: false,
  }), {
    status: "unavailable",
    observation: null,
    observationEpochs: [],
    signedOffsetMs: null,
    reason: "interpolation-not-supported",
  });
});

test("approved Interpolate requires numeric bounds on both sides and never extrapolates", () => {
  assert.deepEqual(matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_2,
    policy: MATCHING_POLICY_LABELS.INTERPOLATE,
    interpolationAllowed: true,
  }), {
    status: "interpolated",
    observation: { value: 15, epochMs: MAY_2 },
    observationEpochs: [MAY_1, MAY_3],
    signedOffsetMs: null,
    reason: null,
  });

  assert.equal(matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_4,
    policy: MATCHING_POLICY_LABELS.INTERPOLATE,
    interpolationAllowed: true,
  }).status, "missing");
  assert.equal(matchTemporalObservation({
    observations: [samples[0], { epochMs: MAY_3, value: "20" }],
    activeEpochMs: MAY_2,
    policy: MATCHING_POLICY_LABELS.INTERPOLATE,
    interpolationAllowed: true,
  }).status, "unavailable");
});

test("provenance summaries distinguish concurrent, interpolated, same-offset, and mixed dates", () => {
  assert.deepEqual(summarizeTemporalProvenance([
    { status: "concurrent", signedOffsetMs: 0 },
  ], { timeZone: "UTC" }), {
    kind: "concurrent",
    compactLabel: "Concurrent",
    accessibleLabel: "Concurrent",
  });
  assert.deepEqual(summarizeTemporalProvenance([
    { status: "interpolated", signedOffsetMs: null },
  ], { timeZone: "UTC" }), {
    kind: "interpolated",
    compactLabel: "Interpolated",
    accessibleLabel: "Interpolated",
  });
  assert.deepEqual(summarizeTemporalProvenance([
    { status: "snapped-latest", signedOffsetMs: -DAY_MS },
    { status: "snapped-latest", signedOffsetMs: -DAY_MS },
  ], { timeZone: "UTC" }), {
    kind: "single-offset",
    compactLabel: "-1d",
    accessibleLabel: "1 day earlier",
  });
  assert.deepEqual(summarizeTemporalProvenance([
    { status: "snapped-latest", signedOffsetMs: -DAY_MS },
    { status: "snapped-closest", signedOffsetMs: 2 * DAY_MS },
  ], { timeZone: "UTC" }), {
    kind: "mixed-offsets",
    compactLabel: "-1…+2d",
    accessibleLabel: "Mixed dates",
  });
});

test("Scene cadence inherits the group while View and Present overrides remain session-only", () => {
  assert.deepEqual(resolveSecondsPerFrame({ groupDefault: 2.5 }), {
    secondsPerFrame: 2.5,
    source: "group",
    persisted: true,
  });
  assert.deepEqual(resolveSecondsPerFrame({
    groupDefault: 2.5,
    sceneOverride: 1.25,
  }), {
    secondsPerFrame: 1.25,
    source: "scene",
    persisted: true,
  });
  assert.deepEqual(resolveSecondsPerFrame({
    groupDefault: 2.5,
    sceneOverride: 1.25,
    sessionOverride: 0.5,
  }), {
    secondsPerFrame: 0.5,
    source: "session",
    persisted: false,
  });
});
