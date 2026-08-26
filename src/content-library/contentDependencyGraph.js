import {
  parsePortableQmdWithMedia,
  extractPortableMediaNodes,
} from "../static-content/qmd/portableQmdMedia.js";
import { classifyManagedSource } from "./sourceEntrySchema.js";

export function buildContentDependencyGraph({ dashboard = {}, activeRetainers = null } = {}) {
  const directUses = [];
  const mediaItems = dashboard.contentLibrary?.mediaItems ?? {};
  const sourceEntries = dashboard.contentLibrary?.sourceEntries ?? {};
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const placement of section.panels ?? []) {
        const panel = placement.chart ?? placement;
        const breadcrumb = breadcrumbFor(page, section, placement, panel);
        const primarySourceId = text(panel.sourceId);
        const primarySource = primarySourceId ? dashboard.dataSources?.[primarySourceId] : null;
        if (primarySource?.kind === "staticImage" && text(primarySource.mediaId)) {
          pushDirectUse(directUses, { ...breadcrumb, kind: "static-image", itemKind: "media", itemId: primarySource.mediaId });
        }
        if (primarySource?.kind === "staticText" && typeof primarySource.qmd === "string") {
          const parsed = parsePortableQmdWithMedia(primarySource.qmd);
          if (parsed.ast !== null) {
            for (const node of extractPortableMediaNodes(parsed.ast, { mediaItems })) {
              pushDirectUse(directUses, { ...breadcrumb, kind: "qmd-media", itemKind: "media", itemId: node.mediaId });
            }
          }
        }
        if (sourceEntries[primarySourceId] && classifyManagedSource(primarySourceId, primarySource)?.kind === "csv") {
          pushDirectUse(directUses, { ...breadcrumb, kind: "primary-csv", itemKind: "csv", itemId: primarySourceId });
        }
        const geoSourceId = text(panel.presentation?.map?.geoSource);
        if (sourceEntries[geoSourceId] && classifyManagedSource(geoSourceId, dashboard.dataSources?.[geoSourceId])?.kind === "geojson") {
          pushDirectUse(directUses, { ...breadcrumb, kind: "map-geojson", itemKind: "geojson", itemId: geoSourceId });
        }
      }
    }
  }
  const retainers = normalizedRetainers(activeRetainers);
  return deepFreeze({
    directUses: directUses.sort(compareEdge),
    retainers,
    impacts: buildCsvImpacts(dashboard, directUses),
  });
}

export const mediaDependencies = (graph, mediaId) => selectUses(graph, "media", mediaId);
export const csvDependencies = (graph, sourceId) => selectUses(graph, "csv", sourceId);
export const geoJsonDependencies = (graph, sourceId) => selectUses(graph, "geojson", sourceId);

export function activeRetentions(graph, item) {
  const id = text(item?.id);
  if (!id) return Object.freeze([]);
  const key = item?.kind === "media" ? "mediaIds" : "sourceIds";
  return Object.freeze((graph?.retainers ?? []).filter((record) => record[key].includes(id)));
}

export function temporalImpactContexts(graph, sourceId) {
  const id = text(sourceId);
  return Object.freeze((graph?.impacts ?? []).filter((impact) => impact.sourceId === id));
}

function selectUses(graph, kind, id) {
  return Object.freeze((graph?.directUses ?? []).filter((use) => use.itemKind === kind && use.itemId === id));
}

function breadcrumbFor(page, section, placement, panel) {
  return {
    pageId: text(page.id), pageLabel: text(page.title ?? page.label ?? page.id),
    sectionId: text(section.id), sectionLabel: text(section.title ?? section.label ?? section.id),
    panelId: text(placement.id ?? panel.id), panelLabel: text(placement.title ?? panel.title ?? placement.id ?? panel.id),
  };
}

function pushDirectUse(target, use) {
  if (!use.itemId || !use.pageId || !use.sectionId || !use.panelId) return;
  const id = `${use.itemKind}:${use.itemId}:${use.pageId}:${use.sectionId}:${use.panelId}`;
  if (!target.some((current) => current.id === id)) target.push({ id, ...use });
}

function normalizedRetainers(snapshot) {
  if (!Array.isArray(snapshot?.records)) return [];
  return snapshot.records.map((record) => ({
    ownerId: requiredText(record.ownerId, "Retainer owner id"),
    kind: requiredText(record.kind, "Retainer kind"), status: text(record.status) || "active",
    assetIds: uniqueSorted(record.assetIds), mediaIds: uniqueSorted(record.mediaIds), sourceIds: uniqueSorted(record.sourceIds),
  })).sort((left, right) => left.ownerId.localeCompare(right.ownerId));
}

function buildCsvImpacts(dashboard, directUses) {
  const chartSources = new Map(directUses.filter(({ itemKind }) => itemKind === "csv").map(({ panelId, itemId }) => [panelId, itemId]));
  const impacts = [];
  for (const group of dashboard.chronoGroups ?? []) addContexts(impacts, chartSources, chartIdsFor(group), "chrono-group", group.id, group.name ?? group.title);
  for (const scene of dashboard.scenes ?? []) {
    addContexts(impacts, chartSources, chartIdsFor(scene), "scene", scene.id, scene.name ?? scene.title);
    addContexts(impacts, chartSources, chartIdsFor(scene.present), "scene-presentation", scene.id, scene.name ?? scene.title);
  }
  return impacts.sort((left, right) => left.sourceId.localeCompare(right.sourceId) || impactRank(left.kind) - impactRank(right.kind) || left.id.localeCompare(right.id));
}

function addContexts(target, chartSources, chartIds, kind, id, label) {
  for (const chartId of chartIds) {
    const sourceId = chartSources.get(chartId);
    const key = `${sourceId}:${kind}:${id}`;
    if (sourceId && text(id) && !target.some((impact) => impact.key === key)) target.push({ key, sourceId, kind, id: text(id), label: text(label ?? id) });
  }
}

function chartIdsFor(value) {
  if (!value || typeof value !== "object") return [];
  const values = [...(Array.isArray(value.chartIds) ? value.chartIds : []), ...(Array.isArray(value.charts) ? value.charts : []), ...(Array.isArray(value.items) ? value.items : [])];
  return uniqueSorted(values.flatMap((entry) => typeof entry === "string" ? [entry] : [entry?.chartId, entry?.chart_id, entry?.id].filter(Boolean)));
}

const impactRank = (kind) => ({ "chrono-group": 0, scene: 1, "scene-presentation": 2 })[kind] ?? 9;
const compareEdge = (left, right) => left.itemKind.localeCompare(right.itemKind) || left.itemId.localeCompare(right.itemId) || left.pageId.localeCompare(right.pageId) || left.sectionId.localeCompare(right.sectionId) || left.panelId.localeCompare(right.panelId);

function uniqueSorted(values) {
  if (values === undefined) return [];
  if (!Array.isArray(values)) throw new TypeError("Retained ids must be arrays.");
  return [...new Set(values.map((value) => requiredText(value, "Retained id")))].sort();
}
function text(value) { return typeof value === "string" ? value.trim() : ""; }
function requiredText(value, description) { const result = text(value); if (!result) throw new TypeError(`${description} is required.`); return result; }
function deepFreeze(value) { if (!value || typeof value !== "object") return value; for (const child of Object.values(value)) deepFreeze(child); return Object.freeze(value); }
