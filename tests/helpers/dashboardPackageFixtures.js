import { serializeDashboardBundle } from "../../src/charting/config/dashboardBundleV3.js";
import { parseDashboardPackageCandidate } from "../../src/lib/dashboardPackageCandidate.js";
import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";
import { encodeAssetBase64, sha256HexSync } from "../../src/static-content/assets/assetPayloadEnvelope.js";

export function collaboratorPackage({ value = 4, staticPanels = false } = {}) {
  const raw = {
    configVersion: 3, timezone: "UTC", id: "shared-dashboard", title: "Shared dashboard",
    dataSources: { cases: { kind: "dataset", type: "uploadedCsv", fileName: "cases.csv",
      csvText: `date,value\n2026-08-21,${value}\n`, parsingMetadata: { date: { interpretation: "temporal", format: "YYYY-MM-DD" }, value: { interpretation: "numeric" } } } },
    chronoGroups: [], pages: [
      { id: "overview", title: "Overview", sections: [{ id: "signals", title: "Signals", panels: [
        { id: "placement-a", chart: packageChart("chart-a", "Cases") },
        { id: "placement-b", chart: packageChart("chart-b", "Second chart") },
      ] }] },
      { id: "details", title: "Details", sections: [{ id: "details-section", title: "Details", panels: [] }] },
    ],
  };
  const base = parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(raw)));
  if (!staticPanels) return base;
  const config = structuredClone(base.config);
  const bytes = imageFixtureBytes("image/png");
  const sha256 = sha256HexSync(bytes), assetId = `asset-${sha256}`;
  config.assets = { [assetId]: { mediaType: "image/png", byteLength: bytes.byteLength, width: 2, height: 3, sha256, storageState: "durable" } };
  config.contentLibrary.mediaItems.photo = { mediaId: "photo", revision: 1, current: { kind: "asset", assetId }, displayName: "Map photo", defaultDescription: "A map", origin: "uploaded", health: "ready", dimensions: { width: 2, height: 3 }, byteLength: bytes.byteLength, mediaType: "image/png" };
  config.dataSources.picture = { kind: "staticImage", sourceVersion: 2, mediaId: "photo", alt: "A map", decorative: false, fit: "contain", crop: { x: 0, y: 0, width: 1000, height: 1000 }, rotation: 0 };
  config.dataSources.text = { kind: "staticText", sourceVersion: 1, revision: 1, renderingPolicy: "portable-qmd-v1", qmd: "Authored photo stays in prose: photo.\n\n![Map](simex-media:photo){width=100 align=center flow=block frame=none caption=\"\" decorative=false}" };
  config.pages[0].sections[0].panels.push(...[ ["image", "picture"], ["freeText", "text"] ].map(([typeId, sourceId]) => ({
    id: `placement-${sourceId}`, chart: { ...packageChart(`chart-${sourceId}`, sourceId), typeId, sourceId,
      roles: {}, transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" }, interaction: { zoom: { enabled: false }, timeSync: null } },
  })));
  return parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(config, { assetPayloads: { [assetId]: { base64: encodeAssetBase64(bytes), byteLength: bytes.byteLength, mediaType: "image/png", sha256 } } })));
}

export function packageChart(id, title) {
  return { configVersion: 3, id, title, typeId: "line", description: "Authored description", sourceId: "cases",
    roles: { measurements: [{ field: "value", axis: "primary" }], observation: { field: "date", interpretation: "temporal" } },
    transformations: { filters: [], grouping: null, aggregation: "sum", duplicates: "aggregate", missingValues: "gap" },
    presentation: { title: { align: "left" }, collection: null }, interaction: { zoom: { enabled: true }, timeSync: null }, layout: { size: "wide" } };
}

export function attentionPackage() {
  const config = structuredClone(collaboratorPackage().config);
  config.pages[0].sections.unshift({ id: "attention", title: "At a glance", role: "attention", panels: [{
    id: "kpi-placement", drill: { kind: "section", sectionId: "signals" }, chart: {
      ...packageChart("kpi-chart", "Current cases"), typeId: "kpi", roles: { value: { field: "value" } },
      transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
      interaction: { zoom: { enabled: false }, timeSync: null }, layout: { size: "standard" },
    },
  }] });
  return parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(config)));
}

export function mappedPackage() {
  const config = structuredClone(collaboratorPackage().config);
  delete config.datasetProfiles;
  config.dataSources.cases.csvText = "date,value,municipality\n2026-08-21,4,A\n";
  config.dataSources.boundaries = { kind: "dataset", type: "uploadedGeoJson", fileName: "boundaries.geojson",
    geoJson: { type: "FeatureCollection", features: [{ type: "Feature", properties: { code: "A" }, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }] } };
  config.contentLibrary.sourceEntries.boundaries = { sourceId: "boundaries", origin: "packaged", ownership: "builder", displayName: "Boundaries", provenance: {}, health: "ready" };
  config.pages[0].sections[0].panels.push({ id: "map-placement", chart: { ...packageChart("map-chart", "Cases map"), typeId: "choroplethMap",
    roles: { geography: { field: "municipality", interpretation: "geographic" }, value: { field: "value" } },
    presentation: { title: { align: "left" }, collection: null, map: { geoSource: "boundaries", joinField: "code" } },
    interaction: { zoom: { enabled: false }, timeSync: null },
  } });
  return parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(config)));
}

export function synchronizedPackage() {
  const config = structuredClone(collaboratorPackage().config);
  config.chronoGroups = [{ id: "clock", name: "Shared clock", period: { start: "2026-08-21", end: "2026-08-21" }, matching: { policy: "exact" }, secondsPerFrame: 1,
    members: [{ chartId: "chart-a", timeRole: "observation" }, { chartId: "chart-b", timeRole: "observation" }] }];
  for (const panel of config.pages[0].sections[0].panels) panel.chart.interaction.timeSync = { groupId: "clock" };
  return parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(config)));
}
