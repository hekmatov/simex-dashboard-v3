import assert from "node:assert/strict";
import test from "node:test";

import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";

const resolverModule = await import(
  "../src/charting/data/resolveDeltaComparison.js"
).catch(() => ({}));
const resolveDeltaComparison = resolverModule.resolveDeltaComparison
  ?? (() => {
    throw new Error("resolveDeltaComparison is not implemented.");
  });

const DAY_MS = 24 * 60 * 60 * 1_000;
const MAY_1 = Date.UTC(2027, 4, 1);
const MAY_2 = Date.UTC(2027, 4, 2);
const MAY_3 = Date.UTC(2027, 4, 3);

function observations(values = [10, 20, 30]) {
  return values.map((value, index) => ({
    epochMs: MAY_1 + index * DAY_MS,
    canonical: `2027-05-0${index + 1}`,
    entity: "Clinic A",
    value,
    target: 999,
  }));
}

function deltaChart({
  interpolationAllowed = false,
  comparison = { mode: "previousObservation" },
  timeSync = null,
} = {}) {
  return {
    id: "clinic-change",
    typeId: "deltaCard",
    roles: {
      measurement: {
        field: "value",
        ...(interpolationAllowed ? { interpolationAllowed: true } : {}),
      },
      time: { field: "at" },
      target: { field: "target" },
    },
    transformations: {
      filters: [],
      grouping: [],
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
      comparison,
    },
    interaction: {
      timeSync,
    },
  };
}

function comparisonProfile({
  measurementType = "number",
  interpolationAllowed = false,
} = {}) {
  return {
    columns: [
      {
        name: "value",
        type: measurementType,
        ...(interpolationAllowed ? { interpolationAllowed: true } : {}),
      },
      { name: "at", type: "temporal" },
      { name: "target", type: "number" },
    ],
  };
}

function resolve({
  source = observations(),
  displayed = source.at(-1),
  comparison = { mode: "previousObservation" },
  chart = deltaChart({ comparison }),
  profile = comparisonProfile(),
} = {}) {
  return resolveDeltaComparison({
    observations: source,
    displayed,
    comparison,
    chart,
    timeRole: "time",
    profile,
  });
}

test("previous-observation comparison selects the distinct preceding observation", () => {
  const result = resolve();

  assert.equal(result.status, "matched");
  assert.equal(result.observation.value, 20);
  assert.equal(result.observation.epochMs, MAY_2);
  assert.deepEqual(result.provenance, {
    status: "observed",
    activeEpochMs: MAY_2,
    activeCanonical: "2027-05-02",
    sourceEpochMs: MAY_2,
    sourceCanonical: "2027-05-02",
  });
});

test("fixed exact comparison selects the requested observation", () => {
  const result = resolve({
    comparison: {
      mode: "fixedTime",
      at: "2027-05-01T00:00:00.000Z",
      matching: { policy: "exact" },
    },
  });

  assert.equal(result.status, "matched");
  assert.equal(result.observation.value, 10);
  assert.equal(result.observation.epochMs, MAY_1);
  assert.equal(result.provenance.status, "observed");
  assert.equal(result.provenance.activeEpochMs, MAY_1);
  assert.equal(result.provenance.sourceEpochMs, MAY_1);
});

test("fixed last-known comparison identifies both the requested and carried times", () => {
  const result = resolve({
    comparison: {
      mode: "fixedTime",
      at: "2027-05-02T12:00:00.000Z",
      matching: { policy: "lastKnown" },
    },
  });

  assert.equal(result.status, "matched");
  assert.equal(result.observation.value, 20);
  assert.equal(result.provenance.status, "carried");
  assert.equal(result.provenance.activeEpochMs, MAY_2 + DAY_MS / 2);
  assert.equal(result.provenance.sourceEpochMs, MAY_2);
});

test("fixed nearest comparison respects tolerance and reports an absent baseline outside it", () => {
  const source = observations([10, 20, 30, 40]);
  const within = resolve({
    source,
    displayed: source.at(-1),
    comparison: {
      mode: "fixedTime",
      at: "2027-05-02T18:00:00.000Z",
      matching: { policy: "nearest", toleranceMs: 7 * 60 * 60 * 1_000 },
    },
  });
  const outside = resolve({
    source,
    displayed: source.at(-1),
    comparison: {
      mode: "fixedTime",
      at: "2027-05-02T18:00:00.000Z",
      matching: { policy: "nearest", toleranceMs: 5 * 60 * 60 * 1_000 },
    },
  });

  assert.equal(within.status, "matched");
  assert.equal(within.observation.epochMs, MAY_3);
  assert.equal(within.provenance.status, "nearest");
  assert.equal(outside.status, "missing");
  assert.equal(outside.diagnostic.severity, "warning");
  assert.equal(outside.diagnostic.code, "delta-comparison-missing");
});

test("equidistant nearest comparison is explicitly invalid", () => {
  const result = resolve({
    comparison: {
      mode: "fixedTime",
      at: "2027-05-01T12:00:00.000Z",
      matching: { policy: "nearest", toleranceMs: DAY_MS },
    },
  });

  assert.equal(result.status, "invalid");
  assert.equal(result.diagnostic.severity, "error");
  assert.match(result.diagnostic.message, /ambiguous|equidistant/i);
});

test("authorized numeric interpolation uses both bounds and records provenance", () => {
  const source = [observations()[0], observations()[2]];
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-02T00:00:00.000Z",
    matching: { policy: "interpolate" },
  };
  const result = resolve({
    source,
    displayed: source[1],
    comparison,
    chart: deltaChart({ comparison, interpolationAllowed: true }),
    profile: comparisonProfile({ interpolationAllowed: true }),
  });

  assert.equal(result.status, "matched");
  assert.equal(result.observation.value, 20);
  assert.equal(result.observation.epochMs, MAY_2);
  assert.equal(result.provenance.status, "interpolated");
  assert.equal(result.provenance.lowerEpochMs, MAY_1);
  assert.equal(result.provenance.upperEpochMs, MAY_3);
});

test("numeric values alone never authorize interpolation", () => {
  const source = [observations()[0], observations()[2]];
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-02T00:00:00.000Z",
    matching: { policy: "interpolate" },
  };
  const result = resolve({ source, displayed: source[1], comparison });

  assert.equal(result.status, "invalid");
  assert.match(result.diagnostic.message, /explicitly permit interpolation/i);
});

test("profile-authorized numeric interpolation succeeds without a binding flag", () => {
  const source = [observations()[0], observations()[2]];
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-02T00:00:00.000Z",
    matching: { policy: "interpolate" },
  };
  const result = resolve({
    source,
    displayed: source[1],
    comparison,
    profile: comparisonProfile({ interpolationAllowed: true }),
  });

  assert.equal(result.status, "matched");
  assert.equal(result.observation.value, 20);
});

test("categorical, extrapolated, and non-finite interpolation cannot create a baseline", () => {
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-02T00:00:00.000Z",
    matching: { policy: "interpolate" },
  };
  const categorical = resolve({
    source: [
      { ...observations()[0], value: "open" },
      { ...observations()[2], value: "closed" },
    ],
    displayed: { ...observations()[2], value: "closed" },
    comparison,
    chart: deltaChart({ comparison, interpolationAllowed: true }),
    profile: comparisonProfile({
      measurementType: "category",
      interpolationAllowed: true,
    }),
  });
  const extrapolated = resolve({
    source: [observations()[1], observations()[2]],
    comparison: {
      ...comparison,
      at: "2027-05-01T00:00:00.000Z",
    },
    chart: deltaChart({
      comparison: { ...comparison, at: "2027-05-01T00:00:00.000Z" },
      interpolationAllowed: true,
    }),
    profile: comparisonProfile({ interpolationAllowed: true }),
  });
  const nonFinite = resolve({
    source: [
      { ...observations()[0], value: Number.POSITIVE_INFINITY },
      observations()[2],
    ],
    comparison,
    chart: deltaChart({ comparison, interpolationAllowed: true }),
    profile: comparisonProfile({ interpolationAllowed: true }),
  });

  assert.equal(categorical.status, "invalid");
  assert.match(categorical.diagnostic.message, /numeric measure|interpolation/i);
  assert.equal(extrapolated.status, "missing");
  assert.equal(nonFinite.status, "invalid");
  assert.match(nonFinite.diagnostic.message, /finite numeric/i);
});

test("fixed baselines at or after the displayed observation fail actionably", () => {
  for (const at of [
    "2027-05-03T00:00:00.000Z",
    "2027-05-04T00:00:00.000Z",
  ]) {
    const result = resolve({
      comparison: {
        mode: "fixedTime",
        at,
        matching: { policy: "lastKnown" },
      },
    });
    assert.equal(result.status, "invalid");
    assert.match(result.diagnostic.message, /strictly before the displayed observation/i);
    assert.ok(result.diagnostic.message.length <= 240);
  }
});

test("resolver does not mutate observations, chart configuration, or profile", () => {
  const source = observations();
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-01T00:00:00.000Z",
    matching: { policy: "exact" },
  };
  const chart = deltaChart({ comparison });
  const profile = comparisonProfile();
  const before = structuredClone({ source, comparison, chart, profile });

  const result = resolve({
    source,
    displayed: source.at(-1),
    comparison,
    chart,
    profile,
  });

  assert.equal(result.status, "matched");
  assert.deepEqual({ source, comparison, chart, profile }, before);
});

function realProfile(rows, { interpolationAllowed = false } = {}) {
  const profile = profileDataset(rows);
  if (interpolationAllowed) {
    profile.columns.find(({ name }) => name === "value").interpolationAllowed = true;
  }
  return profile;
}

test("static fixed-time Delta comparison uses the configured baseline and never the target", () => {
  const rows = [
    { at: "2027-05-01", value: 10, target: 999 },
    { at: "2027-05-02", value: 20, target: 999 },
    { at: "2027-05-03", value: 30, target: 999 },
  ];
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-01T00:00:00.000Z",
    matching: { policy: "exact" },
  };
  const result = prepareChartData({
    chart: deltaChart({ comparison }),
    rows,
    datasetProfile: realProfile(rows),
  });

  assert.equal(result.status, "ready");
  assert.equal(result.marks[0].displayed, 30);
  assert.equal(result.marks[0].comparison, 10);
  assert.notEqual(result.marks[0].comparison, result.marks[0].target);
  assert.equal(result.marks[0].comparisonProvenance.status, "observed");
  assert.equal(result.marks[0].comparisonProvenance.sourceEpochMs, MAY_1);
});

test("static and playback paths resolve the same fixed baseline and provenance", () => {
  const rows = [
    { at: "2027-05-01", value: 10, target: 999 },
    { at: "2027-05-03", value: 30, target: 999 },
    { at: "2027-05-04", value: 40, target: 999 },
  ];
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-02T00:00:00.000Z",
    matching: { policy: "interpolate" },
  };
  const staticChart = deltaChart({ comparison, interpolationAllowed: true });
  const profile = realProfile(rows, { interpolationAllowed: true });
  const staticResult = prepareChartData({
    chart: staticChart,
    rows: rows.slice(0, 2),
    datasetProfile: profileDataset(rows.slice(0, 2), {
      value: { interpolationAllowed: true },
    }),
  });
  const playbackResult = prepareChartData({
    chart: {
      ...staticChart,
      interaction: { timeSync: { groupId: "exercise" } },
    },
    rows,
    datasetProfile: profile,
    timeContext: {
      groupId: "exercise",
      activeEpochMs: MAY_3,
      matching: { policy: "exact" },
    },
  });

  assert.equal(staticResult.status, "ready");
  assert.equal(playbackResult.status, "ready");
  assert.equal(staticResult.marks[0].displayed, 30);
  assert.equal(playbackResult.marks[0].displayed, 30);
  assert.equal(staticResult.marks[0].comparison, 20);
  assert.equal(playbackResult.marks[0].comparison, 20);
  assert.deepEqual(
    playbackResult.marks[0].comparisonProvenance,
    staticResult.marks[0].comparisonProvenance,
  );
  assert.equal(playbackResult.marks[0].temporalProvenance.status, "observed");
  assert.deepEqual(
    playbackResult.marks[0].temporalProvenance.comparison,
    staticResult.marks[0].comparisonProvenance,
  );
});

test("a missing fixed baseline is explicit and creates no renderer-ready Delta mark", () => {
  const rows = [
    { at: "2027-05-02", value: 20, target: 999 },
    { at: "2027-05-03", value: 30, target: 999 },
  ];
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-01T00:00:00.000Z",
    matching: { policy: "exact" },
  };
  const result = prepareChartData({
    chart: deltaChart({ comparison }),
    rows,
    datasetProfile: realProfile(rows),
  });

  assert.equal(result.status, "empty");
  assert.deepEqual(result.marks, []);
  assert.ok(result.diagnostics.some(({ code, message }) => (
    code === "delta-comparison-missing"
    && /no comparison measurement/i.test(message)
  )));
});

test("an ambiguous fixed baseline is invalid and creates no renderer-ready Delta mark", () => {
  const rows = [
    { at: "2027-05-01", value: 10, target: 999 },
    { at: "2027-05-02", value: 20, target: 999 },
    { at: "2027-05-03", value: 30, target: 999 },
  ];
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-01T12:00:00.000Z",
    matching: { policy: "nearest", toleranceMs: DAY_MS },
  };
  const result = prepareChartData({
    chart: deltaChart({ comparison }),
    rows,
    datasetProfile: realProfile(rows),
  });

  assert.equal(result.status, "invalid");
  assert.deepEqual(result.marks, []);
  assert.ok(result.diagnostics.some(({ code, message }) => (
    code === "invalid-delta-comparison"
    && /ambiguous|equidistant/i.test(message)
  )));
});

test("prepared Delta comparison does not mutate source rows, configuration, or profile", () => {
  const rows = [
    { at: "2027-05-01", value: 10, target: 999 },
    { at: "2027-05-03", value: 30, target: 999 },
  ];
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-02T00:00:00.000Z",
    matching: { policy: "interpolate" },
  };
  const chart = deltaChart({ comparison, interpolationAllowed: true });
  const profile = realProfile(rows, { interpolationAllowed: true });
  const before = structuredClone({ rows, chart, profile });

  const result = prepareChartData({
    chart,
    rows,
    datasetProfile: profile,
  });

  assert.equal(result.status, "ready");
  assert.deepEqual({ rows, chart, profile }, before);
});

test("playback fixed comparison cannot use the displayed point as a nearest baseline", () => {
  const rows = [
    { at: "2027-05-01", value: 10, target: 999 },
    { at: "2027-05-03", value: 30, target: 999 },
    { at: "2027-05-04", value: 40, target: 999 },
  ];
  const comparison = {
    mode: "fixedTime",
    at: "2027-05-02T18:00:00.000Z",
    matching: { policy: "nearest", toleranceMs: DAY_MS },
  };
  const result = prepareChartData({
    chart: {
      ...deltaChart({ comparison }),
      interaction: { timeSync: { groupId: "exercise" } },
    },
    rows,
    datasetProfile: realProfile(rows),
    timeContext: {
      groupId: "exercise",
      activeEpochMs: MAY_3,
      matching: { policy: "exact" },
    },
  });

  assert.equal(result.status, "invalid");
  assert.ok(result.diagnostics.some(({ message }) => (
    /strictly before the displayed observation/i.test(message)
  )));
});
