import { normalizeContentLibrary } from "./contentLibrarySchema.js";

export function migrateDashboardV4ToV5(input) {
  if (!isRecord(input)) throw new TypeError("Dashboard V5 migration input must be an object.");
  if (![4, 5].includes(input.configVersion)) {
    throw new Error("Dashboard V5 migration supports version 4 or version 5 input.");
  }
  const dashboard = structuredClone(input);
  if (dashboard.configVersion === 5) {
    dashboard.contentLibrary = normalizeContentLibrary(dashboard.contentLibrary);
    return dashboard;
  }

  const contentLibrary = normalizeContentLibrary(dashboard.contentLibrary ?? {});
  const mediaIds = new Set(Object.keys(contentLibrary.mediaItems));
  for (const [sourceId, source] of Object.entries(dashboard.dataSources ?? {})) {
    if (source?.kind === "staticImage") {
      const mediaId = uniqueMediaId(mediaIds, `media-${sourceId}`);
      mediaIds.add(mediaId);
      contentLibrary.mediaItems[mediaId] = migrateMediaItem({
        mediaId,
        sourceId,
        source,
        manifest: dashboard.assets?.[source.origin?.assetId],
        displayName: panelTitleForSource(dashboard, sourceId) ?? sourceId,
      });
      dashboard.dataSources[sourceId] = migratePlacement(source, mediaId);
    } else if (isManagedDescriptor(source)) {
      contentLibrary.sourceEntries[sourceId] ??= migrateSourceEntry(sourceId, source);
    }
  }
  dashboard.contentLibrary = contentLibrary;
  dashboard.configVersion = 5;
  return dashboard;
}

function migratePlacement(source, mediaId) {
  const decorative = source.decorative === true;
  return {
    kind: "staticImage",
    sourceVersion: 2,
    mediaId,
    alt: decorative ? "" : source.alt ?? "",
    decorative,
    fit: source.fit ?? "contain",
    crop: structuredClone(source.crop ?? { x: 0, y: 0, width: 1000, height: 1000 }),
    rotation: source.rotation ?? 0,
  };
}

function migrateMediaItem({ mediaId, sourceId, source, manifest, displayName }) {
  const current = migrateCurrent(source.origin, sourceId);
  const origin = source.origin?.kind === "asset"
    ? "uploaded"
    : source.origin?.kind === "package"
    ? "packaged"
    : source.origin?.kind === "url"
    ? "external"
    : "legacy-import";
  const health = source.origin?.kind === "url"
    ? "external"
    : source.origin?.kind === "replacementRequired"
    ? "needs-relink"
    : "ready";
  return {
    mediaId,
    revision: Number.isSafeInteger(source.revision) && source.revision > 0 ? source.revision : 1,
    current,
    displayName,
    defaultDescription: source.decorative ? "" : source.alt ?? "",
    origin,
    health,
    ...(manifest ? {
      dimensions: { width: manifest.width, height: manifest.height },
      byteLength: manifest.byteLength,
      mediaType: manifest.mediaType,
    } : {}),
  };
}

function migrateCurrent(origin, sourceId) {
  if (origin?.kind === "asset") return { kind: "asset", assetId: origin.assetId };
  if (origin?.kind === "package") return { kind: "package", path: origin.path };
  if (origin?.kind === "url") return { kind: "url", url: origin.url };
  return { kind: "asset", assetId: `missing-${sourceId}` };
}

function migrateSourceEntry(sourceId, source) {
  const generated = source.provenance?.ownership === "dashboard"
    || source.provenance?.generated === true;
  return {
    sourceId,
    origin: generated ? "generated" : "legacy-import",
    ownership: generated ? "dashboard" : "builder",
    displayName: source.provenance?.label ?? source.fileName ?? sourceId,
    provenance: { migratedFrom: "dashboard-v4" },
    health: "ready",
  };
}

function panelTitleForSource(dashboard, sourceId) {
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const placement of section.panels ?? []) {
        const chart = placement?.chart ?? placement;
        if (chart?.sourceId === sourceId && typeof chart.title === "string" && chart.title.trim()) return chart.title;
      }
    }
  }
  return null;
}

function uniqueMediaId(ids, proposed) {
  const safe = proposed.replace(/[^A-Za-z0-9_-]/g, "-");
  if (!ids.has(safe)) return safe;
  let suffix = 2;
  while (ids.has(`${safe}-${suffix}`)) suffix += 1;
  return `${safe}-${suffix}`;
}

function isManagedDescriptor(value) {
  return value?.kind === "csv" || value?.kind === "geojson"
    || (value?.kind === "dataset" && ["uploadedCsv", "uploadedGeoJson"].includes(value.type));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
