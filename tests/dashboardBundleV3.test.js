import assert from "node:assert/strict";
import test from "node:test";

import {
  createChartDraft,
  validateChartInstance,
} from "../src/charting/config/chartConfigV3.js";
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
        provenance: { label: "Exercise control", capturedAt: "2027-05-01" },
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
  dashboard.dataSources["uploaded-cases"] = {
    kind: "dataset",
    type: "profileSnapshot",
    parsingMetadata: {
      reportedAt: { interpretation: "temporal", format: "DD/MM/YYYY", timezone: "date-only" },
    },
    profile: {
      rowCount: 1,
      columns: [
        {
          name: "reportedAt",
          type: "temporal",
          temporal,
        },
        { name: "cases", type: "numeric" },
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
      collection: { layout: "fixedGrid", rows: 2, columns: 2, itemSpacing: 8, sortField: "value", sortDirection: "desc", rankingMode: "sort", overflow: "manualPages", pageSize: 4, rotationInterval: 5000, loop: true, pauseOnHover: true, transition: "fade", lockPositionsDuringPlayback: false, accessibleItemLabel: "Facility status" },
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
    interaction: { zoom: { enabled: true }, timeSync: null },
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
    () => validateChartInstance(lineChart({ presentation: { title: { align: "left" }, collection: { layout: "fixedGrid", rows: 1, columns: 3 } } })),
    /does not support collection/i,
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

test("import discards runtime-only rows from otherwise valid bundles", () => {
  const bundle = serializeDashboardBundle(version3Dashboard(), { now: "2026-07-26T12:00:00.000Z" });
  bundle.config.loadedData = { "uploaded-cases": [{ reportedAt: "2027-05-01", cases: 4 }] };
  bundle.config.dataSources["uploaded-cases"].loadedRows = [{ reportedAt: "2027-05-01", cases: 4 }];

  const parsed = parseDashboardBundle(JSON.stringify(bundle));

  assert.equal(Object.hasOwn(parsed, "loadedData"), false);
  assert.equal(Object.hasOwn(parsed.dataSources["uploaded-cases"], "loadedRows"), false);
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
  assert.doesNotThrow(() => validateDashboardConfig(dashboard));

  const ambiguous = version3Dashboard();
  ambiguous.dataSources["manual-status"].data = [{ label: "Ready", value: 12 }];
  ambiguous.pages[0].sections[0].panels = [pieChart()];
  assert.throws(() => validateDashboardConfig(ambiguous), /both rows and data/i);

  const disallowed = version3Dashboard();
  disallowed.pages[0].sections[0].panels = [lineChart({ sourceId: "manual-status", interaction: { zoom: { enabled: true }, timeSync: null } })];
  assert.throws(() => validateDashboardConfig(disallowed), /does not support inline source/i);

  const oversized = version3Dashboard();
  oversized.dataSources["manual-status"].rows = Array.from({ length: 21 }, (_, value) => ({ label: `Status ${value}`, value }));
  oversized.pages[0].sections[0].panels = [pieChart()];
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
  dashboard.dataSources["manual-status"].provenance = { nested: { runtimeRows: [1] } };

  const bundle = serializeDashboardBundle(dashboard, { now: "2026-07-26T12:00:00.000Z" });

  assert.equal(Object.hasOwn(bundle.config.pages[0].sections[0].panels[0].presentation.labels, "loadedData"), false);
  assert.equal(Object.hasOwn(bundle.config.dataSources["manual-status"].provenance.nested, "runtimeRows"), false);
  assert.equal(bundle.config.dataSources["manual-status"].rows[0].loadedRows, "domain value");
  assert.equal(dashboard.pages[0].sections[0].panels[0].presentation.labels.loadedData.transient, true);
});

test("import strips nested structural runtime state without rewriting opaque manual rows", () => {
  const bundle = serializeDashboardBundle(version3Dashboard(), { now: "2026-07-26T12:00:00.000Z" });
  bundle.config.pages[0].sections[0].panels[0].presentation.labels = { visible: true, runtimeRows: ["temporary"] };
  bundle.config.dataSources["manual-status"].rows[0].runtimeRows = "domain value";

  const parsed = parseDashboardBundle(JSON.stringify(bundle));

  assert.equal(Object.hasOwn(parsed.pages[0].sections[0].panels[0].presentation.labels, "runtimeRows"), false);
  assert.equal(parsed.dataSources["manual-status"].rows[0].runtimeRows, "domain value");
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
  dashboard.dataSources["uploaded-cases"].parsingMetadata = {};
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

test("collection presentation accepts only documented enum and bounded value shapes", () => {
  assert.doesNotThrow(() => validateChartInstance(deltaListChart()));

  for (const [property, value, message] of [
    ["rankingMode", "random", /rankingMode/],
    ["overflow", "infinite", /overflow/],
    ["pageSize", 0, /pageSize/],
    ["pageSize", 5, /pageSize/],
    ["transition", "bounce", /transition/],
    ["accessibleItemLabel", "", /accessibleItemLabel/],
    ["itemSpacing", -1, /itemSpacing/],
    ["sortField", {}, /sortField/],
    ["sortDirection", "up", /sortDirection/],
    ["rotationInterval", 0, /rotationInterval/],
    ["loop", "yes", /loop/],
    ["pauseOnHover", 1, /pauseOnHover/],
    ["lockPositionsDuringPlayback", "no", /lockPositionsDuringPlayback/],
  ]) {
    const chart = deltaListChart();
    chart.presentation.collection[property] = value;
    assert.throws(() => validateChartInstance(chart), message, property);
  }

  for (const dimension of ["rows", "columns"]) {
    const chart = deltaListChart();
    chart.presentation.collection[dimension] = 5;
    assert.throws(() => validateChartInstance(chart), /between 1 and 4/, dimension);
  }
});

test("detected temporal values require deterministic evidence before enabling time sync", () => {
  const invalid = version3Dashboard();
  invalid.dataSources["uploaded-cases"].csvText = "date,cases\nnot a date,4\n";
  invalid.dataSources["uploaded-cases"].parsingMetadata = {};
  invalid.pages[0].sections[0].panels[0].roles.observation = { field: "date" };
  assert.throws(() => validateDashboardConfig(invalid), /does not validate as temporal|temporal evidence/i);

  const validIso = version3Dashboard();
  validIso.dataSources["uploaded-cases"].csvText = "date,cases\n2027-05-01,4\n";
  validIso.dataSources["uploaded-cases"].parsingMetadata = {};
  validIso.pages[0].sections[0].panels[0].roles.observation = { field: "date" };
  assert.doesNotThrow(() => validateDashboardConfig(validIso));
});

test("profile-only temporal evidence rejects invalid and noncanonical values despite empty diagnostics", () => {
  for (const value of ["not a date", "02/05/2027", "2027-02-30", "2027-05-01T12:00:00Z"]) {
    const dashboard = profileOnlyDashboard({ values: [value], diagnostics: [] });
    assert.throws(
      () => validateDashboardConfig(dashboard),
      /does not validate as temporal|temporal evidence/i,
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
      /does not validate as temporal|temporal evidence/i,
    );
  }
});

test("profile-only temporal evidence rejects error diagnostics", () => {
  const dashboard = profileOnlyDashboard({
    values: ["2027-05-01"],
    diagnostics: [{ index: 0, severity: "error", code: "invalid-calendar-date" }],
  });

  assert.throws(
    () => validateDashboardConfig(dashboard),
    /does not validate as temporal|temporal evidence/i,
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
    /does not validate as temporal|effective temporal role|temporal evidence/i,
  );
});

test("collection rotation uses a five-second integer minimum", () => {
  for (const value of [4999, 5000.5, "5000"]) {
    const chart = deltaListChart();
    chart.presentation.collection.rotationInterval = value;
    assert.throws(() => validateChartInstance(chart), /rotationInterval.*5000/i, String(value));
  }
  assert.doesNotThrow(() => validateChartInstance(deltaListChart()));
});
