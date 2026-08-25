import { validateChartInstance } from "../charting/config/chartConfigV3.js";
import { migrateDashboardV3ToV4 } from "../charting/config/migrateDashboardV3ToV4.js";
import { migrateDashboardV4ToV5 } from "../content-library/migrateDashboardV4ToV5.js";
import { validateDashboardChartReferences } from "../charting/config/dashboardSemanticReferences.js";
import { validateStaticDestination } from "./staticPanelCapabilities.js";
import {
  normalizeStaticSource,
  validateAuthoredAssetManifest,
  validateStaticSource,
} from "./staticSourceSchema.js";
import {
  IMAGE_ASSET_LIMITS,
  authoredAssetManifestBytes,
} from "./image/imageAssetValidation.js";
import { normalizeContentLibrary, validateContentLibrary } from "../content-library/contentLibrarySchema.js";
import { validateMediaItem } from "../content-library/mediaItems.js";

export function nextStaticSourceRevision(previousSource, nextSource) {
  const next = normalizeStaticSource(nextSource);
  if (next.kind !== "staticText") {
    throw new Error("Image revisions are owned by MediaItems.");
  }
  if (previousSource === null || previousSource === undefined) return 1;

  const previous = normalizeStaticSource(previousSource);
  if (previous.kind !== "staticText") {
    throw new Error("Image revisions are owned by MediaItems.");
  }
  const previousRevision = previous.revision;
  return sameSavedSource(previous, next) ? previousRevision : previousRevision + 1;
}

export function prepareStaticPanelTransaction({
  dashboard,
  operation,
  destination,
  panelId,
  panel,
  placement,
  mediaItem = null,
  assets = {},
  stagedAssetIds = [],
} = {}) {
  const suppliedDashboard = cloneRecord(dashboard, "Static panel transaction dashboard");
  const previousDashboard = migrateDashboardV4ToV5(
    suppliedDashboard.configVersion === 5
      ? suppliedDashboard
      : migrateDashboardV3ToV4(suppliedDashboard),
  );
  if (!isRecord(panel)) throw new TypeError("Static panel transaction panel is required.");
  validateChartInstance(panel);

  const candidateDashboard = structuredClone(previousDashboard);
  const previousPlacement = operation === "update"
    ? findPanel(candidateDashboard, panelId ?? panel.id)
    : null;
  if (operation !== "create" && operation !== "update") {
    throw new Error(`Unknown static panel transaction operation "${String(operation)}".`);
  }
  if (operation === "update" && !previousPlacement) {
    throw new Error(`Static panel "${String(panelId ?? panel.id)}" does not exist.`);
  }

  const existingPlacement = previousPlacement
    ? candidateDashboard.dataSources?.[previousPlacement.panel.sourceId]
    : undefined;
  const previousSourceId = previousPlacement?.panel?.sourceId ?? null;
  const committedPlacement = normalizeStaticSource(placement);
  const isImage = committedPlacement.kind === "staticImage";
  if (isImage) {
    validateMediaItem(mediaItem, { assets });
    if (mediaItem.mediaId !== committedPlacement.mediaId) {
      throw new Error("Image placement mediaId must match its MediaItem.");
    }
  } else if (mediaItem !== null) {
    throw new Error("Free-text placement cannot include a MediaItem.");
  }
  candidateDashboard.dataSources = {
    ...(candidateDashboard.dataSources ?? {}),
    [panel.sourceId]: committedPlacement,
  };
  const mergedAssets = {
    ...(candidateDashboard.assets ?? {}),
    ...structuredClone(assets),
  };
  if (Object.hasOwn(candidateDashboard, "assets") || Object.keys(assets).length > 0) {
    candidateDashboard.assets = mergedAssets;
  }
  candidateDashboard.contentLibrary = normalizeContentLibrary(candidateDashboard.contentLibrary);
  if (isImage) {
    candidateDashboard.contentLibrary.mediaItems[mediaItem.mediaId] = structuredClone(mediaItem);
  }

  if (operation === "create") {
    const target = validateStaticDestination(destination, candidateDashboard);
    const section = candidateDashboard.pages
      .find(({ id }) => id === target.pageId)
      .sections.find(({ id }) => id === target.sectionId);
    if (findPanel(candidateDashboard, panel.id)) {
      throw new Error(`Static panel "${panel.id}" already exists.`);
    }
    section.panels = [...(section.panels ?? []), { id: panel.id, chart: structuredClone(panel) }];
  } else {
    previousPlacement.wrapper.id = panel.id;
    previousPlacement.wrapper.chart = structuredClone(panel);
    pruneStaticOwnership(candidateDashboard, {
      sourceIds: [previousSourceId],
    });
  }

  const finalAssets = candidateDashboard.assets ?? {};
  validateAuthoredAssetManifest(finalAssets);
  if (authoredAssetManifestBytes(finalAssets) > IMAGE_ASSET_LIMITS.dashboardBudgetBytes) {
    throw new Error("The Image transaction exceeds the dashboard's 200 MiB authored-asset budget.");
  }
  validateStaticSource(committedPlacement, { assets: finalAssets });
  validateContentLibrary(candidateDashboard.contentLibrary, {
    assets: finalAssets,
    dataSources: candidateDashboard.dataSources,
  });

  validateDashboardChartReferences(
    collectPanelPlacements(candidateDashboard),
    candidateDashboard.dataSources,
    { assets: candidateDashboard.assets },
  );

  return deepFreeze({
    kind: "static-panel-transaction",
    operation,
    panelId: panel.id,
    mediaId: isImage ? mediaItem.mediaId : null,
    mediaItem: isImage ? structuredClone(mediaItem) : null,
    stagedAssetIds: [...new Set(stagedAssetIds)].sort(),
    sourceId: panel.sourceId,
    expectedMediaRevision: isImage
      ? previousDashboard.contentLibrary?.mediaItems?.[mediaItem.mediaId]?.revision ?? mediaItem.revision
      : null,
    baseDashboard: previousDashboard,
    previousDashboard,
    candidateDashboard,
  });
}

export function removeDashboardPanel(dashboard, panelId) {
  if (!isRecord(dashboard)) throw new TypeError("A dashboard object is required.");
  const removed = [];
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      section.panels = (section.panels ?? []).filter((wrapper) => {
        const chart = wrapper?.chart ?? wrapper;
        const placementId = wrapper?.id ?? chart?.id;
        if (placementId !== panelId) return true;
        removed.push({ chartId: chart?.id, sourceId: chart?.sourceId });
        return false;
      });
    }
  }
  if (removed.length === 0) return { removedChartId: null, removedSourceIds: [] };
  const removedChartIds = new Set(removed.map(({ chartId }) => chartId).filter(Boolean));
  dashboard.chronoGroups = (dashboard.chronoGroups ?? []).flatMap((group) => {
    const members = (group.members ?? []).filter(({ chartId }) => !removedChartIds.has(chartId));
    return members.length > 0 ? [{ ...group, members }] : [];
  });
  const sourceIds = [...new Set(removed.map(({ sourceId }) => sourceId).filter(Boolean))];
  pruneStaticOwnership(dashboard, { sourceIds });
  return {
    removedChartId: removed[0].chartId ?? null,
    removedSourceIds: sourceIds,
  };
}

export function pruneStaticOwnership(dashboard, {
  sourceIds = [],
  assetIds = [],
} = {}) {
  const referencedSourceIds = panelSourceIds(dashboard);
  for (const sourceId of new Set(sourceIds.filter(Boolean))) {
    const source = dashboard.dataSources?.[sourceId];
    if (
      !referencedSourceIds.has(sourceId)
      && (source?.kind === "staticText" || source?.kind === "staticImage")
    ) {
      delete dashboard.dataSources[sourceId];
    }
  }
  const referencedAssetIds = new Set(
    Object.values(dashboard.contentLibrary?.mediaItems ?? {})
      .map((item) => item?.current?.kind === "asset" ? item.current.assetId : null)
      .filter(Boolean),
  );
  for (const assetId of new Set(assetIds.filter(Boolean))) {
    if (!referencedAssetIds.has(assetId) && dashboard.assets) {
      delete dashboard.assets[assetId];
    }
  }
  return dashboard;
}

export async function commitStaticPanelTransaction(
  prepared,
  { controller, commit, commitPrepared, rollback } = {},
) {
  if (prepared?.kind !== "static-panel-transaction") {
    throw new TypeError("A prepared static panel transaction is required.");
  }
  try {
    const dashboard = typeof commitPrepared === "function"
      ? await commitPrepared(prepared)
      : typeof controller?.commitPrepared === "function"
      ? await controller.commitPrepared(prepared)
      : await requireCommit(commit)(structuredClone(prepared.candidateDashboard));
    return {
      dashboard: structuredClone(dashboard),
      committedRevision: prepared.mediaItem?.revision ?? null,
    };
  } catch (error) {
    if (typeof rollback === "function") await rollback(prepared, error);
    throw error;
  }
}

function sameSavedSource(previous, next) {
  const comparable = (value) => {
    const clone = structuredClone(value);
    delete clone.revision;
    return clone;
  };
  return stableSerialize(comparable(previous)) === stableSerialize(comparable(next));
}

function stableSerialize(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function findPanel(dashboard, panelId) {
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const wrapper of section.panels ?? []) {
        const panel = wrapper.chart ?? wrapper;
        if (panel.id === panelId) return { page, section, wrapper, panel };
      }
    }
  }
  return null;
}

function collectPanelPlacements(dashboard) {
  const panels = [];
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const wrapper of section.panels ?? []) {
        panels.push({
          chart: wrapper.chart ?? wrapper,
          pageId: page.id,
          sectionId: section.id,
        });
      }
    }
  }
  return { panels };
}

function panelSourceIds(dashboard) {
  return new Set(collectPanelPlacements(dashboard).panels
    .map(({ chart }) => chart?.sourceId)
    .filter(Boolean));
}

function requireCommit(commit) {
  if (typeof commit !== "function") {
    throw new TypeError("A dashboard commit function or controller is required.");
  }
  return commit;
}

function cloneRecord(value, description) {
  if (!isRecord(value)) throw new TypeError(`${description} must be an object.`);
  return structuredClone(value);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}
