import { buildContentDependencyGraph } from "../content-library/contentDependencyGraph.js";
import { parsePortableQmdWithMedia } from "../static-content/qmd/portableQmdMedia.js";

export const dashboardPackageSectionKey = (pageId, sectionId) => JSON.stringify([pageId, sectionId]);

// Explicit content choices never receive dependency IDs. Recomputing the view
// can therefore release an automatic check without erasing a manual choice.
export function dashboardPackageSelectionState(candidate, manual = {}, mode = "partial") {
  const inventory = buildDashboardPackageImportInventory(candidate);
  const selection = mode === "partial" ? manual : {
    pageIds: inventory.pages.filter(page => page.eligible || mode === "replace").map(page => page.id),
    sourceIds: inventory.sources.map(item => item.id), mediaIds: inventory.media.map(item => item.id),
  };
  const automatic = resolveDashboardPackageSelection(candidate, {
    pageIds: selection.pageIds, sectionIds: selection.sectionIds, placementIds: selection.placementIds,
  });
  return { selection, resolved: resolveDashboardPackageSelection(candidate, selection),
    automaticSourceIds: automatic.sourceIds, automaticMediaIds: automatic.mediaIds };
}

export function buildDashboardPackageImportInventory(candidate) {
  const config = candidate.config;
  const pages = [], sections = [], placements = [];
  for (const page of config.pages ?? []) {
    const pageName = page.label || page.title || "Untitled page";
    pages.push({ id: page.id, name: pageName, eligible: !page.landing && page.pageType !== "landing" });
    for (const section of page.sections ?? []) {
      const sectionName = section.title || "Untitled section";
      sections.push({ id: dashboardPackageSectionKey(page.id, section.id), sectionId: section.id, pageId: page.id, name: sectionName, breadcrumb: pageName });
      for (const placement of section.panels ?? []) {
        const chart = placement.chart ?? placement;
        placements.push({ id: placement.id, chartId: chart.id, pageId: page.id, sectionId: section.id,
          sectionKey: dashboardPackageSectionKey(page.id, section.id), name: chart.title || "Untitled panel", typeId: chart.typeId, breadcrumb: `${pageName} / ${sectionName}` });
      }
    }
  }
  const sources = Object.entries(config.dataSources ?? {}).filter(([, source]) => ["csv", "geojson", "dataset", "inline"].includes(source.kind))
    .map(([id, source]) => ({ id, kind: source.kind === "geojson" || source.type === "uploadedGeoJson" ? "geojson" : "csv",
      name: config.contentLibrary?.sourceEntries?.[id]?.displayName || source.fileName || id,
      rowCount: config.datasetProfiles?.[id]?.rowCount }));
  const media = Object.entries(config.contentLibrary?.mediaItems ?? {}).map(([id, item]) => ({ id,
    name: item.displayName, kind: "media", mediaType: item.mediaType, byteLength: item.byteLength, health: item.health }));
  return { pages, sections, placements, sources, media };
}

export function resolveDashboardPackageSelection(candidate, selection = {}) {
  const config = candidate.config;
  const inventory = buildDashboardPackageImportInventory(candidate);
  const pages = new Set(selection.pageIds ?? []), sections = new Set(selection.sectionIds ?? []);
  const placements = new Set(selection.placementIds ?? []), sources = new Set(selection.sourceIds ?? []), media = new Set(selection.mediaIds ?? []);
  const issues = [], externalReferences = [], assets = new Set(), chartIds = new Set();
  for (const [chosen, available, label] of [[pages, inventory.pages, "page"], [sections, inventory.sections, "section"],
    [placements, inventory.placements, "panel"], [sources, inventory.sources, "source"], [media, inventory.media, "media item"]]) {
    for (const id of chosen) if (!available.some(item => item.id === id)) issues.push({ blocking: true, code: "unknown-selection", message: `A selected ${label} is no longer available in this package.` });
  }
  for (const item of inventory.pages) if (pages.has(item.id) && !item.eligible) issues.push({ blocking: true, code: "canonical-home", message: "Canonical Home cannot be copied as an authored page. Select its reusable content instead." });
  for (const section of inventory.sections) if (pages.has(section.pageId)) sections.add(section.id);
  for (const placement of inventory.placements) if (sections.has(placement.sectionKey)) placements.add(placement.id);
  const selectedPages = (config.pages ?? []).map(page => ({ ...page, sections: (page.sections ?? []).map(section => ({ ...section,
    panels: (section.panels ?? []).filter(placement => placements.has(placement.id)),
  })) }));
  // The shared graph supplies supported content edges; direct sources and all QMD
  // media nodes supplement it (including external media, which it does not own).
  const graph = buildContentDependencyGraph({ dashboard: { ...config, pages: selectedPages } });
  for (const edge of graph.directUses) {
    if (edge.itemKind === "media") media.add(edge.itemId);
    else sources.add(edge.itemId);
  }
  for (const page of selectedPages) for (const section of page.sections) for (const placement of section.panels) {
    const chart = placement.chart ?? placement;
    chartIds.add(chart.id);
    sources.add(chart.sourceId);
    if (chart.presentation?.map?.geoSource) sources.add(chart.presentation.map.geoSource);
    if (placement.drill) {
      const targetId = placement.drill.kind === "section" ? placement.drill.sectionId : placement.drill.chartId;
      const included = placement.drill.kind === "section" ? sections.has(dashboardPackageSectionKey(page.id, targetId))
        : inventory.placements.some(item => item.chartId === targetId && placements.has(item.id));
      if (!included) externalReferences.push({ kind: "drill", placementId: placement.id, targetId,
        message: `“${chart.title || "This panel"}” links to an unselected ${placement.drill.kind}. Include its target or explicitly remove this drill link.` });
    }
  }
  for (const id of sources) {
    const source = config.dataSources?.[id];
    if (!source) { issues.push({ blocking: true, code: "missing-source", message: "Selected content requires a source missing from this package." }); continue; }
    if (["csv", "geojson"].includes(source.kind)) issues.push({ blocking: true, code: "nonportable-source",
      message: `“${config.contentLibrary?.sourceEntries?.[id]?.displayName || id}” has only a package-relative path. Export a package with embedded data before importing it.` });
    if (source.kind === "staticImage") media.add(source.mediaId);
    if (source.kind === "staticText") {
      const parsed = parsePortableQmdWithMedia(source.qmd);
      if (!parsed.ast) issues.push({ blocking: true, code: "invalid-text", message: "Selected text contains unsupported portable content." });
      else for (const node of parsed.ast.mediaNodes) media.add(node.mediaId);
    }
  }
  for (const id of media) {
    const item = config.contentLibrary?.mediaItems?.[id];
    if (!item) { issues.push({ blocking: true, code: "missing-media", message: "Selected content requires a media item missing from this package." }); continue; }
    if (item.current.kind === "asset") {
      assets.add(item.current.assetId);
      if (!config.assets?.[item.current.assetId] || !candidate.assetPayloads?.[item.current.assetId]) issues.push({ blocking: true, code: "missing-asset", message: `“${item.displayName}” is missing its portable image bytes.` });
    } else if (item.current.kind === "package") issues.push({ blocking: true, code: "nonportable-media", message: `“${item.displayName}” has only a package-relative image path. Its bytes must be included before it can be copied safely.` });
    else issues.push({ blocking: false, code: "network-media", message: `“${item.displayName}” remains a linked network image and requires network access.` });
  }
  const groups = (config.chronoGroups ?? []).filter(group => group.members.some(member => chartIds.has(member.chartId)));
  for (const group of groups) if (group.members.some(member => !chartIds.has(member.chartId))) issues.push({ blocking: false, code: "group-subset",
    message: `Chrono Group “${group.name}” will include only the selected member charts.` });
  for (const scene of config.scenes ?? []) if ((scene.members ?? []).some(member => chartIds.has(member.chartId))) {
    externalReferences.push({ kind: "scene", targetId: scene.id,
      message: `Selected charts belong to Scene “${scene.name || "Untitled Scene"}”. Explicitly import them independently of that Scene, or return to expanded authoring.` });
  }
  return { pageIds: inventory.pages.filter(item => pages.has(item.id)).map(item => item.id),
    sectionIds: inventory.sections.filter(item => sections.has(item.id)).map(item => item.id),
    placementIds: inventory.placements.filter(item => placements.has(item.id)).map(item => item.id),
    chartIds: [...chartIds], sourceIds: [...sources].sort(), mediaIds: [...media].sort(), assetIds: [...assets].sort(),
    groupIds: groups.map(group => group.id), externalReferences, issues, graph };
}
