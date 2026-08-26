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
import {
  encodeAssetBase64,
  sha256HexSync,
} from "../src/static-content/assets/assetPayloadEnvelope.js";
import { imageFixtureBytes } from "./fixtures/imageFixtureBytes.js";

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
    authoredAssetCount: 0,
    networkDependencies: [],
  });
});

test("a complete package blocks needs-relink legacy Images and round-trips tabular sources once removed", async () => {
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

  assert.throws(
    () => serializeDashboardBundle(prepared.config, {
      now: "2026-08-24T12:00:00.000Z",
    }),
    /needs-relink|complete package/i,
  );
  delete prepared.config.dataSources.image;
  prepared.config.pages[0].sections[0].panels = [];

  const bundle = serializeDashboardBundle(prepared.config, {
    now: "2026-08-24T12:00:00.000Z",
  });
  const imported = parseDashboardBundle(JSON.stringify(bundle));

  assert.equal(imported.dataSources.cases.csvText, "date,cases\n2026-08-21,4\n");
  assert.equal(imported.dataSources.generated.csvText, "date,total\n2026-08-21,4\n");
  assert.deepEqual(imported.dataSources.boundaries.geoJson, geoJson);
  assert.equal(Object.hasOwn(imported.dataSources, "image"), false);
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
  delete prepared.config.dataSources.image;
  prepared.config.pages[0].sections[0].panels = [];
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

test("package preparation preflights local authored bytes and discloses linked network dependencies", async () => {
  const bytes = imageFixtureBytes("image/png");
  const sha256 = sha256HexSync(bytes);
  const assetId = `asset-${sha256}`;
  const dashboard = authoredImageDashboard({ assetId, sha256 });

  const prepared = await prepareDashboardPackageExport(dashboard, {
    readAuthoredAsset: async (requestedId) => {
      assert.equal(requestedId, assetId);
      return {
        assetId,
        mediaType: "image/png",
        byteLength: bytes.byteLength,
        width: 2,
        height: 3,
        sha256,
        bytes,
      };
    },
  });

  assert.deepEqual(prepared.assetPayloads, {
    [assetId]: {
      base64: encodeAssetBase64(bytes),
      byteLength: bytes.byteLength,
      mediaType: "image/png",
      sha256,
    },
  });
  assert.deepEqual(prepared.manifest.networkDependencies, ["https://example.test/map.png"]);
  assert.equal(prepared.manifest.authoredAssetCount, 1);
  const bundle = serializeDashboardBundle(prepared.config, {
    now: null,
    assetPayloads: prepared.assetPayloads,
  });
  assert.equal(bundle.version, 5);
});

test("package preparation rejects missing or corrupt local authored bytes before export", async () => {
  const expectedBytes = imageFixtureBytes("image/png");
  const sha256 = sha256HexSync(expectedBytes);
  const assetId = `asset-${sha256}`;
  const dashboard = authoredImageDashboard({ assetId, sha256 });

  await assert.rejects(
    prepareDashboardPackageExport(dashboard, {
      readAuthoredAsset: async () => {
        throw Object.assign(new Error("not found"), { code: "AUTHORED_ASSET_MISSING" });
      },
    }),
    /local-image.*missing|missing.*local-image/i,
  );
  await assert.rejects(
    prepareDashboardPackageExport(dashboard, {
      readAuthoredAsset: async () => ({
        assetId,
        mediaType: "image/png",
        byteLength: expectedBytes.byteLength,
        width: 2,
        height: 3,
        sha256,
        bytes: new Uint8Array([9, 9, 9, 9]),
      }),
    }),
    /local-image.*corrupt|corrupt.*local-image/i,
  );
});

function authoredImageDashboard({ assetId, sha256 }) {
  return {
    configVersion: 5,
    id: "authored-package-dashboard",
    title: "Authored package dashboard",
    timezone: "UTC",
    dataSources: {
      "local-image": staticImagePlacement("media-local-image"),
      "linked-image": staticImagePlacement("media-linked-image"),
    },
    contentLibrary: {
      mediaItems: {
        "media-local-image": mediaItem({
          mediaId: "media-local-image",
          current: { kind: "asset", assetId },
          origin: "uploaded",
          health: "ready",
          dimensions: { width: 2, height: 3 },
          byteLength: imageFixtureBytes("image/png").byteLength,
          mediaType: "image/png",
        }),
        "media-linked-image": mediaItem({
          mediaId: "media-linked-image",
          current: { kind: "url", url: "https://example.test/map.png" },
          origin: "external",
          health: "external",
        }),
      },
      sourceEntries: {},
    },
    datasetProfiles: {},
    assets: {
      [assetId]: {
        mediaType: "image/png",
        byteLength: imageFixtureBytes("image/png").byteLength,
        width: 2,
        height: 3,
        sha256,
        storageState: "durable",
      },
    },
    chronoGroups: [],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{
        id: "images",
        title: "Images",
        panels: [
          imageChart("local-chart", "local-image"),
          imageChart("linked-chart", "linked-image"),
        ],
      }],
    }],
  };
}

function staticImagePlacement(mediaId) {
  return {
    kind: "staticImage",
    sourceVersion: 2,
    mediaId,
    alt: "Operational image",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
}

function mediaItem(overrides) {
  return {
    mediaId: "media-image",
    revision: 1,
    current: { kind: "url", url: "https://example.test/image.png" },
    displayName: "Operational image",
    defaultDescription: "Operational image",
    origin: "external",
    health: "external",
    ...overrides,
  };
}

function imageChart(id, sourceId) {
  return {
    configVersion: 3,
    id,
    typeId: "image",
    title: id,
    description: "",
    sourceId,
    roles: {},
    transformations: {
      filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap",
    },
    presentation: { title: { align: "left" }, collection: null },
    interaction: { zoom: { enabled: true }, timeSync: null },
    layout: { size: "standard" },
  };
}

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
