import assert from "node:assert/strict";
import test from "node:test";

import { matchTemporalObservation } from "../src/charting/time/temporalMatch.js";

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
  assert.deepEqual(matchTemporalObservation({
    observations: samples,
    activeEpochMs: MAY_2,
  }), missing);
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

test("nearest matching rejects an equidistant tie instead of choosing an arbitrary observation", () => {
  assert.throws(
    () => matchTemporalObservation({
      observations: samples,
      activeEpochMs: MAY_2,
      policy: "nearest",
      toleranceMs: DAY_MS,
    }),
    /Nearest temporal match is ambiguous/,
  );
});

test("numeric interpolation reports both bounds and uses the active timestamp", () => {
  const match = matchTemporalObservation({
    observations: samples,
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
  assert.notStrictEqual(match.observation, samples[0]);
  assert.notStrictEqual(match.observation, samples[1]);
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
