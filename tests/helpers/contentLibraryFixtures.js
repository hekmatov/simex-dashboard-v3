export function makeMediaItem(overrides = {}) {
  return {
    mediaId: "media-image-source",
    revision: 3,
    current: { kind: "asset", assetId: "asset-map" },
    displayName: "Response map",
    defaultDescription: "Response map showing exercise regions",
    origin: "uploaded",
    health: "ready",
    dimensions: { width: 4, height: 5 },
    byteLength: 20,
    mediaType: "image/png",
    ...structuredClone(overrides),
  };
}

export function makeSourceEntry(kind = "csv", overrides = {}) {
  const sourceId = overrides.sourceId ?? (kind === "geojson" ? "boundaries" : "cases");
  return {
    sourceId,
    origin: "legacy-import",
    ownership: "builder",
    displayName: sourceId,
    provenance: { migratedFrom: "dashboard-v4" },
    health: "ready",
    ...structuredClone(overrides),
  };
}

export function makeDashboardV4(overrides = {}) {
  const dashboard = {
    configVersion: 4,
    timezone: "UTC",
    id: "exercise-dashboard",
    title: "Exercise dashboard",
    dataSources: {
      "image-source": {
        kind: "staticImage",
        sourceVersion: 1,
        revision: 3,
        origin: { kind: "asset", assetId: "asset-map" },
        alt: "Response map",
        decorative: false,
        fit: "contain",
        crop: { x: 0, y: 0, width: 1000, height: 1000 },
        rotation: 0,
      },
    },
    assets: {
      "asset-map": {
        mediaType: "image/png",
        byteLength: 20,
        width: 4,
        height: 5,
        sha256: "a".repeat(64),
        storageState: "durable",
      },
    },
    chronoGroups: [],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{
        id: "response",
        title: "Response",
        panels: [{
          id: "image-panel",
          chart: imagePanel(),
        }],
      }],
    }],
  };
  return mergeDashboard(dashboard, overrides);
}

export function makeDashboardV5(overrides = {}) {
  const dashboard = makeDashboardV4();
  dashboard.configVersion = 5;
  dashboard.dataSources["image-source"] = {
    kind: "staticImage",
    sourceVersion: 2,
    mediaId: "media-image-source",
    alt: "Response map",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
  dashboard.contentLibrary = {
    mediaItems: { "media-image-source": makeMediaItem() },
    sourceEntries: {},
  };
  return mergeDashboard(dashboard, overrides);
}

function imagePanel() {
  return {
    configVersion: 3,
    id: "image-panel",
    typeId: "image",
    title: "Response map",
    description: "",
    sourceId: "image-source",
    roles: {},
    transformations: {
      filters: [],
      grouping: null,
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
    },
    presentation: {
      title: { align: "left" },
      description: { visible: false },
    },
    interaction: { zoom: { enabled: false }, timeSync: null },
    layout: { size: "standard" },
  };
}

function mergeDashboard(base, overrides) {
  const value = structuredClone(overrides);
  return {
    ...base,
    ...value,
    dataSources: { ...base.dataSources, ...(value.dataSources ?? {}) },
    assets: { ...base.assets, ...(value.assets ?? {}) },
    ...(value.contentLibrary ? {
      contentLibrary: {
        mediaItems: {
          ...(base.contentLibrary?.mediaItems ?? {}),
          ...(value.contentLibrary.mediaItems ?? {}),
        },
        sourceEntries: {
          ...(base.contentLibrary?.sourceEntries ?? {}),
          ...(value.contentLibrary.sourceEntries ?? {}),
        },
      },
    } : {}),
  };
}
