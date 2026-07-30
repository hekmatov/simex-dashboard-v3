import assert from "node:assert/strict";
import test from "node:test";

import {
  createChartDraft,
  normalizeChartInstance,
  validateChartInstance,
} from "../src/charting/config/chartConfigV3.js";
import { normalizeCollectionSettings } from "../src/charting/collection/collectionModel.js";
import {
  parseDashboardBundle,
  serializeDashboardBundle,
  validateDashboardConfig,
} from "../src/charting/config/dashboardBundleV3.js";

function lineChart(overrides = {}) {
  return {
    configVersion: 3,
    id: "outbreak-trend",
    typeId: "line",
    title: "Confirmed cases",
    description: "Confirmed cases over time.",
    sourceId: "uploaded-cases",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: { field: "reportedAt", interpretation: "temporal" },
    },
    transformations: {
      filters: [],
      grouping: null,
      aggregation: "sum",
      duplicates: "aggregate",
      missingValues: "gap",
    },
    presentation: {
      title: { align: "left" },
      collection: null,
    },
    interaction: {
      zoom: { enabled: true },
      timeSync: { groupId: "outbreak" },
    },
    layout: { size: "wide" },
    ...overrides,
  };
}

function version3Dashboard() {
  return {
    configVersion: 3,
    id: "exercise-dashboard",
    title: "Exercise dashboard",
    dataSources: {
      "uploaded-cases": {
        kind: "dataset",
        type: "uploadedCsv",
        fileName: "cases.csv",
        csvText: "reportedAt,cases\n2027-05-01,4\n",
        parsingMetadata: { reportedAt: { interpretation: "temporal", format: "YYYY-MM-DD" } },
        provenance: { label: "Exercise control" },
        fingerprint: "cases-fingerprint",
      },
      "manual-status": {
        kind: "inline",
        rows: [{ label: "Ready", value: 12 }],
        parsingMetadata: { value: { interpretation: "numeric" } },
        provenance: { label: "Facilitator entry" },
        fingerprint: "manual-fingerprint",
      },
    },
    timeSyncGroups: [{
      id: "outbreak",
      name: "Outbreak playback",
      primaryClock: {
        sourceId: "uploaded-cases",
        timeField: "reportedAt",
      },
      matching: { policy: "exact" },
      members: [{
        chartId: "outbreak-trend",
        timeRole: "observation",
      }],
    }],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{
        id: "outbreak",
        title: "Outbreak",
        panels: [lineChart()],
      }],
    }],
  };
}

function profileOnlyDashboard(temporal) {
  const dashboard = version3Dashboard();
  const temporalValues = Array.isArray(temporal?.values)
    ? temporal.values
    : [];
  const rowCount = temporalValues.length || 1;
  const profileTemporal = temporal && typeof temporal === "object"
    ? {
        ...temporal,
        parsingMetadata: {
          interpretation: "temporal",
          format: "DD/MM/YYYY",
          timezone: "date-only",
        },
      }
    : temporal;
  dashboard.dataSources["uploaded-cases"] = {
    kind: "csv",
    path: "data/profile-only-cases.csv",
    provenance: { label: "Profile-only cases" },
    parsingMetadata: {
      reportedAt: { interpretation: "temporal", format: "DD/MM/YYYY", timezone: "date-only" },
    },
  };
  dashboard.datasetProfiles = {
    "uploaded-cases": {
      sourceId: "uploaded-cases",
      kind: "csv",
      path: "data/profile-only-cases.csv",
      provenance: { label: "Profile-only cases" },
      rowCount,
      fingerprint: "a".repeat(64),
      columns: [
        {
          name: "reportedAt",
          type: "temporal",
          missingCount: temporalValues.filter((value) => value === null).length,
          uniqueCount: new Set(temporalValues.filter((value) => value !== null)).size,
          examples: temporalValues.filter((value) => value !== null).slice(0, 3),
          geographicHint: null,
          temporal: profileTemporal,
        },
        {
          name: "cases",
          type: "numeric",
          missingCount: 0,
          uniqueCount: rowCount > 0 ? 1 : 0,
          examples: rowCount > 0 ? [1] : [],
          geographicHint: null,
        },
      ],
    },
  };
  return dashboard;
}

function pieChart(overrides = {}) {
  return {
    configVersion: 3,
    id: "manual-pie",
    typeId: "pie",
    title: "Manual status",
    description: "Status distribution.",
    sourceId: "manual-status",
    roles: { category: { field: "label" }, value: { field: "value" } },
    transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
    presentation: { title: { align: "left" }, collection: null },
    interaction: { zoom: { enabled: false }, timeSync: null },
    layout: { size: "standard" },
    ...overrides,
  };
}

function kpiChart(overrides = {}) {
  return {
    configVersion: 3,
    id: "status-kpi",
    typeId: "kpi",
    title: "Status",
    description: "Current status.",
    sourceId: "manual-status",
    roles: { value: { field: "value" } },
    transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
    presentation: { title: { align: "left" }, collection: null },
    interaction: { zoom: { enabled: false }, timeSync: null },
    layout: { size: "standard" },
    ...overrides,
  };
}

function deltaListChart(overrides = {}) {
  return {
    configVersion: 3,
    id: "delta-list",
    typeId: "deltaList",
    title: "Delta list",
    description: "Changes by facility.",
    sourceId: "delta-data",
    roles: { measurement: { field: "value" }, entity: { field: "entity" }, time: { field: "at", interpretation: "temporal" } },
    transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap", comparison: { mode: "previousObservation" } },
    presentation: {
      title: { align: "left" },
      collection: {
        layout: "fixed",
        rows: 2,
        columns: 2,
        gap: 8,
        overflow: "manualPages",
        ranking: {
          mode: "sort",
          field: "value",
          direction: "desc",
          stabilize: true,
        },
        carousel: {
          intervalMs: 5000,
          loop: true,
          pauseOnHover: true,
          transition: "fade",
        },
        playback: {
          rerank: false,
          pauseCarousel: false,
        },
      },
    },
    interaction: { zoom: { enabled: false }, timeSync: null },
    layout: { size: "wide" },
    ...overrides,
  };
}

test("version 3 bundles round-trip uploaded and inline sources", () => {
  const dashboard = version3Dashboard();
  const bundle = serializeDashboardBundle(dashboard, {
    now: "2026-07-26T12:00:00.000Z",
  });

  assert.equal(bundle.bundleType, "simex-dashboard-bundle");
  assert.equal(bundle.version, 3);
  assert.equal(bundle.metadata.exportedAt, "2026-07-26T12:00:00.000Z");
  assert.deepEqual(parseDashboardBundle(JSON.stringify(bundle)), dashboard);
});

test("bundle, metadata, and source records are exact version 3 data contracts", () => {
  const bundle = serializeDashboardBundle(version3Dashboard(), {
    now: "2026-07-26T12:00:00.000Z",
  });

  for (const mutate of [
    (candidate) => { candidate.legacyPayload = {}; },
    (candidate) => { candidate.metadata.legacyPayload = {}; },
    (candidate) => {
      candidate.config.dataSources["uploaded-cases"].legacyPayload = {};
    },
    (candidate) => {
      candidate.config.dataSources["uploaded-cases"].provenance.capturedAt = "2027-05-01";
    },
    (candidate) => {
      candidate.config.dataSources["uploaded-cases"].parsingMetadata.reportedAt.example = "2027-05-01";
    },
  ]) {
    const candidate = structuredClone(bundle);
    mutate(candidate);
    assert.throws(
      () => parseDashboardBundle(JSON.stringify(candidate)),
      /unknown .*property/i,
    );
  }
});

test("source validation rejects generic datasets, unsafe tracked paths, and alternate inline shapes", () => {
  for (const source of [
    { kind: "dataset", type: "arbitrary", rows: [{ value: 1 }] },
    {
      kind: "dataset",
      type: "profileSnapshot",
      parsingMetadata: {},
      profile: {
        rowCount: 1,
        columns: [{ name: "value", type: "numeric" }],
      },
    },
    {
      kind: "csv",
      path: "../private.csv",
      provenance: { label: "Unsafe" },
    },
    {
      kind: "geojson",
      path: "data/not-geo.json",
      provenance: { label: "Wrong extension" },
    },
    { kind: "inline", data: [{ label: "Ready", value: 12 }] },
  ]) {
    const dashboard = version3Dashboard();
    dashboard.dataSources["unused-source"] = source;
    assert.throws(
      () => validateDashboardConfig(dashboard),
      /not supported|safe relative public path|\.geojson|unknown.*property|rows/i,
    );
  }
});

test("source validation rejects accessors, custom prototypes, dangerous row keys, and inconsistent profiles without executing getters", () => {
  let reads = 0;
  const source = {};
  Object.defineProperty(source, "kind", {
    enumerable: true,
    get() {
      reads += 1;
      return "inline";
    },
  });
  source.rows = [{ value: 1 }];

  const accessorDashboard = version3Dashboard();
  accessorDashboard.dataSources["unused-source"] = source;
  assert.throws(
    () => validateDashboardConfig(accessorDashboard),
    /data source.*property "kind".*data property/i,
  );
  assert.equal(reads, 0);

  const inheritedDashboard = version3Dashboard();
  inheritedDashboard.dataSources["manual-status"] = Object.assign(
    Object.create({ kind: "inline" }),
    { rows: [{ label: "Ready", value: 12 }] },
  );
  assert.throws(
    () => validateDashboardConfig(inheritedDashboard),
    /data source.*ordinary data object|plain object/i,
  );

  const dangerousDashboard = version3Dashboard();
  dangerousDashboard.dataSources["manual-status"].rows = [
    JSON.parse('{"label":"Ready","value":12,"__proto__":{"polluted":true}}'),
  ];
  assert.throws(
    () => validateDashboardConfig(dangerousDashboard),
    /unsafe property "__proto__"/i,
  );

  const profileDashboard = profileOnlyDashboard({
    values: ["2027-05-01", "2027-05-02"],
    diagnostics: [],
  });
  profileDashboard.datasetProfiles["uploaded-cases"].rowCount = 1;
  assert.throws(
    () => validateDashboardConfig(profileDashboard),
    /rowCount|align|column.*invalid/i,
  );
});

test("version 2 bundles are rejected with an actionable message", () => {
  assert.throws(
    () => parseDashboardBundle(JSON.stringify({ bundleType: "simex-dashboard-v2-bundle", version: 2 })),
    /supports version 3/,
  );
});

test("chart drafts start with the version 3 defaults for the chosen schema", () => {
  const draft = createChartDraft("line", { id: "new-trend", title: "New trend" });

  assert.deepEqual(draft, {
    configVersion: 3,
    id: "new-trend",
    typeId: "line",
    title: "New trend",
    description: "",
    sourceId: null,
    roles: {},
    transformations: {
      filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap",
    },
    presentation: { title: { align: "left" }, collection: null },
    interaction: {
      zoom: { enabled: true, rangeSelector: false },
      timeSync: null,
    },
    layout: { size: "standard" },
  });
});

test("chart drafts retain nested defaults when an override changes one field", () => {
  const draft = createChartDraft("line", {
    id: "centered-trend",
    presentation: { title: { align: "center" } },
    interaction: { zoom: {} },
  });

  assert.equal(draft.presentation.title.align, "center");
  assert.equal(draft.interaction.zoom.enabled, true);
});

test("collection-capable draft finalization materializes the persisted Collection Display shape", () => {
  const authored = {
    layout: "fixed",
    rows: 1,
    columns: 3,
    ranking: { mode: "fixed" },
  };

  const draft = createChartDraft("kpi", {
    id: "facility-status",
    presentation: { collection: authored },
  });

  assert.deepEqual(authored, {
    layout: "fixed",
    rows: 1,
    columns: 3,
    ranking: { mode: "fixed" },
  });
  assert.deepEqual(draft.presentation.collection, {
    layout: "fixed",
    rows: 1,
    columns: 3,
    gap: 16,
    overflow: "manualPages",
    ranking: { mode: "fixed" },
    carousel: {
      intervalMs: 10000,
      loop: true,
      pauseOnHover: true,
      transition: "none",
    },
    playback: {
      rerank: true,
      pauseCarousel: true,
    },
  });
});

test("Delta drafts default to a detached previous-observation comparison", () => {
  const authored = { mode: "fixedTime", at: "2027-05-01T00:00:00.000Z", matching: { policy: "exact" } };
  const defaultDraft = createChartDraft("deltaCard", { id: "new-delta" });
  const fixedDraft = createChartDraft("deltaList", {
    id: "fixed-delta",
    transformations: { comparison: authored },
  });

  assert.deepEqual(defaultDraft.transformations.comparison, {
    mode: "previousObservation",
  });
  assert.equal(Object.hasOwn(defaultDraft.transformations, "temporalMatch"), false);
  assert.deepEqual(fixedDraft.transformations.comparison, authored);
  assert.notEqual(fixedDraft.transformations.comparison, authored);
  assert.notEqual(fixedDraft.transformations.comparison.matching, authored.matching);

  authored.matching.policy = "lastKnown";
  assert.equal(fixedDraft.transformations.comparison.matching.policy, "exact");
});

test("comparison transformations are schema-aware and fixed times are canonical UTC instants", () => {
  const base = {
    filters: [],
    grouping: null,
    aggregation: null,
    duplicates: null,
    missingValues: "gap",
  };
  const delta = deltaListChart({
    transformations: {
      ...base,
      comparison: {
        mode: "fixedTime",
        at: "2027-05-01T00:00:00.000Z",
        matching: { policy: "nearest", toleranceMs: 3_600_000 },
      },
    },
  });
  assert.doesNotThrow(() => validateChartInstance(delta));

  for (const [comparison, message] of [
    [{ mode: "previousObservation", at: "2027-05-01T00:00:00.000Z" }, /unknown chart comparison property "at"/i],
    [{ mode: "fixedTime", at: "2027-05-01", matching: { policy: "exact" } }, /canonical UTC instant/i],
    [{ mode: "fixedTime", at: "2027-05-01T03:00:00.000+03:00", matching: { policy: "exact" } }, /canonical UTC instant/i],
    [{ mode: "fixedTime", at: "2027-05-01T00:00:00.000Z", matching: { policy: "nearest" } }, /nearest.*toleranceMs/i],
    [{ mode: "fixedTime", at: "2027-05-01T00:00:00.000Z", matching: { policy: "exact", toleranceMs: 0 } }, /only nearest.*toleranceMs/i],
    [{ mode: "fixedTime", at: "2027-05-01T00:00:00.000Z", matching: { policy: "closest" } }, /unknown comparison matching policy "closest"/i],
  ]) {
    assert.throws(
      () => validateChartInstance(deltaListChart({
        transformations: { ...base, comparison },
      })),
      message,
    );
  }

  assert.throws(
    () => validateChartInstance(lineChart({
      transformations: {
        ...base,
        comparison: { mode: "previousObservation" },
      },
    })),
    /does not support comparison/i,
  );
});

test("comparison transformations reject inherited, executable, symbolic, and custom-prototype fields", () => {
  const base = {
    filters: [],
    grouping: null,
    aggregation: null,
    duplicates: null,
    missingValues: "gap",
  };
  let comparisonReads = 0;
  let policyReads = 0;
  const accessorComparison = {};
  Object.defineProperty(accessorComparison, "mode", {
    enumerable: true,
    get() {
      comparisonReads += 1;
      return "previousObservation";
    },
  });
  const inheritedComparison = Object.create({ mode: "previousObservation" });
  const symbolicComparison = { mode: "previousObservation" };
  symbolicComparison[Symbol("hidden")] = true;
  const accessorMatching = {};
  Object.defineProperty(accessorMatching, "policy", {
    enumerable: true,
    get() {
      policyReads += 1;
      return "exact";
    },
  });
  const inheritedMatching = Object.create({ policy: "exact" });
  const symbolicMatching = { policy: "exact" };
  symbolicMatching[Symbol("hidden")] = true;
  const fixed = (matching) => ({
    mode: "fixedTime",
    at: "2027-05-01T00:00:00.000Z",
    matching,
  });

  for (const [comparison, message] of [
    [inheritedComparison, /chart comparison must be a plain object/i],
    [accessorComparison, /comparison property "mode".*data property/i],
    [symbolicComparison, /chart comparison.*symbol/i],
    [fixed(inheritedMatching), /comparison matching must be a plain object/i],
    [fixed(accessorMatching), /matching property "policy".*data property/i],
    [fixed(symbolicMatching), /comparison matching.*symbol/i],
  ]) {
    assert.throws(
      () => validateChartInstance(deltaListChart({
        transformations: { ...base, comparison },
      })),
      message,
    );
  }
  assert.equal(comparisonReads, 0);
  assert.equal(policyReads, 0);
});

test("chart time synchronization stores membership only and rejects the former policy locations", () => {
  const membershipOnly = lineChart({
    transformations: {
      filters: [],
      grouping: null,
      aggregation: "sum",
      duplicates: "aggregate",
      missingValues: "gap",
    },
    interaction: {
      zoom: { enabled: true },
      timeSync: { groupId: "outbreak" },
    },
  });
  assert.doesNotThrow(() => validateChartInstance(membershipOnly));

  for (const timeSync of [
    { groupId: "outbreak", policy: "exact" },
    { groupId: "outbreak", toleranceMs: 0 },
  ]) {
    assert.throws(
      () => validateChartInstance({
        ...membershipOnly,
        interaction: { zoom: { enabled: true }, timeSync },
      }),
      /unknown chart time synchronization property/i,
    );
  }

  assert.throws(
    () => validateChartInstance({
      ...membershipOnly,
      transformations: {
        ...membershipOnly.transformations,
        temporalMatch: { policy: "exact" },
      },
    }),
    /unknown chart transformations property "temporalMatch"/i,
  );
});

test("chart validation rejects unknown roles and invalid schema capabilities", () => {
  assert.throws(
    () => validateChartInstance(lineChart({ roles: { measurements: [{ field: "cases" }], observation: { field: "reportedAt" }, madeUp: { field: "x" } } })),
    /Unknown role "madeUp"/,
  );
  assert.throws(
    () => validateChartInstance(lineChart({
      presentation: {
        title: { align: "left" },
        collection: {
          layout: "fixed",
          rows: 1,
          columns: 3,
          gap: 16,
          overflow: "manualPages",
          ranking: { mode: "fixed" },
          carousel: {
            intervalMs: 10000,
            loop: true,
            pauseOnHover: true,
            transition: "none",
          },
          playback: {
            rerank: true,
            pauseCarousel: true,
          },
        },
      },
    })),
    /does not support collection/i,
  );
});

test("chart and bundle boundaries preserve detached schema-applicable series appearance", () => {
  const expectedSeries = {
    colors: ["#043BCB", "#36BDEB"],
    lineWidth: 2.5,
  };
  const authoredSeries = structuredClone(expectedSeries);
  const styled = lineChart({
    presentation: {
      title: { align: "left" },
      collection: null,
      series: authoredSeries,
    },
  });

  assert.doesNotThrow(() => validateChartInstance(styled));
  const normalized = normalizeChartInstance(styled);
  authoredSeries.colors[0] = "#FFFFFF";
  assert.deepEqual(normalized.presentation.series, expectedSeries);

  const dashboard = version3Dashboard();
  dashboard.pages[0].sections[0].panels[0] = lineChart({
    presentation: {
      title: { align: "left" },
      collection: null,
      series: structuredClone(expectedSeries),
    },
  });
  const parsed = parseDashboardBundle(JSON.stringify(serializeDashboardBundle(dashboard, {
    now: "2026-07-26T12:00:00.000Z",
  })));

  assert.deepEqual(
    parsed.pages[0].sections[0].panels[0].presentation.series,
    expectedSeries,
  );
});

test("series appearance validation accepts finite fractional widths within inclusive bounds", () => {
  const cases = [
    lineChart({
      presentation: {
        title: { align: "left" },
        collection: null,
        series: { colors: ["#043BCB"], lineWidth: 1 },
      },
    }),
    lineChart({
      presentation: {
        title: { align: "left" },
        collection: null,
        series: { colors: ["#043BCB"], lineWidth: 12 },
      },
    }),
    lineChart({
      typeId: "bar",
      presentation: {
        title: { align: "left" },
        collection: null,
        series: { colors: ["#043BCB"], barWidth: 4 },
      },
    }),
    lineChart({
      typeId: "bar",
      presentation: {
        title: { align: "left" },
        collection: null,
        series: { colors: ["#043BCB"], barWidth: 18.5 },
      },
    }),
    lineChart({
      typeId: "mixed",
      presentation: {
        title: { align: "left" },
        collection: null,
        series: {
          colors: ["#043BCB", "#36BDEB"],
          lineWidth: 2.5,
          barWidth: 120,
        },
      },
    }),
    pieChart({
      presentation: {
        title: { align: "left" },
        collection: null,
        series: { colors: ["#043BCB"] },
      },
    }),
  ];

  for (const chart of cases) {
    assert.doesNotThrow(() => validateChartInstance(chart), chart.typeId);
  }
});

test("series appearance validation rejects malformed and unknown nested values", () => {
  const invalidSeries = [
    null,
    [],
    "not-an-object",
    { colors: [] },
    { colors: Array.from({ length: 13 }, () => "#043BCB") },
    { colors: ["#12345G"] },
    { colors: "#043BCB" },
    { lineWidth: 0 },
    { lineWidth: 13 },
    { lineWidth: Number.NaN },
    { lineWidth: Number.POSITIVE_INFINITY },
    { lineWidth: "2.5" },
    { madeUp: true },
  ];

  for (const series of invalidSeries) {
    assert.throws(
      () => validateChartInstance(lineChart({
        presentation: {
          title: { align: "left" },
          collection: null,
          series,
        },
      })),
      /series|color|lineWidth|unknown/i,
    );
  }

  for (const barWidth of [3.9, 121, Number.NaN, Number.POSITIVE_INFINITY, "18.5"]) {
    assert.throws(
      () => validateChartInstance(lineChart({
        typeId: "bar",
        presentation: {
          title: { align: "left" },
          collection: null,
          series: { barWidth },
        },
      })),
      /series|barWidth|unknown/i,
    );
  }
});

test("series appearance validation rejects style keys unsupported by the chart schema", () => {
  const cases = [
    lineChart({
      presentation: {
        title: { align: "left" },
        collection: null,
        series: { barWidth: 24 },
      },
    }),
    lineChart({
      typeId: "bar",
      presentation: {
        title: { align: "left" },
        collection: null,
        series: { lineWidth: 2.5 },
      },
    }),
    pieChart({
      presentation: {
        title: { align: "left" },
        collection: null,
        series: { lineWidth: 2.5 },
      },
    }),
    kpiChart({
      presentation: {
        title: { align: "left" },
        collection: null,
        series: { colors: ["#043BCB"] },
      },
    }),
  ];

  for (const chart of cases) {
    assert.throws(
      () => validateChartInstance(chart),
      /series|lineWidth|barWidth|color|support|unknown/i,
      chart.typeId,
    );
  }
});

test("eligible numeric role bindings preserve strict interpolation permission", () => {
  const chart = lineChart({
    roles: {
      measurements: [{
        field: "cases",
        axis: "primary",
        interpolationAllowed: true,
      }],
      observation: { field: "reportedAt", interpretation: "temporal" },
    },
  });

  assert.doesNotThrow(() => validateChartInstance(chart));
  assert.equal(
    normalizeChartInstance(chart).roles.measurements[0].interpolationAllowed,
    true,
  );
  const parsed = parseDashboardBundle(JSON.stringify(serializeDashboardBundle({
    ...version3Dashboard(),
    pages: [{
      ...version3Dashboard().pages[0],
      sections: [{
        ...version3Dashboard().pages[0].sections[0],
        panels: [chart],
      }],
    }],
  })));
  assert.equal(
    parsed.pages[0].sections[0].panels[0]
      .roles.measurements[0].interpolationAllowed,
    true,
  );

  assert.throws(
    () => validateChartInstance(lineChart({
      roles: {
        measurements: [{
          field: "cases",
          axis: "primary",
          interpolationAllowed: "yes",
        }],
        observation: { field: "reportedAt", interpretation: "temporal" },
      },
    })),
    /interpolationAllowed.*boolean/i,
  );
  assert.throws(
    () => validateChartInstance(lineChart({
      roles: {
        measurements: [{ field: "cases", axis: "primary" }],
        observation: {
          field: "reportedAt",
          interpretation: "temporal",
          interpolationAllowed: true,
        },
      },
    })),
    /unknown role "observation" binding property "interpolationAllowed"/i,
  );
});

test("chart validation requires the complete version 3 identity shape", () => {
  const chart = lineChart();
  delete chart.description;

  assert.throws(() => validateChartInstance(chart), /Chart description is required/);
});

test("dashboard validation checks every page and section chart against its source", () => {
  const dashboard = version3Dashboard();
  dashboard.pages[0].sections[0].panels[0].sourceId = "missing-source";

  assert.throws(() => validateDashboardConfig(dashboard), /unknown source "missing-source"/i);
});

test("serialization excludes runtime-loaded rows without mutating the dashboard", () => {
  const dashboard = version3Dashboard();
  dashboard.loadedData = { "uploaded-cases": [{ reportedAt: "2027-05-01", cases: 4 }] };
  dashboard.dataSources["uploaded-cases"].loadedRows = [{ reportedAt: "2027-05-01", cases: 4 }];

  const bundle = serializeDashboardBundle(dashboard, { now: "2026-07-26T12:00:00.000Z" });

  assert.equal(Object.hasOwn(bundle.config, "loadedData"), false);
  assert.equal(Object.hasOwn(bundle.config.dataSources["uploaded-cases"], "loadedRows"), false);
  assert.ok(Array.isArray(dashboard.loadedData["uploaded-cases"]));
});

test("parsed bundles do not alias their serialized input", () => {
  const bundle = serializeDashboardBundle(version3Dashboard(), { now: "2026-07-26T12:00:00.000Z" });
  const parsed = parseDashboardBundle(JSON.stringify(bundle));
  parsed.dataSources["manual-status"].rows[0].value = 99;

  assert.equal(bundle.config.dataSources["manual-status"].rows[0].value, 12);
});

test("import rejects runtime-only rows instead of silently changing a bundle", () => {
  const bundle = serializeDashboardBundle(version3Dashboard(), { now: "2026-07-26T12:00:00.000Z" });
  bundle.config.loadedData = { "uploaded-cases": [{ reportedAt: "2027-05-01", cases: 4 }] };
  bundle.config.dataSources["uploaded-cases"].loadedRows = [{ reportedAt: "2027-05-01", cases: 4 }];

  assert.throws(
    () => parseDashboardBundle(JSON.stringify(bundle)),
    /unknown dashboard configuration property "loadedData"|unknown data source.*"loadedRows"/i,
  );
});

test("dashboard validation rejects selected fields that do not exist in the uploaded source", () => {
  const dashboard = version3Dashboard();
  dashboard.pages[0].sections[0].panels[0].roles.measurements[0].field = "missingCases";

  assert.throws(() => validateDashboardConfig(dashboard), /field "missingCases".*does not exist/i);
});

test("dashboard validation rejects source types incompatible with a selected role", () => {
  const dashboard = version3Dashboard();
  dashboard.dataSources["uploaded-cases"].parsingMetadata.cases = { interpretation: "category" };

  assert.throws(() => validateDashboardConfig(dashboard), /field "cases".*category.*does not satisfy/i);
});

test("strict chart subshapes reject unknown keys and malformed nested values", () => {
  assert.throws(() => validateChartInstance(lineChart({ layout: { size: "wide", surprise: true } })), /Unknown chart layout property/);
  assert.throws(() => validateChartInstance(lineChart({ roles: { measurements: [{ field: "cases", axis: "primary" }], observation: { field: "reportedAt", interpretation: "temporal", extra: true } } })), /Unknown role "observation" binding property/);
  assert.throws(() => validateChartInstance(lineChart({ transformations: { filters: [{ field: "cases", operator: "equals", values: [4] }], grouping: null, aggregation: "sum", duplicates: "aggregate", missingValues: "gap" } })), /Unknown chart filter property/);
  assert.throws(() => validateChartInstance(lineChart({ presentation: { title: { align: "left", color: "red" }, collection: null, labels: "visible" } })), /Unknown chart presentation title property/);
  assert.throws(() => validateChartInstance(lineChart({ interaction: { zoom: { enabled: true, wheel: true }, timeSync: null } })), /Unknown chart zoom interaction property/);
});

test("time synchronization rejects an empty optional temporal role array", () => {
  const chart = kpiChart({
    roles: { value: { field: "value" }, time: [] },
    interaction: { zoom: { enabled: false }, timeSync: { groupId: "status" } },
  });

  assert.throws(() => validateChartInstance(chart), /binding object|temporal role/i);
});

test("inline source records use one row representation and enforce each schema manual-data policy", () => {
  const dashboard = version3Dashboard();
  dashboard.pages[0].sections[0].panels = [pieChart()];
  dashboard.timeSyncGroups = [];
  assert.doesNotThrow(() => validateDashboardConfig(dashboard));

  const ambiguous = version3Dashboard();
  ambiguous.dataSources["manual-status"].data = [{ label: "Ready", value: 12 }];
  ambiguous.pages[0].sections[0].panels = [pieChart()];
  ambiguous.timeSyncGroups = [];
  assert.throws(() => validateDashboardConfig(ambiguous), /unknown data source.*property "data"/i);

  const disallowed = version3Dashboard();
  disallowed.pages[0].sections[0].panels = [lineChart({ sourceId: "manual-status", interaction: { zoom: { enabled: true }, timeSync: null } })];
  disallowed.timeSyncGroups = [];
  assert.throws(() => validateDashboardConfig(disallowed), /does not support inline source/i);

  const oversized = version3Dashboard();
  oversized.dataSources["manual-status"].rows = Array.from({ length: 21 }, (_, value) => ({ label: `Status ${value}`, value }));
  oversized.pages[0].sections[0].panels = [pieChart()];
  oversized.timeSyncGroups = [];
  assert.throws(() => validateDashboardConfig(oversized), /exceeds 20 rows/i);
});

test("image manual data rejects undeclared fields and oversized concise input", () => {
  const dashboard = version3Dashboard();
  dashboard.dataSources["manual-status"] = {
    kind: "inline",
    rows: [{ src: "/map.png", alt: "Map", fit: "contain", note: "not allowed" }],
  };
  dashboard.pages[0].sections[0].panels = [
    kpiChart({ id: "image", typeId: "image", roles: {}, interaction: { zoom: { enabled: true }, timeSync: null } }),
  ];

  assert.throws(() => validateDashboardConfig(dashboard), /manual data field "note"/i);

  const multiple = version3Dashboard();
  multiple.dataSources["manual-status"] = {
    kind: "inline",
    rows: [
      { src: "/map.png", alt: "Map", fit: "contain" },
      { src: "/map-2.png", alt: "Second map", fit: "contain" },
    ],
  };
  multiple.pages[0].sections[0].panels = [
    kpiChart({ id: "image", typeId: "image", roles: {}, interaction: { zoom: { enabled: true }, timeSync: null } }),
  ];
  assert.throws(() => validateDashboardConfig(multiple), /exactly one row/i);
});

test("serialization strips nested runtime state but preserves opaque manual data columns", () => {
  const dashboard = version3Dashboard();
  dashboard.pages[0].sections[0].panels[0].presentation.labels = {
    visible: true,
    loadedData: { transient: true },
  };
  dashboard.dataSources["manual-status"].rows[0].loadedRows = "domain value";

  const bundle = serializeDashboardBundle(dashboard, { now: "2026-07-26T12:00:00.000Z" });

  assert.equal(Object.hasOwn(bundle.config.pages[0].sections[0].panels[0].presentation.labels, "loadedData"), false);
  assert.equal(bundle.config.dataSources["manual-status"].rows[0].loadedRows, "domain value");
  assert.equal(dashboard.pages[0].sections[0].panels[0].presentation.labels.loadedData.transient, true);
});

test("import rejects nested structural runtime state without rewriting opaque manual rows", () => {
  const bundle = serializeDashboardBundle(version3Dashboard(), { now: "2026-07-26T12:00:00.000Z" });
  bundle.config.pages[0].sections[0].panels[0].presentation.labels = { visible: true, runtimeRows: ["temporary"] };
  bundle.config.dataSources["manual-status"].rows[0].runtimeRows = "domain value";

  assert.throws(
    () => parseDashboardBundle(JSON.stringify(bundle)),
    /unknown chart presentation labels property "runtimeRows"/i,
  );
});

test("bundle parsing reports a missing or non-object version 3 configuration clearly", () => {
  for (const config of [undefined, null, []]) {
    assert.throws(
      () => parseDashboardBundle(JSON.stringify({ bundleType: "simex-dashboard-bundle", version: 3, config })),
      /version 3 dashboard configuration object/i,
    );
  }
});

test("bundle timestamps require a valid canonical ISO-8601 instant", () => {
  assert.throws(
    () => serializeDashboardBundle(version3Dashboard(), { now: "2026-07-26" }),
    /canonical ISO-8601 timestamp/i,
  );
  assert.throws(
    () => serializeDashboardBundle(version3Dashboard(), { now: "2026-02-30T12:00:00.000Z" }),
    /canonical ISO-8601 timestamp/i,
  );
});

test("a category source cannot become temporal only through a role override", () => {
  const dashboard = version3Dashboard();
  dashboard.dataSources["uploaded-cases"].csvText = "reportedAt,cases\nnot a date,4\n";
  dashboard.dataSources["uploaded-cases"].parsingMetadata = {};
  dashboard.pages[0].sections[0].panels[0].roles.observation = { field: "reportedAt", interpretation: "temporal" };

  assert.throws(() => validateDashboardConfig(dashboard), /effective temporal interpretation|does not validate as temporal/i);
});

test("an explicit DD/MM/YYYY role override validates source values and enables time synchronization", () => {
  const dashboard = version3Dashboard();
  dashboard.dataSources["uploaded-cases"].csvText = "reportedAt,cases\n02/05/2027,4\n";
  dashboard.dataSources["uploaded-cases"].parsingMetadata = {
    reportedAt: {
      interpretation: "temporal",
      format: "DD/MM/YYYY",
      timezone: "date-only",
    },
  };
  dashboard.pages[0].sections[0].panels[0].roles.observation = {
    field: "reportedAt", interpretation: "temporal", format: "DD/MM/YYYY", timezone: "date-only",
  };

  assert.doesNotThrow(() => validateDashboardConfig(dashboard));
});

test("time synchronization requires an effectively temporal source binding", () => {
  const dashboard = version3Dashboard();
  dashboard.dataSources["uploaded-cases"].csvText = "reportedAt,cases\nMay,4\n";
  dashboard.dataSources["uploaded-cases"].parsingMetadata = {};
  dashboard.pages[0].sections[0].panels[0].roles.observation = { field: "reportedAt" };

  assert.throws(() => validateDashboardConfig(dashboard), /effective temporal role/i);
});

test("collection presentation delegates the exact public nested shape to the collection authority", () => {
  assert.doesNotThrow(() => validateChartInstance(deltaListChart()));

  for (const [collection, message] of [
    [{ ranking: { mode: "random" } }, /ranking mode/i],
    [{ layout: "fixed", overflow: "infinite" }, /overflow.*fixed/i],
    [{ layout: "fixed", ranking: { mode: "sort", field: "value", direction: "up" } }, /direction.*asc or desc/i],
    [{ layout: "carousel", carousel: { intervalMs: 0 } }, /intervalMs.*5000/i],
    [{ layout: "carousel", carousel: { transition: "bounce" } }, /transition/i],
    [{ layout: "carousel", carousel: { loop: "yes" } }, /loop.*boolean/i],
    [{ layout: "carousel", carousel: { pauseOnHover: 1 } }, /pauseOnHover.*boolean/i],
    [{ playback: { rerank: "yes" } }, /rerank.*boolean/i],
    [{ playback: { pauseCarousel: "no" } }, /pauseCarousel.*boolean/i],
    [{ gap: -1 }, /gap.*between 0 and 64/i],
  ]) {
    const chart = deltaListChart();
    chart.presentation.collection = collection;
    assert.throws(() => validateChartInstance(chart), message);
  }

  for (const dimension of ["rows", "columns"]) {
    const chart = deltaListChart();
    chart.presentation.collection[dimension] = 5;
    assert.throws(() => validateChartInstance(chart), /between 1 and 4/i, dimension);
  }
});

test("detected temporal values require deterministic evidence before enabling time sync", () => {
  const invalid = version3Dashboard();
  invalid.dataSources["uploaded-cases"].csvText = "date,cases\nnot a date,4\n";
  invalid.dataSources["uploaded-cases"].parsingMetadata = {};
  invalid.pages[0].sections[0].panels[0].roles.observation = { field: "date" };
  invalid.timeSyncGroups[0].primaryClock.timeField = "date";
  assert.throws(() => validateDashboardConfig(invalid), /does not validate as temporal|temporal evidence/i);

  const validIso = version3Dashboard();
  validIso.dataSources["uploaded-cases"].csvText = "date,cases\n2027-05-01,4\n";
  validIso.dataSources["uploaded-cases"].parsingMetadata = {};
  validIso.pages[0].sections[0].panels[0].roles.observation = { field: "date" };
  validIso.timeSyncGroups[0].primaryClock.timeField = "date";
  assert.doesNotThrow(() => validateDashboardConfig(validIso));
});

test("profile-only temporal evidence rejects invalid and noncanonical values despite empty diagnostics", () => {
  for (const value of ["not a date", "02/05/2027", "2027-02-30", "2027-05-01T12:00:00Z"]) {
    const dashboard = profileOnlyDashboard({ values: [value], diagnostics: [] });
    assert.throws(
      () => validateDashboardConfig(dashboard),
      /does not validate as temporal|temporal evidence|canonical temporal|temporal column/i,
      value,
    );
  }
});

test("profile-only temporal evidence rejects malformed or empty evidence", () => {
  for (const temporal of [
    undefined,
    {},
    { values: "2027-05-01", diagnostics: [] },
    { values: [], diagnostics: [] },
    { values: [null, ""], diagnostics: [] },
    { values: ["2027-05-01"], diagnostics: null },
  ]) {
    const dashboard = profileOnlyDashboard(temporal);
    assert.throws(
      () => validateDashboardConfig(dashboard),
      /does not validate as temporal|temporal evidence|temporal column/i,
    );
  }
});

test("profile-only temporal evidence rejects error diagnostics", () => {
  const dashboard = profileOnlyDashboard({
    values: [null],
    diagnostics: [{
      index: 0,
      code: "invalid-calendar-date",
      value: "2027-02-30",
    }],
  });

  assert.throws(
    () => validateDashboardConfig(dashboard),
    /does not validate as temporal|temporal evidence|temporal column/i,
  );
});

test("canonical profile-only dates and instants retain source parsing metadata and enable time sync", () => {
  for (const value of ["2027-05-01", "2027-05-01T12:00:00.000Z"]) {
    const dashboard = profileOnlyDashboard({ values: [null, value], diagnostics: [] });
    assert.doesNotThrow(() => validateDashboardConfig(dashboard), value);
  }
});

test("invalid profile-only evidence cannot enable time sync", () => {
  const dashboard = profileOnlyDashboard({ values: ["stale invalid value"], diagnostics: [] });
  dashboard.pages[0].sections[0].panels[0].interaction.timeSync = {
    groupId: "outbreak",
    policy: "nearest",
  };

  assert.throws(
    () => validateDashboardConfig(dashboard),
    /does not validate as temporal|effective temporal role|temporal evidence|canonical temporal|temporal column/i,
  );
});

test("collection carousel intervals use a five-second integer minimum", () => {
  for (const value of [4999, 5000.5, "5000"]) {
    const chart = deltaListChart();
    chart.presentation.collection.carousel.intervalMs = value;
    assert.throws(() => validateChartInstance(chart), /intervalMs.*5000/i, String(value));
  }
  assert.doesNotThrow(() => validateChartInstance(deltaListChart()));
});

test("normalizeChartInstance materializes collection defaults in a detached chart without mutating authored values", () => {
  const authoredCollection = {
    layout: "scroll",
    rows: 3,
    ranking: {
      mode: "sort",
      field: "value",
      direction: "desc",
    },
  };
  const chart = deltaListChart({
    presentation: {
      title: { align: "center" },
      collection: authoredCollection,
    },
    opaqueAuthoringState: {
      selectedEntities: ["Clinic A", "Clinic B"],
    },
  });
  const original = structuredClone(chart);

  const normalized = normalizeChartInstance(chart);

  assert.deepEqual(chart, original);
  assert.notEqual(normalized, chart);
  assert.notEqual(normalized.presentation, chart.presentation);
  assert.notEqual(normalized.opaqueAuthoringState, chart.opaqueAuthoringState);
  assert.deepEqual(normalized.opaqueAuthoringState, {
    selectedEntities: ["Clinic A", "Clinic B"],
  });
  assert.deepEqual(normalized.presentation.collection, {
    layout: "scroll",
    rows: 3,
    columns: 2,
    gap: 16,
    overflow: "scroll",
    ranking: {
      mode: "sort",
      field: "value",
      direction: "desc",
      stabilize: false,
    },
    carousel: {
      intervalMs: 10000,
      loop: true,
      pauseOnHover: true,
      transition: "none",
    },
    playback: {
      rerank: true,
      pauseCarousel: true,
    },
  });
});

test("bundle write boundaries persist every collection layout, overflow, ranking, carousel, and playback shape canonically", () => {
  const authoredCollections = [
    {
      layout: "fixed",
      ranking: { mode: "fixed" },
    },
    {
      layout: "fixed",
      rows: 1,
      columns: 4,
      gap: 0,
      overflow: "limit",
      ranking: {
        mode: "sort",
        field: "label",
        direction: "desc",
        stabilize: true,
      },
      playback: {
        rerank: false,
        pauseCarousel: false,
      },
    },
    {
      layout: "scroll",
      overflow: "scroll",
      ranking: {
        mode: "priority",
        method: "largestAbsoluteChange",
        stabilize: true,
      },
    },
    {
      layout: "scroll",
      overflow: "limit",
      ranking: {
        mode: "priority",
        expression: {
          operator: "weightedSum",
          terms: [
            { metric: "riskScore", weight: 2 },
            { metric: "distanceFromTarget", weight: 0.5 },
          ],
        },
      },
    },
    {
      layout: "carousel",
      overflow: "autoRotate",
      ranking: {
        mode: "priority",
        method: "riskScore",
      },
      carousel: {
        intervalMs: 15000,
        loop: false,
        pauseOnHover: false,
        transition: "slide",
      },
      playback: {
        rerank: true,
        pauseCarousel: false,
      },
    },
    {
      layout: "carousel",
      rows: 4,
      columns: 4,
      gap: 64,
      overflow: "limit",
      ranking: { mode: "fixed" },
      carousel: {
        intervalMs: 5000,
        loop: true,
        pauseOnHover: true,
        transition: "fade",
      },
    },
  ];
  const dashboard = version3Dashboard();
  dashboard.timeSyncGroups = [];
  dashboard.dataSources["collection-status"] = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "collection-status.csv",
    csvText: "entity,value\nClinic A,12\nClinic B,8\n",
    parsingMetadata: { value: { interpretation: "numeric" } },
    provenance: { label: "Collection status" },
    fingerprint: "collection-status-fingerprint",
  };
  dashboard.pages[0].sections[0].panels = authoredCollections.map((collection, index) => (
    kpiChart({
      id: `collection-${index}`,
      sourceId: "collection-status",
      roles: {
        value: { field: "value" },
        entity: { field: "entity" },
      },
      presentation: {
        title: { align: "left" },
        collection,
      },
    })
  ));
  const originalCollections = structuredClone(authoredCollections);

  const bundle = serializeDashboardBundle(dashboard, {
    now: "2026-07-26T12:00:00.000Z",
  });
  const parsed = parseDashboardBundle(JSON.stringify(bundle));

  assert.deepEqual(authoredCollections, originalCollections);
  authoredCollections.forEach((authored, index) => {
    const expected = normalizeCollectionSettings(authored);
    assert.deepEqual(
      bundle.config.pages[0].sections[0].panels[index].presentation.collection,
      expected,
    );
    assert.deepEqual(
      parsed.pages[0].sections[0].panels[index].presentation.collection,
      expected,
    );
  });
  assert.deepEqual(bundle.config.pages[0].sections[0].panels[0].presentation.collection, {
    layout: "fixed",
    rows: 2,
    columns: 2,
    gap: 16,
    overflow: "manualPages",
    ranking: { mode: "fixed" },
    carousel: {
      intervalMs: 10000,
      loop: true,
      pauseOnHover: true,
      transition: "none",
    },
    playback: {
      rerank: true,
      pauseCarousel: true,
    },
  });
});

test("legacy collection fields and aliases are rejected instead of migrated", () => {
  const legacyCollections = [
    { layout: "fixedGrid", rows: 1, columns: 2 },
    { layout: "scrollableGrid", rows: 1, columns: 2 },
    { layout: "fixed", itemSpacing: 8 },
    { layout: "fixed", sortField: "value" },
    { layout: "fixed", sortDirection: "desc" },
    { layout: "fixed", rankingMode: "sort" },
    { layout: "fixed", pageSize: 2 },
    { layout: "carousel", rotationInterval: 10000 },
    { layout: "carousel", loop: true },
    { layout: "carousel", pauseOnHover: true },
    { layout: "carousel", transition: "fade" },
    { layout: "fixed", lockPositionsDuringPlayback: true },
    { layout: "fixed", accessibleItemLabel: "Facility" },
    { layout: "fixed", overflow: "visibleLimit" },
    { layout: "fixed", ranking: { mode: "fixedOrder" } },
  ];

  for (const collection of legacyCollections) {
    const chart = deltaListChart();
    chart.presentation.collection = collection;
    assert.throws(
      () => validateChartInstance(chart),
      /unknown collection settings property|unsupported collection layout|overflow|ranking mode/i,
      JSON.stringify(collection),
    );
  }
});

test("collection validation rejects prototype and executable nested values without executing accessors", () => {
  let reads = 0;
  const accessorRanking = { mode: "priority" };
  Object.defineProperty(accessorRanking, "method", {
    enumerable: true,
    get() {
      reads += 1;
      return "riskScore";
    },
  });
  const customPrototype = Object.create({ layout: "fixed" });
  customPrototype.rows = 2;
  const inheritedRanking = Object.create({ mode: "fixed" });
  const executableExpression = {
    operator: "weightedSum",
    terms: [{ metric: "riskScore", weight: () => 1 }],
  };
  const symbolCollection = { layout: "fixed" };
  symbolCollection[Symbol("hidden")] = true;

  for (const [collection, message] of [
    [customPrototype, /collection settings.*plain object/i],
    [{ ranking: inheritedRanking }, /collection ranking.*plain object/i],
    [{ ranking: accessorRanking }, /ranking property "method".*data property/i],
    [{ ranking: { mode: "priority", expression: executableExpression } }, /weight.*finite/i],
    [symbolCollection, /collection settings.*symbol/i],
  ]) {
    const chart = deltaListChart();
    chart.presentation.collection = collection;
    assert.throws(() => validateChartInstance(chart), message);
  }
  assert.equal(reads, 0);
});

test("chart boundaries reject non-data collection paths without invoking getters or dropping inherited values", () => {
  const boundaries = [
    ["validation", (chart) => validateChartInstance(chart)],
    ["normalization", (chart) => normalizeChartInstance(chart)],
    ["bundle serialization", (chart) => {
      const dashboard = version3Dashboard();
      dashboard.pages[0].sections[0].panels[0] = chart;
      return serializeDashboardBundle(dashboard);
    }],
  ];

  for (const [boundary, invoke] of boundaries) {
    {
      let reads = 0;
      const chart = deltaListChart();
      const presentation = chart.presentation;
      Object.defineProperty(chart, "presentation", {
        enumerable: true,
        get() {
          reads += 1;
          return presentation;
        },
      });

      assert.throws(
        () => invoke(chart),
        /chart instance property "presentation".*data property/i,
        `${boundary} must reject an accessor-backed presentation`,
      );
      assert.equal(reads, 0, `${boundary} must not invoke the presentation getter`);
    }

    {
      let reads = 0;
      const chart = deltaListChart();
      const collection = chart.presentation.collection;
      Object.defineProperty(chart.presentation, "collection", {
        enumerable: true,
        get() {
          reads += 1;
          return collection;
        },
      });

      assert.throws(
        () => invoke(chart),
        /chart presentation property "collection".*data property/i,
        `${boundary} must reject an accessor-backed collection`,
      );
      assert.equal(reads, 0, `${boundary} must not invoke the collection getter`);
    }

    {
      const chart = deltaListChart();
      chart.presentation = Object.assign(
        Object.create({ collection: chart.presentation.collection }),
        { title: { align: "left" } },
      );
      assert.throws(
        () => invoke(chart),
        /chart presentation.*plain object/i,
        `${boundary} must reject an inherited collection instead of dropping it`,
      );
    }

    {
      const chart = deltaListChart();
      const collection = chart.presentation.collection;
      delete chart.presentation.collection;
      Object.defineProperty(chart.presentation, "collection", {
        enumerable: false,
        value: collection,
      });
      assert.throws(
        () => invoke(chart),
        /chart presentation property "collection".*enumerable/i,
        `${boundary} must reject a hidden own collection instead of changing its persistence`,
      );
    }
  }
});

test("chart and bundle boundaries reject malformed presentation and collection values", () => {
  for (const malformedPresentation of [null, [], "presentation"]) {
    const chart = deltaListChart({ presentation: malformedPresentation });
    assert.throws(() => validateChartInstance(chart), /chart presentation.*object/i);
    assert.throws(() => normalizeChartInstance(chart), /chart presentation.*object/i);
  }

  for (const malformedCollection of [[], "collection", 7]) {
    const chart = deltaListChart();
    chart.presentation.collection = malformedCollection;
    assert.throws(() => validateChartInstance(chart), /collection settings.*object/i);
    assert.throws(() => normalizeChartInstance(chart), /collection settings.*object/i);

    const dashboard = version3Dashboard();
    dashboard.pages[0].sections[0].panels[0] = chart;
    assert.throws(() => serializeDashboardBundle(dashboard), /collection settings.*object/i);

    const bundle = {
      bundleType: "simex-dashboard-bundle",
      version: 3,
      config: version3Dashboard(),
    };
    bundle.config.pages[0].sections[0].panels[0] = chart;
    assert.throws(
      () => parseDashboardBundle(JSON.stringify(bundle)),
      /collection settings.*object/i,
    );
  }

  const bundle = serializeDashboardBundle(version3Dashboard());
  bundle.config.pages[0].sections[0].panels[0].presentation = "presentation";
  assert.throws(
    () => parseDashboardBundle(JSON.stringify(bundle)),
    /chart presentation.*object/i,
  );
});
