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
      temporalMatch: null,
    },
    presentation: {
      title: { align: "left" },
      collection: null,
    },
    interaction: {
      zoom: { enabled: true },
      timeSync: { groupId: "outbreak", policy: "exact" },
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
      filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap", temporalMatch: null,
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
