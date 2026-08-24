import assert from "node:assert/strict";
import test from "node:test";

import {
  collectDashboardPackageExportIssues,
  prepareDashboardPackageExport,
} from "../src/lib/dashboardPackageExport.js";
import {
  parseDashboardBundle,
  serializeDashboardBundle,
} from "../src/charting/config/dashboardBundleV3.js";
import { loadDashboardConfig } from "../src/lib/loadDashboard.js";

test("package preparation embeds tracked, generated, geographic, and image source material", async () => {
  const dashboard = packageDashboard();
  const original = structuredClone(dashboard);
  const textByPath = {
    "data/cases.csv": "date,cases\n2026-08-21,4\n",
    "data/generated-summary.csv": "date,total\n2026-08-21,4\n",
  };
  const geoJson = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: "A",
      properties: { name: "Area A" },
      geometry: { type: "Point", coordinates: [4.9, 52.3] },
    }],
  };

  const prepared = await prepareDashboardPackageExport(dashboard, {
    readText: async (path) => textByPath[path],
    readJson: async (path) => {
      assert.equal(path, "data/areas.geojson");
      return geoJson;
    },
    readImageDataUrl: async (src) => {
      assert.equal(src, "assets/briefing.png");
      return "data:image/png;base64,aW1hZ2U=";
    },
  });

  assert.deepEqual(dashboard, original);
  assert.equal(Object.hasOwn(prepared.config, "loadedData"), false);
  assert.equal(Object.hasOwn(prepared.config, "dataSourceStates"), false);
  assert.deepEqual(prepared.config.dataSources.cases, {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "cases.csv",
    csvText: textByPath["data/cases.csv"],
    parsingMetadata: {
      date: { interpretation: "temporal", format: "YYYY-MM-DD", timezone: "date-only" },
    },
    provenance: { label: "Cases source" },
  });
  assert.equal(
    prepared.config.dataSources.generated.csvText,
    textByPath["data/generated-summary.csv"],
  );
  assert.deepEqual(prepared.config.dataSources.boundaries, {
    kind: "dataset",
    type: "uploadedGeoJson",
    fileName: "areas.geojson",
    geoJson,
    provenance: { label: "Area boundaries" },
  });
  assert.equal(
    prepared.config.dataSources.image.rows[0].src,
    "data:image/png;base64,aW1hZ2U=",
  );
  assert.equal(
    prepared.config.dataSources.uploaded.csvText,
    "label,value\nReady,1\n",
  );
  assert.deepEqual(prepared.manifest, {
    embeddedCsvCount: 3,
    embeddedGeoJsonCount: 1,
    embeddedImageCount: 1,
  });
});

test("a self-contained package round-trips every embedded source", async () => {
  const geoJson = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: "A",
      properties: { name: "Area A" },
      geometry: { type: "Point", coordinates: [4.9, 52.3] },
    }],
  };
  const prepared = await prepareDashboardPackageExport(packageDashboard(), {
    readText: async (path) => ({
      "data/cases.csv": "date,cases\n2026-08-21,4\n",
      "data/generated-summary.csv": "date,total\n2026-08-21,4\n",
    })[path],
    readJson: async () => geoJson,
    readImageDataUrl: async () => "data:image/png;base64,aW1hZ2U=",
  });

  const bundle = serializeDashboardBundle(prepared.config, {
    now: "2026-08-24T12:00:00.000Z",
  });
  const imported = parseDashboardBundle(JSON.stringify(bundle));

  assert.equal(imported.dataSources.cases.csvText, "date,cases\n2026-08-21,4\n");
  assert.equal(imported.dataSources.generated.csvText, "date,total\n2026-08-21,4\n");
  assert.deepEqual(imported.dataSources.boundaries.geoJson, geoJson);
  assert.equal(imported.dataSources.image.rows[0].src, "data:image/png;base64,aW1hZ2U=");
});

test("package preparation strips browser-only asset references", async () => {
  const dashboard = packageDashboard();
  dashboard.dataSources.uploaded.browserAssetId = `sha256-${"a".repeat(64)}`;
  dashboard.dataSources.image.browserImageAssetIds = { 0: `sha256-${"b".repeat(64)}` };

  const prepared = await prepareDashboardPackageExport(dashboard, {
    readText: async () => "date,value\n2026-08-21,1\n",
    readJson: async () => ({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [4.9, 52.3] },
      }],
    }),
    readImageDataUrl: async () => "data:image/png;base64,aW1hZ2U=",
  });

  assert.equal(
    Object.hasOwn(prepared.config.dataSources.uploaded, "browserAssetId"),
    false,
  );
  assert.equal(
    Object.hasOwn(prepared.config.dataSources.image, "browserImageAssetIds"),
    false,
  );
});

test("portable packages reject browser-only asset references", () => {
  const dashboard = packageDashboard();
  delete dashboard.dataSources.cases;
  delete dashboard.dataSources.generated;
  delete dashboard.dataSources.boundaries;
  const bundle = serializeDashboardBundle(dashboard, { now: null });
  bundle.config.dataSources.uploaded.browserAssetId = `sha256-${"a".repeat(64)}`;

  assert.throws(
    () => parseDashboardBundle(JSON.stringify(bundle)),
    /browser-only asset reference/i,
  );
});

test("an imported self-contained package hydrates without tracked source requests", async () => {
  const geoJson = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: "A",
      properties: { name: "Area A" },
      geometry: { type: "Point", coordinates: [4.9, 52.3] },
    }],
  };
  const prepared = await prepareDashboardPackageExport(packageDashboard(), {
    readText: async (path) => ({
      "data/cases.csv": "date,cases\n2026-08-21,4\n",
      "data/generated-summary.csv": "date,total\n2026-08-21,4\n",
    })[path],
    readJson: async () => geoJson,
    readImageDataUrl: async () => "data:image/png;base64,aW1hZ2U=",
  });
  const imported = parseDashboardBundle(JSON.stringify(
    serializeDashboardBundle(prepared.config, { now: null }),
  ));

  const loaded = await loadDashboardConfig(imported, {});

  assert.deepEqual(loaded.loadedData.cases, [{ date: "2026-08-21", cases: 4 }]);
  assert.deepEqual(loaded.loadedData.generated, [{ date: "2026-08-21", total: 4 }]);
  assert.deepEqual(loaded.loadedData.boundaries, geoJson);
});

test("export readiness reports every unfinished draft with its recovery action", () => {
  const issues = collectDashboardPackageExportIssues({
    chartEditor: true,
    chartWizard: true,
    layout: true,
    structure: true,
    scenario: true,
    chronoGroup: true,
    scene: true,
    inlineRename: true,
    operation: false,
    pendingContent: true,
  });

  assert.deepEqual(issues, [
    { id: "chart-editor", label: "Chart changes", actionLabel: "Return to chart editor" },
    { id: "chart-wizard", label: "New chart draft", actionLabel: "Resume chart draft" },
    { id: "layout", label: "Layout changes", actionLabel: "Review layout changes" },
    { id: "structure", label: "Pages and sections draft", actionLabel: "Open Pages & sections" },
    { id: "scenario", label: "Scenario Passport draft", actionLabel: "Open Scenario Passport" },
    { id: "chrono-group", label: "Chrono Group draft", actionLabel: "Open Chrono Studio" },
    { id: "scene", label: "Scene draft", actionLabel: "Open Scene Studio" },
    { id: "inline-rename", label: "Unfinished rename", actionLabel: "Return to rename" },
  ]);
});

function packageDashboard() {
  return {
    configVersion: 3,
    id: "package-dashboard",
    title: "Package dashboard",
    timezone: "UTC",
    dataSources: {
      cases: {
        kind: "csv",
        path: "data/cases.csv",
        parsingMetadata: {
          date: { interpretation: "temporal", format: "YYYY-MM-DD", timezone: "date-only" },
        },
        provenance: { label: "Cases source" },
      },
      generated: {
        kind: "csv",
        path: "data/generated-summary.csv",
        provenance: { label: "Generated summary derivative" },
      },
      boundaries: {
        kind: "geojson",
        path: "data/areas.geojson",
        provenance: { label: "Area boundaries" },
      },
      uploaded: {
        kind: "dataset",
        type: "uploadedCsv",
        fileName: "upload.csv",
        csvText: "label,value\nReady,1\n",
        provenance: { label: "Uploaded source" },
      },
      image: {
        kind: "inline",
        rows: [{ src: "assets/briefing.png", alt: "Briefing", fit: "contain" }],
        provenance: { label: "Briefing image" },
      },
    },
    datasetProfiles: {},
    loadedData: {
      cases: [{ date: "2026-08-21", cases: 4 }],
    },
    dataSourceStates: { cases: { status: "ready" } },
    chronoGroups: [],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{
        id: "briefing",
        title: "Briefing",
        panels: [{
          configVersion: 3,
          id: "briefing-image",
          typeId: "image",
          title: "Briefing image",
          description: "Operational briefing.",
          sourceId: "image",
          roles: {},
          transformations: {
            filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap",
          },
          presentation: { title: { align: "left" }, collection: null },
          interaction: { zoom: { enabled: true }, timeSync: null },
          layout: { size: "standard" },
        }],
      }],
    }],
  };
}
