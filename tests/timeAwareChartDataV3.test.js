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
  transformOverrides,
} = {}) {
  return {
    typeId,
    roles,
    transformations: transformations(transformOverrides),
    interaction: {
      timeSync: null,
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

test("a chart without a supplied playback context remains semantically byte-for-byte unchanged", () => {
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
  const withoutContext = prepareChartData({
    chart,
    rows,
    datasetProfile,
  });

  assert.deepEqual(withoutContext, baseline);
  assert.equal(Object.hasOwn(withoutContext.meta, "activeTime"), false);
});

test("temporal KPI, Gauge, and Bullet collections use latest static values and active playback snapshots per entity", () => {
  const rows = [
    { at: "2027-05-01", entity: "A", value: 10, target: 40 },
    { at: "2027-05-01", entity: "B", value: 20, target: 40 },
    { at: "2027-05-02", entity: "A", value: 30, target: 40 },
    { at: "2027-05-02", entity: "B", value: 5, target: 40 },
  ];
  const datasetProfile = profiled(rows, {
    at: { interpretation: "temporal", format: "YYYY-MM-DD" },
  });

  for (const typeId of ["kpi", "gauge", "bullet"]) {
    const primaryRole = typeId === "bullet" ? "actual" : "value";
    const chart = playbackChart(typeId, {
      [primaryRole]: { field: "value" },
      target: { field: "target" },
      entity: { field: "entity" },
      time: { field: "at", interpretation: "temporal" },
    });
    const staticResult = prepareChartData({ chart, rows, datasetProfile });
    const playbackResult = prepare({
      chart,
      rows,
      metadata: {
        at: { interpretation: "temporal", format: "YYYY-MM-DD" },
      },
      activeEpochMs: MAY_1,
    });
    const primaryField = typeId === "bullet" ? "actual" : "value";

    assert.equal(staticResult.status, "ready", `${typeId} static status`);
    assert.deepEqual(
      staticResult.marks.map((mark) => [mark.entity, mark[primaryField], mark.time]),
      [["A", 30, "2027-05-02"], ["B", 5, "2027-05-02"]],
      `${typeId} static latest values`,
    );
    assert.equal(playbackResult.status, "ready", `${typeId} playback status`);
    assert.deepEqual(
      playbackResult.marks.map((mark) => [mark.entity, mark[primaryField], mark.time]),
      [["A", 10, "2027-05-01"], ["B", 20, "2027-05-01"]],
      `${typeId} active snapshot`,
    );
    assert.ok(playbackResult.marks.every(({ active }) => active === true));
  }
});

test("same-time target collection duplicates remain fail-closed", () => {
  const rows = [
    { at: "2027-05-01", entity: "A", actual: 10, target: 40 },
    { at: "2027-05-01", entity: "A", actual: 20, target: 40 },
  ];
  const result = prepareChartData({
    chart: playbackChart("bullet", {
      actual: { field: "actual" },
      target: { field: "target" },
      entity: { field: "entity" },
      time: { field: "at", interpretation: "temporal" },
    }),
    rows,
    datasetProfile: profiled(rows, {
      at: { interpretation: "temporal", format: "YYYY-MM-DD" },
    }),
  });

  assert.equal(result.status, "invalid");
  assert.deepEqual(result.marks, []);
  assert.ok(result.diagnostics.some(({ message }) => /duplicate/i.test(message)));
});

test("Delta Card and Delta List retain prior history for static and playback comparisons", () => {
  const cardRows = [
    { at: "2027-05-01", value: 10 },
    { at: "2027-05-02", value: 14 },
  ];
  const listRows = [
    { at: "2027-05-01", entity: "A", value: 10 },
    { at: "2027-05-02", entity: "A", value: 14 },
    { at: "2027-05-01", entity: "B", value: 20 },
    { at: "2027-05-02", entity: "B", value: 15 },
  ];
  for (const [typeId, rows, entityRole] of [
    ["deltaCard", cardRows, {}],
    ["deltaList", listRows, { entity: { field: "entity" } }],
  ]) {
    const chart = playbackChart(typeId, {
      measurement: { field: "value" },
      time: { field: "at", interpretation: "temporal" },
      ...entityRole,
    }, {
      transformOverrides: {
        comparison: { mode: "previousObservation" },
      },
    });
    const metadata = {
      at: { interpretation: "temporal", format: "YYYY-MM-DD" },
    };
    const staticResult = prepareChartData({
      chart,
      rows,
      datasetProfile: profiled(rows, metadata),
    });
    const playbackResult = prepare({ chart, rows, metadata });
    const expected = typeId === "deltaCard"
      ? [[null, 14, 10, 4]]
      : [["A", 14, 10, 4], ["B", 15, 20, -5]];
    const select = ({ entity = null, displayed, comparison, delta }) => [
      entity,
      displayed,
      comparison,
      delta.absolute,
    ];

    assert.equal(staticResult.status, "ready", `${typeId} static status`);
    assert.deepEqual(staticResult.marks.map(select), expected);
    assert.equal(playbackResult.status, "ready", `${typeId} playback status`);
    assert.deepEqual(playbackResult.marks.map(select), expected);
  }
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

test("large duplicate-aggregated traces project rows without argument-stack overflow", () => {
  const rows = Array.from({ length: 150_000 }, (_, index) => ({
    at: index % 2 === 0 ? "2027-05-01" : "2027-05-02",
    value: 1,
  }));
  const result = prepare({
    chart: playbackChart("line", {
      measurements: { field: "value" },
      observation: { field: "at", interpretation: "temporal" },
    }, {
      transformOverrides: {
        aggregation: "sum",
        duplicates: "aggregate",
      },
    }),
    rows,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.marks.length, 2);
  assert.equal(result.meta.activeTime.mode, "trace");
  assert.deepEqual(result.marks.map(({ value }) => value), [75_000, 75_000]);
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

test("a supplied playback context is authoritative without a chart backlink", () => {
  const rows = [{ at: "2027-05-01", value: 10 }];
  const result = prepareChartData({
    chart: playbackChart("kpi", {
      value: { field: "value" },
      time: { field: "at" },
    }),
    rows,
    datasetProfile: profiled(rows),
    timeContext: {
      groupId: "exercise",
      activeEpochMs: MAY_1,
      matching: { policy: "exact" },
    },
  });

  assert.equal(result.status, "ready");
  assert.equal(result.marks[0].value, 10);
  assert.equal(result.meta.activeTime.groupId, "exercise");
});

test("playback projection never reads legacy chart timeSync state", () => {
  const rows = [{ at: "2027-05-01", value: 10 }];
  const chart = playbackChart("kpi", {
    value: { field: "value" },
    time: { field: "at" },
  });
  const datasetProfile = profiled(rows);
  let timeSyncReads = 0;
  Object.defineProperty(chart.interaction, "timeSync", {
    configurable: true,
    enumerable: true,
    get() {
      timeSyncReads += 1;
      throw new Error("legacy chart backlink was read");
    },
  });
  const result = prepareChartData({
    chart,
    rows,
    datasetProfile,
    timeContext: {
      groupId: "exercise",
      activeEpochMs: MAY_1,
      matching: { policy: "exact" },
    },
  });

  assert.equal(result.status, "ready");
  assert.equal(timeSyncReads, 0);
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
    }, {
      transformOverrides: {
        comparison: { mode: "previousObservation" },
      },
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
    }, {
      transformOverrides: {
        comparison: { mode: "previousObservation" },
      },
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
