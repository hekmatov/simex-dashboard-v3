import assert from "node:assert/strict";
import test from "node:test";

import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";

const MAY_1 = Date.UTC(2027, 4, 1);
const MAY_2 = Date.UTC(2027, 4, 2);
const MAY_3 = Date.UTC(2027, 4, 3);
const HOUR_MS = 60 * 60 * 1_000;

function transformations(overrides = {}) {
  return {
    filters: [],
    grouping: [],
    aggregation: null,
    duplicates: null,
    missingValues: "gap",
    ...overrides,
  };
}

function playbackChart(typeId, roles, {
  groupId = "exercise",
  transformOverrides,
} = {}) {
  return {
    typeId,
    roles,
    transformations: transformations(transformOverrides),
    interaction: {
      timeSync: { groupId },
    },
  };
}

function profiled(rows, metadata = {}, interpolationFields = []) {
  const profile = profileDataset(rows, metadata);
  for (const field of interpolationFields) {
    profile.columns.find(({ name }) => name === field).interpolationAllowed = true;
  }
  return profile;
}

function prepare({
  chart,
  rows,
  metadata,
  interpolationFields,
  activeEpochMs = MAY_2,
  groupId = "exercise",
  matching = { policy: "exact" },
}) {
  return prepareChartData({
    chart,
    rows,
    datasetProfile: profiled(rows, metadata, interpolationFields),
    timeContext: { groupId, activeEpochMs, matching },
  });
}

test("a chart outside the active group remains semantically byte-for-byte unchanged", () => {
  const rows = [
    { at: "2027-05-01", value: 10 },
    { at: "2027-05-02", value: 12 },
  ];
  const chart = playbackChart("bar", {
    measurements: { field: "value" },
    observation: { field: "at" },
  });
  const datasetProfile = profiled(rows);
  const baseline = prepareChartData({ chart, rows, datasetProfile });
  const outsideGroup = prepareChartData({
    chart,
    rows,
    datasetProfile,
    timeContext: { groupId: "logistics", activeEpochMs: MAY_2 },
  });

  assert.deepEqual(outsideGroup, baseline);
  assert.equal(Object.hasOwn(outsideGroup.meta, "activeTime"), false);
});

test("snapshot bars match each series independently and preserve carried provenance", () => {
  const rows = [
    { at: "2027-05-01", clinic: "A", value: 10 },
    { at: "2027-05-02", clinic: "A", value: 12 },
    { at: "2027-05-01", clinic: "B", value: 20 },
    { at: "2027-05-03", clinic: "B", value: 24 },
  ];
  const result = prepare({
    chart: playbackChart("bar", {
      measurements: { field: "value" },
      observation: { field: "at" },
      cluster: { field: "clinic" },
    }),
    rows,
    matching: { policy: "lastKnown" },
  });
  const byClinic = Object.fromEntries(result.marks.map((mark) => [mark.cluster, mark]));

  assert.equal(result.status, "ready");
  assert.deepEqual(result.marks.map(({ x }) => x), ["2027-05-02", "2027-05-02"]);
  assert.deepEqual(result.marks.map(({ value }) => value), [12, 20]);
  assert.equal(byClinic.A.active, true);
  assert.equal(byClinic.A.temporalProvenance.status, "observed");
  assert.equal(byClinic.A.temporalProvenance.sourceEpochMs, MAY_2);
  assert.equal(byClinic.B.active, true);
  assert.equal(byClinic.B.temporalProvenance.status, "carried");
  assert.equal(byClinic.B.temporalProvenance.sourceEpochMs, MAY_1);
  assert.equal(byClinic.B.temporalProvenance.activeCanonical, "2027-05-02");
  assert.equal(result.meta.activeTime.mode, "snapshot");
  assert.equal(result.meta.activeTime.status, "mixed");
});

test("multi-measure snapshots match each measurement independently when the first is unavailable", () => {
  const rows = [
    { at: "2027-05-01", admissions: 10, discharges: null },
    { at: "2027-05-02", admissions: null, discharges: 22 },
  ];
  const result = prepare({
    chart: playbackChart("bar", {
      measurements: [
        { field: "admissions", label: "Admissions" },
        { field: "discharges", label: "Discharges" },
      ],
      observation: { field: "at" },
    }),
    rows,
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.marks.map(({ measure, value, temporalProvenance }) => ({
      measure,
      value,
      status: temporalProvenance.status,
      sourceEpochMs: temporalProvenance.sourceEpochMs,
    })),
    [{
      measure: "discharges",
      value: 22,
      status: "observed",
      sourceEpochMs: MAY_2,
    }],
  );
  assert.equal(result.meta.activeTime.status, "mixed");
});

test("trace charts retain history while exposing observed and missing active series states", () => {
  const rows = [
    { at: "2027-05-01", clinic: "A", value: 10 },
    { at: "2027-05-02", clinic: "A", value: 12 },
    { at: "2027-05-01", clinic: "B", value: 20 },
    { at: "2027-05-03", clinic: "B", value: 24 },
  ];
  const result = prepare({
    chart: playbackChart("line", {
      measurements: { field: "value" },
      observation: { field: "at" },
      cluster: { field: "clinic" },
    }),
    rows,
  });
  const activeMarks = result.marks.filter(({ active }) => active === true);
  const clinicB = result.marks.filter(({ cluster }) => cluster === "B");

  assert.equal(result.status, "ready");
  assert.equal(result.marks.length, rows.length);
  assert.deepEqual(result.marks.map(({ x, value }) => [x, value]), [
    ["2027-05-01", 10],
    ["2027-05-02", 12],
    ["2027-05-01", 20],
    ["2027-05-03", 24],
  ]);
  assert.equal(activeMarks.length, 1);
  assert.equal(activeMarks[0].cluster, "A");
  assert.equal(activeMarks[0].temporalProvenance.status, "observed");
  assert.ok(clinicB.every(({ active }) => active === false));
  assert.ok(clinicB.every(({ temporalProvenance }) => temporalProvenance.status === "missing"));
  assert.equal(result.meta.activeTime.mode, "trace");
  assert.equal(result.meta.activeTime.status, "mixed");
});

test("multi-measure traces retain measurement-specific observed and missing provenance", () => {
  const rows = [
    { at: "2027-05-01", admissions: 10, discharges: null },
    { at: "2027-05-02", admissions: null, discharges: 22 },
  ];
  const result = prepare({
    chart: playbackChart("line", {
      measurements: [
        { field: "admissions", label: "Admissions" },
        { field: "discharges", label: "Discharges" },
      ],
      observation: { field: "at" },
    }),
    rows,
  });
  const byMeasure = Object.fromEntries(result.marks.map((mark) => [mark.measure, mark]));

  assert.equal(result.status, "ready");
  assert.equal(byMeasure.admissions.active, false);
  assert.equal(byMeasure.admissions.temporalProvenance.status, "missing");
  assert.equal(byMeasure.discharges.active, true);
  assert.equal(byMeasure.discharges.temporalProvenance.status, "observed");
  assert.equal(byMeasure.discharges.temporalProvenance.sourceEpochMs, MAY_2);
  assert.equal(result.meta.activeTime.status, "mixed");
});

test("an exact snapshot miss is empty with a bounded actionable diagnostic", () => {
  const rows = [
    { at: "2027-05-01", value: 10 },
    { at: "2027-05-03", value: 14 },
  ];
  const result = prepare({
    chart: playbackChart("kpi", {
      value: { field: "value" },
      time: { field: "at" },
    }),
    rows,
  });
  const noMeasurement = result.diagnostics.find(({ message }) => (
    /No measurement at this time/.test(message)
  ));

  assert.equal(result.status, "empty");
  assert.deepEqual(result.marks, []);
  assert.ok(noMeasurement);
  assert.ok(noMeasurement.message.length <= 240);
  assert.equal(result.meta.activeTime.status, "missing");
  assert.equal(result.meta.activeTime.canonical, "2027-05-02");
});

test("nearest and interpolation project snapshot values with exact source and bound provenance", () => {
  const rows = [
    { at: "2027-05-01", value: 10 },
    { at: "2027-05-03", value: 30 },
  ];
  const nearestActive = MAY_3 - HOUR_MS;
  const nearest = prepare({
    chart: playbackChart("kpi", {
      value: { field: "value" },
      time: { field: "at" },
    }),
    rows,
    activeEpochMs: nearestActive,
    matching: { policy: "nearest", toleranceMs: 2 * HOUR_MS },
  });
  const interpolated = prepare({
    chart: playbackChart("kpi", {
      value: { field: "value", interpolationAllowed: true },
      time: { field: "at" },
    }),
    rows,
    interpolationFields: ["value"],
    matching: { policy: "interpolate" },
  });

  assert.equal(nearest.marks[0].value, 30);
  assert.equal(nearest.marks[0].time, "2027-05-02T23:00:00.000Z");
  assert.equal(nearest.marks[0].temporalProvenance.status, "nearest");
  assert.equal(nearest.marks[0].temporalProvenance.sourceEpochMs, MAY_3);
  assert.equal(nearest.meta.activeTime.status, "nearest");

  assert.equal(interpolated.marks[0].value, 20);
  assert.equal(interpolated.marks[0].time, "2027-05-02");
  assert.equal(interpolated.marks[0].temporalProvenance.status, "interpolated");
  assert.equal(interpolated.marks[0].temporalProvenance.lowerEpochMs, MAY_1);
  assert.equal(interpolated.marks[0].temporalProvenance.upperEpochMs, MAY_3);
  assert.equal(interpolated.meta.activeTime.status, "interpolated");
});

test("DD/MM profile-backed time and duplicate aggregation run before exact projection", () => {
  const rows = [
    { at: "01/05/2027", value: 2 },
    { at: "02/05/2027", value: 3 },
    { at: "02/05/2027", value: 4 },
  ];
  const result = prepare({
    chart: playbackChart("kpi", {
      value: { field: "value" },
      time: {
        field: "at",
        interpretation: "temporal",
        format: "DD/MM/YYYY",
      },
    }, {
      transformOverrides: {
        aggregation: "sum",
        duplicates: "aggregate",
      },
    }),
    rows,
    metadata: {
      at: {
        interpretation: "temporal",
        format: "DD/MM/YYYY",
        timezone: "date-only",
      },
    },
  });

  assert.equal(result.status, "ready");
  assert.equal(result.marks[0].value, 7);
  assert.equal(result.marks[0].time, "2027-05-02");
  assert.equal(result.marks[0].temporalProvenance.status, "observed");
  assert.equal(result.meta.duplicateGroupCount, 1);
});

test("a malformed active context fails closed through normal invalid-result semantics", () => {
  const rows = [{ at: "2027-05-01", value: 10 }];
  const result = prepareChartData({
    chart: playbackChart("kpi", {
      value: { field: "value" },
      time: { field: "at" },
    }),
    rows,
    datasetProfile: profiled(rows),
    timeContext: { groupId: "exercise", activeEpochMs: "2027-05-01" },
  });

  assert.equal(result.status, "invalid");
  assert.deepEqual(result.marks, []);
  assert.ok(result.diagnostics.some(({ code }) => code === "invalid-time-context"));
});

test("active playback fails closed when no effective group or member matching contract is supplied", () => {
  const rows = [{ at: "2027-05-01", value: 10 }];
  const result = prepareChartData({
    chart: playbackChart("kpi", {
      value: { field: "value" },
      time: { field: "at" },
    }),
    rows,
    datasetProfile: profiled(rows),
    timeContext: { groupId: "exercise", activeEpochMs: MAY_1 },
  });
  const diagnostic = result.diagnostics.find(({ code }) => code === "invalid-time-matching");

  assert.equal(result.status, "invalid");
  assert.deepEqual(result.marks, []);
  assert.ok(diagnostic);
  assert.match(diagnostic.message, /group or member matching policy/i);
  assert.ok(diagnostic.message.length <= 240);
});

test("direct playback preparation rejects chart-local matching even when context matching exists", () => {
  const rows = [{ at: "2027-05-01", value: 10 }];
  const result = prepareChartData({
    chart: {
      ...playbackChart("kpi", {
      value: { field: "value" },
      time: { field: "at" },
      }),
      interaction: {
        timeSync: { groupId: "exercise", policy: "lastKnown" },
      },
    },
    rows,
    datasetProfile: profiled(rows),
    timeContext: {
      groupId: "exercise",
      activeEpochMs: MAY_1,
      matching: { policy: "exact" },
    },
  });

  assert.equal(result.status, "invalid");
  assert.deepEqual(result.marks, []);
  assert.ok(result.diagnostics.some(({ code, message }) => (
    code === "invalid-time-membership"
    && /membership.*groupId/i.test(message)
  )), JSON.stringify(result.diagnostics));
});

test("chart-local matching is rejected before inactive or different-group playback can bypass validation", () => {
  const rows = [{ at: "2027-05-01", value: 10 }];
  const chart = {
    ...playbackChart("kpi", {
      value: { field: "value" },
      time: { field: "at" },
    }),
    interaction: {
      timeSync: { groupId: "exercise", policy: "lastKnown" },
    },
  };
  const datasetProfile = profiled(rows);

  for (const timeContext of [
    undefined,
    { groupId: "logistics", activeEpochMs: MAY_1, matching: { policy: "exact" } },
  ]) {
    const result = prepareChartData({
      chart,
      rows,
      datasetProfile,
      timeContext,
    });
    const diagnostic = result.diagnostics.find(({ code }) => (
      code === "invalid-time-membership"
    ));

    assert.equal(result.status, "invalid");
    assert.deepEqual(result.marks, []);
    assert.ok(diagnostic);
    assert.ok(diagnostic.message.length <= 240);
  }
});

test("playback membership rejects inherited, executable, symbolic, and custom-prototype fields", () => {
  const rows = [{ at: "2027-05-01", value: 10 }];
  const datasetProfile = profiled(rows);
  let accessorReads = 0;
  const accessor = {};
  Object.defineProperty(accessor, "groupId", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return "exercise";
    },
  });
  const inherited = Object.create({ groupId: "exercise" });
  const symbolic = { groupId: "exercise" };
  symbolic[Symbol("hidden")] = true;

  for (const timeSync of [inherited, accessor, symbolic]) {
    const result = prepareChartData({
      chart: {
        ...playbackChart("kpi", {
          value: { field: "value" },
          time: { field: "at" },
        }),
        interaction: { timeSync },
      },
      rows,
      datasetProfile,
    });
    assert.equal(result.status, "invalid");
    assert.ok(result.diagnostics.some(({ code }) => (
      code === "invalid-time-membership"
    )), JSON.stringify(result.diagnostics));
  }
  assert.equal(accessorReads, 0);
});

test("active projection rejects malformed effective group or member matching contracts", () => {
  const rows = [{ at: "2027-05-01", value: 10 }];
  const chart = playbackChart("kpi", {
    value: { field: "value" },
    time: { field: "at" },
  });
  const datasetProfile = profiled(rows);
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

  for (const matching of [
    inherited,
    accessor,
    symbolic,
    { policy: "exact", unexpected: true },
    { policy: "closest" },
    { policy: "nearest" },
    { policy: "nearest", toleranceMs: -1 },
    { policy: "exact", toleranceMs: 0 },
  ]) {
    const result = prepareChartData({
      chart,
      rows,
      datasetProfile,
      timeContext: {
        groupId: "exercise",
        activeEpochMs: MAY_1,
        matching,
      },
    });
    const diagnostic = result.diagnostics.find(({ code }) => (
      code === "invalid-time-matching"
    ));

    assert.equal(result.status, "invalid");
    assert.deepEqual(result.marks, []);
    assert.ok(diagnostic, JSON.stringify(result.diagnostics));
    assert.ok(diagnostic.message.length <= 240);
  }
  assert.equal(accessorReads, 0);
});

test("a finite out-of-range active epoch returns a bounded invalid-context diagnostic", () => {
  const rows = [{ at: "2027-05-01", value: 10 }];
  const result = prepareChartData({
    chart: playbackChart("kpi", {
      value: { field: "value" },
      time: { field: "at" },
    }),
    rows,
    datasetProfile: profiled(rows),
    timeContext: { groupId: "exercise", activeEpochMs: Number.MAX_SAFE_INTEGER },
  });
  const diagnostic = result.diagnostics.find(({ code }) => code === "invalid-time-context");

  assert.equal(result.status, "invalid");
  assert.deepEqual(result.marks, []);
  assert.ok(diagnostic);
  assert.match(diagnostic.message, /supported date range/);
  assert.ok(diagnostic.message.length <= 240);
});

test("playback deltas select the active value and latest distinct preceding observation, never target", () => {
  const rows = [
    { at: "2027-05-01", value: 10, target: 999 },
    { at: "2027-05-02", value: 14, target: 999 },
    { at: "2027-05-03", value: 18, target: 999 },
  ];
  const result = prepare({
    chart: playbackChart("deltaCard", {
      measurement: { field: "value" },
      time: { field: "at" },
      target: { field: "target" },
    }),
    rows,
  });
  const mark = result.marks[0];

  assert.equal(result.status, "ready");
  assert.equal(mark.displayed, 14);
  assert.equal(mark.displayedTime, "2027-05-02");
  assert.equal(mark.comparison, 10);
  assert.equal(mark.comparisonTime, "2027-05-01");
  assert.notEqual(mark.comparison, mark.target);
  assert.deepEqual(mark.delta, { absolute: 4, percentage: 40 });
  assert.equal(mark.temporalProvenance.status, "observed");
  assert.equal(mark.temporalProvenance.sourceEpochMs, MAY_2);
  assert.equal(mark.temporalProvenance.comparison.sourceEpochMs, MAY_1);
});

test("interpolated playback deltas retain the latest distinct preceding observation as baseline", () => {
  const rows = [
    { at: "2027-05-01", value: 10, target: 999 },
    { at: "2027-05-03", value: 30, target: 999 },
  ];
  const result = prepare({
    chart: playbackChart("deltaCard", {
      measurement: { field: "value", interpolationAllowed: true },
      time: { field: "at" },
      target: { field: "target" },
    }),
    rows,
    interpolationFields: ["value"],
    matching: { policy: "interpolate" },
  });
  const mark = result.marks[0];

  assert.equal(result.status, "ready");
  assert.equal(mark.displayed, 20);
  assert.equal(mark.displayedTime, "2027-05-02");
  assert.equal(mark.comparison, 10);
  assert.equal(mark.comparisonTime, "2027-05-01");
  assert.notEqual(mark.comparison, mark.target);
  assert.deepEqual(mark.delta, { absolute: 10, percentage: 100 });
  assert.equal(mark.temporalProvenance.status, "interpolated");
  assert.equal(mark.temporalProvenance.lowerEpochMs, MAY_1);
  assert.equal(mark.temporalProvenance.upperEpochMs, MAY_3);
  assert.equal(mark.temporalProvenance.comparison.sourceEpochMs, MAY_1);
  assert.equal(mark.temporalProvenance.comparison.activeEpochMs, MAY_1);
});

test("playback projection does not mutate chart, rows, profile, or time context", () => {
  const rows = [
    { at: "2027-05-01", value: 10 },
    { at: "2027-05-02", value: 12 },
  ];
  const chart = playbackChart("kpi", {
    value: { field: "value" },
    time: { field: "at" },
  });
  const datasetProfile = profiled(rows);
  const timeContext = {
    groupId: "exercise",
    activeEpochMs: MAY_2,
    matching: { policy: "exact" },
  };
  const before = structuredClone({ chart, rows, datasetProfile, timeContext });

  const result = prepareChartData({
    chart,
    rows,
    datasetProfile,
    timeContext,
  });

  assert.deepEqual({ chart, rows, datasetProfile, timeContext }, before);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.marks[0].temporalProvenance), true);
});
