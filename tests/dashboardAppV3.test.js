import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { register } from "node:module";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

async function source(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

test("the live shell is version 3 only", async () => {
  const app = await source("src/App.jsx");
  assert.match(app, /simex-dashboard-config-v3/);
  assert.match(app, /parseDashboardBundle/);
  assert.match(app, /serializeDashboardBundle/);
  assert.doesNotMatch(app, /migrateDashboardToDataModel/);
  assert.doesNotMatch(app, /simex-dashboard-v2-bundle/);
  assert.doesNotMatch(app, /simex-dashboard-v2-config/);
});

test("the live renderer exposes only version 3 authoring and playback", async () => {
  const renderer = await source("src/components/DashboardRenderer.jsx");
  assert.match(renderer, /ChartWizardV3/);
  assert.match(renderer, /ChartEditorV3/);
  assert.match(renderer, /PlaybackProvider/);
  assert.doesNotMatch(renderer, /AddChartWizard/);
  assert.doesNotMatch(renderer, /ChartSettingsPanelV2/);
  assert.doesNotMatch(renderer, /LegacyEditor/);
});

test("legacy chart-system files are absent after the clean cutover", async () => {
  const legacyFiles = [
    "src/components/AddChartWizard.jsx",
    "src/components/DataBindingEditor.jsx",
    "src/components/ChartSettingsPanel.jsx",
    "src/components/ChartSettingsPanelV2.jsx",
    "src/lib/buildEchartsOption.js",
    "src/lib/chartDataModel.js",
    "src/lib/chartOptionRegistry.js",
    "src/lib/dashboardCompatibility.js",
    "src/lib/validateConfig.js",
    "scripts/migrate-chart-schema-v2.mjs",
    "tests/chartDataModel.test.js",
    "tests/dashboardBindings.test.js",
    "tests/dashboardCompatibility.test.js",
    "docs/chart-data-system-v2.md",
  ];

  for (const relativePath of legacyFiles) {
    await assert.rejects(
      access(path.join(ROOT, relativePath)),
      undefined,
      `${relativePath} must not survive the v3 cutover`,
    );
  }
});

test("only the v3 storage key is read and malformed current state fails closed", async () => {
  const {
    readDashboardStorage,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const storageKey = "simex-dashboard-config-v3";
  const values = new Map([
    ["simex-dashboard-v2-config-pages-v2", JSON.stringify(minimalDashboard())],
  ]);
  const storage = { getItem: (key) => values.get(key) ?? null };

  assert.equal(readDashboardStorage(storage, storageKey), null);

  values.set(storageKey, JSON.stringify({
    ...minimalDashboard(),
    configVersion: 2,
  }));
  assert.throws(
    () => readDashboardStorage(storage, storageKey),
    /version 3/i,
  );
});

test("chart creation and saving are immutable whole-dashboard mutations", async () => {
  const {
    integrateCreatedChart,
    integrateSavedChart,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const original = minimalDashboard();
  const snapshot = structuredClone(original);
  const createdChart = kpiChart({
    id: "current-capacity",
    title: "Current capacity",
  });

  const created = integrateCreatedChart(
    original,
    { chart: createdChart },
    { pageId: "overview", sectionId: "status" },
  );
  assert.deepEqual(original, snapshot);
  assert.deepEqual(
    created.pages[0].sections[0].panels.map(({ id }) => id),
    ["status-share", "current-capacity"],
  );

  const saved = integrateSavedChart(created, {
    chart: { ...createdChart, title: "Updated capacity" },
    timeSyncGroups: [],
  });
  assert.equal(created.pages[0].sections[0].panels[1].title, "Current capacity");
  assert.equal(saved.pages[0].sections[0].panels[1].title, "Updated capacity");
});

test("tracked descriptors and profiles round-trip through the portable v3 bundle", async () => {
  const {
    parseDashboardBundle,
    serializeDashboardBundle,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const [dashboard, datasetProfiles] = await Promise.all([
    readJson("public/config/dashboard.json"),
    readJson("public/config/dataset-profiles.json"),
  ]);
  const portable = { ...dashboard, datasetProfiles };
  const bundle = serializeDashboardBundle(portable, {
    now: "2026-07-27T00:00:00.000Z",
  });
  const parsed = parseDashboardBundle(JSON.stringify(bundle));

  assert.equal(parsed.configVersion, 3);
  assert.equal(parsed.pages.flatMap(({ sections }) => (
    sections.flatMap(({ panels }) => panels)
  )).length, 40);
  assert.equal(parsed.dataSources.bio_cases.kind, "csv");
  assert.equal(parsed.datasetProfiles.bio_cases.sourceId, "bio_cases");
});

test("the live loader hydrates inline and uploaded v3 sources with reusable profiles", async () => {
  const { loadDashboardConfig } = await import("../src/lib/loadDashboard.js");
  const dashboard = minimalDashboard();
  dashboard.dataSources.uploaded = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "capacity.csv",
    csvText: "facility,value\nClinic A,8\n",
  };

  const loaded = await loadDashboardConfig(dashboard, {});

  assert.deepEqual(loaded.loadedData.status, [{ label: "Ready", value: 12 }]);
  assert.deepEqual(loaded.loadedData.uploaded, [{
    facility: "Clinic A",
    value: 8,
  }]);
  assert.ok(loaded.datasetProfiles.status.columns.some(
    ({ name, type }) => name === "value" && type === "numeric",
  ));
  assert.ok(loaded.datasetProfiles.uploaded.columns.some(
    ({ name, type }) => name === "facility" && type === "category",
  ));
});

test("bundle promotion accepts only v3 and materializes uploaded CSV descriptors", async () => {
  const {
    serializeDashboardBundle,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const {
    preparePromotedDashboard,
  } = await import("../scripts/promote-dashboard-bundle.mjs");
  const dashboard = minimalDashboard();
  dashboard.dataSources.uploaded = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "clinic capacity.csv",
    csvText: "facility,value\nClinic A,8\n",
    provenance: { label: "Facilitator upload" },
  };
  const bundle = serializeDashboardBundle(dashboard, {
    now: "2026-07-27T00:00:00.000Z",
  });

  const promoted = preparePromotedDashboard(JSON.stringify(bundle));
  assert.deepEqual(promoted.config.dataSources.uploaded, {
    kind: "csv",
    path: "data/uploaded/clinic-capacity-uploaded.csv",
    provenance: { label: "Facilitator upload" },
  });
  assert.deepEqual(promoted.files, [{
    relativePath: "data/uploaded/clinic-capacity-uploaded.csv",
    contents: "facility,value\nClinic A,8\n",
  }]);
  assert.throws(
    () => preparePromotedDashboard(JSON.stringify({
      bundleType: "simex-dashboard-v2-bundle",
      version: 2,
      config: {},
    })),
    /version 3 bundles only/i,
  );
});

test("the attached empty-chart case produces a canonical renderer-ready time point", async () => {
  const echarts = await import("echarts");
  const { profileDataset } = await import(
    "../src/charting/data/profileDataset.js"
  );
  const { prepareChartData } = await import(
    "../src/charting/data/prepareChartData.js"
  );
  const { buildRenderModel } = await import(
    "../src/charting/rendering/buildRenderModel.js"
  );
  const rows = [
    { date: "02/05/2027", "Age group": "0-19", deaths: 5 },
    { date: "02/05/2027", "Age group": "20-39", deaths: 42 },
    { date: "02/05/2027", "Age group": "40-59", deaths: 211 },
    { date: "02/05/2027", "Age group": "60-79", deaths: 932 },
    { date: "02/05/2027", "Age group": "80+", deaths: 1400 },
    { date: "02/05/2027", "Age group": "total_deaths", deaths: 2590 },
  ];
  const chart = chartBase({
    id: "dysfunctional-chart-regression",
    typeId: "bar",
    title: "Dysfunctional chart regression",
    sourceId: "mortality",
    roles: {
      measurements: [{ field: "deaths", axis: "primary" }],
      observation: {
        field: "date",
        interpretation: "temporal",
        format: "DD/MM/YYYY",
        timezone: "date-only",
      },
    },
    transformations: {
      filters: [{
        field: "Age group",
        operator: "equals",
        value: "total_deaths",
      }],
      grouping: null,
      aggregation: "max",
      duplicates: "aggregate",
      missingValues: "gap",
    },
    interaction: {
      zoom: { enabled: true },
      timeSync: null,
    },
  });
  const profile = profileDataset(rows, {
    date: {
      interpretation: "temporal",
      format: "DD/MM/YYYY",
      timezone: "date-only",
    },
  });

  const prepared = prepareChartData({
    chart,
    rows,
    datasetProfile: profile,
  });
  const model = buildRenderModel({ chart, prepared });

  assert.equal(prepared.status, "ready");
  assert.equal(prepared.marks.length, 1);
  assert.equal(prepared.marks[0].x, "2027-05-02");
  assert.deepEqual(model.option.series[0].data, [["2027-05-02", 2590]]);
  assert.ok(Number.isFinite(echarts.time.parse("2027-05-02").getTime()));
});

async function readJson(relativePath) {
  return JSON.parse(await source(relativePath));
}

function minimalDashboard() {
  return {
    configVersion: 3,
    id: "exercise-dashboard",
    title: "Exercise dashboard",
    dataSources: {
      status: {
        kind: "inline",
        rows: [{ label: "Ready", value: 12 }],
      },
    },
    timeSyncGroups: [],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{
        id: "status",
        title: "Status",
        panels: [pieChart()],
      }],
    }],
  };
}

function chartBase(overrides) {
  return {
    configVersion: 3,
    title: "Status",
    description: "Current exercise status.",
    sourceId: "status",
    transformations: {
      filters: [],
      grouping: null,
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
    },
    presentation: {
      background: { color: "#FFFFFF", transparent: false },
      title: { align: "left" },
      collection: null,
    },
    interaction: {
      zoom: { enabled: false },
      timeSync: null,
    },
    layout: { size: "standard" },
    ...overrides,
  };
}

function pieChart(overrides = {}) {
  return chartBase({
    id: "status-share",
    typeId: "pie",
    roles: {
      category: { field: "label" },
      value: { field: "value" },
    },
    ...overrides,
  });
}

function kpiChart(overrides = {}) {
  return chartBase({
    id: "status-kpi",
    typeId: "kpi",
    roles: {
      value: { field: "value" },
    },
    ...overrides,
  });
}
