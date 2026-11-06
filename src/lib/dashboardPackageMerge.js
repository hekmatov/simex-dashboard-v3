import { validateDashboardSessionCandidate } from "../charting/config/dashboardBundleV3.js";
import { IMAGE_ASSET_LIMITS } from "../static-content/image/imageAssetValidation.js";
import { parsePortableQmdWithMedia, serializePortableMediaReference } from "../static-content/qmd/portableQmdMedia.js";
import { buildDashboardPackageImportInventory, resolveDashboardPackageSelection, dashboardPackageSectionKey } from "./dashboardPackageSelection.js";
import { planMixedPackageTargets } from "./dashboardPackageMixedTargets.js";

const runtimeKeys = ["loadedData", "loadedRows", "runtimeRows", "chartDataStates", "dataSourceStates", "runtimeContentHealth"];
export function dashboardPackageMergeRevision(config) {
  const portable = structuredClone(config);
  for (const key of runtimeKeys) delete portable[key];
  return JSON.stringify(portable);
}

export function createDashboardPackageIdentityMap(candidate, allocate = kind => `import-${kind}-${globalThis.crypto.randomUUID()}`) {
  const inventory = buildDashboardPackageImportInventory(candidate);
  const make = (items, kind) => Object.fromEntries(items.map(item => [item.id, allocate(kind)]));
  return { pages: make(inventory.pages, "page"), sections: make(inventory.sections, "section"),
    placements: make(inventory.placements, "placement"), charts: Object.fromEntries(inventory.placements.map(item => [item.chartId, allocate("chart")])),
    sources: make(Object.keys(candidate.config.dataSources ?? {}).map(id => ({ id })), "source"),
    media: make(inventory.media, "media"), groups: make(candidate.config.chronoGroups ?? [], "group"),
    destinationPage: allocate("page"), destinationSection: allocate("section"),
    targetPages: make(inventory.sections, "page"), targetSections: make(inventory.sections, "section") };
}

export function buildDashboardPackageMerge({ current, candidate, selection = {}, destination = {}, resolutions = {}, identityMap } = {}) {
  const selected = resolveDashboardPackageSelection(candidate, selection);
  const map = structuredClone(identityMap ?? createDashboardPackageIdentityMap(candidate));
  const config = JSON.parse(dashboardPackageMergeRevision(current));
  const source = candidate.config;
  const issues = [...selected.issues];
  const addIssue = (code, message, blocking = true) => issues.push({ code, message, blocking });
  const summary = { pages: [], sections: [], placements: [], sources: [], media: [], firstImported: null };
  let requirements = [];
  const assetPayloads = {}, reusedAssetIds = [];
  const scope = destination.scope ?? (selected.pageIds.length ? "pages" : (selection.sectionIds?.length ? "sections" : selected.placementIds.length ? "placements" : "content"));
  const convertedPlacements = new Set(["pages", "sections", "mixed"].includes(scope) && resolutions.standardAttention
    ? source.pages.flatMap(page => page.sections.filter(section => section.role === "attention" && selected.sectionIds.includes(dashboardPackageSectionKey(page.id, section.id))).flatMap(section => section.panels.map(panel => panel.id))) : []);
  const result = () => ({ config, assetPayloads, reusedAssetIds, identityMap: map, summary, issues, selection: selected, requirements,
    expectedRevision: dashboardPackageMergeRevision(current) });
  if (![selected.pageIds.length, selected.sectionIds.length, selected.placementIds.length, selected.sourceIds.length, selected.mediaIds.length].some(Boolean)) addIssue("empty", "Choose at least one object to import.");
  for (const reference of selected.externalReferences) {
    if (!(reference.kind === "drill" ? (resolutions.detachDrills || (convertedPlacements.has(reference.placementId) && resolutions.detachConvertedDrills)) : resolutions.detachScenes)) addIssue(reference.kind, reference.message);
    else addIssue(`detached-${reference.kind}`, reference.kind === "drill" ? "Unselected drill links will be explicitly removed." : "Imported charts will remain independent of source Scenes.", false);
  }
  const currentInventory = buildDashboardPackageImportInventory({ config });
  for (const [kind, ids, existing] of [["pages", selected.pageIds, currentInventory.pages], ["sections", selected.sectionIds, currentInventory.sections.map(section => ({ id: section.sectionId }))],
    ["placements", selected.placementIds, currentInventory.placements], ["charts", selected.chartIds, currentInventory.placements.map(p => ({ id: p.chartId }))],
    ["sources", selected.sourceIds, Object.keys(config.dataSources ?? {}).map(id => ({ id }))], ["media", selected.mediaIds, currentInventory.media],
    ["groups", selected.groupIds, config.chronoGroups ?? []]]) {
    const coalescing = scope === "mixed" && ["pages", "sections"].includes(kind);
    for (const id of ids) if (!map[kind]?.[id] || (!coalescing && existing.some(item => item.id === map[kind][id]))) addIssue("identity", "The reviewed copy identities are no longer available. Start a new import review.");
  }
  if (issues.some(issue => issue.code === "identity")) return result();
  const names = {
    pages: new Set(currentInventory.pages.map(item => item.name)), sections: new Set(currentInventory.sections.map(item => item.name)),
    charts: new Set(currentInventory.placements.map(item => item.name)), sources: new Set(currentInventory.sources.map(item => item.name)),
    media: new Set(currentInventory.media.map(item => item.name)), groups: new Set((config.chronoGroups ?? []).map(item => item.name)),
  };
  const name = (kind, id, original) => {
    const desired = resolutions.names?.[kind]?.[id]?.trim() || original || "Untitled";
    let next = desired, number = 1;
    while (names[kind].has(next)) next = `${desired} (imported${number++ === 1 ? "" : ` ${number - 1}`})`;
    names[kind].add(next);
    if (next !== original) addIssue("name", `“${original}” will be named “${next}”.`, false);
    return next;
  };
  config.dataSources ??= {};
  config.datasetProfiles ??= {};
  config.contentLibrary ??= { sourceEntries: {}, mediaItems: {} };
  const assetIds = new Map();
  for (const oldId of selected.assetIds) {
    const manifest = source.assets?.[oldId], payload = candidate.assetPayloads?.[oldId];
    if (!manifest || !payload) continue;
    const id = `asset-${manifest.sha256}`;
    assetIds.set(oldId, id);
    const existing = config.assets?.[id];
    if (existing && ["sha256", "byteLength", "mediaType", "width", "height"].some(key => existing[key] !== manifest[key])) {
      addIssue("asset-conflict", "An image content identity has conflicting metadata. Re-export a verified package."); continue;
    }
    if (existing && !assetPayloads[id]) reusedAssetIds.push(id);
    else { config.assets ??= {}; config.assets[id] = structuredClone(manifest); assetPayloads[id] = structuredClone(payload); }
  }
  for (const oldId of selected.mediaIds) {
    const item = source.contentLibrary?.mediaItems?.[oldId];
    if (!item) continue;
    const copied = structuredClone(item), id = map.media[oldId];
    copied.mediaId = id;
    copied.displayName = name("media", oldId, item.displayName);
    if (copied.current.kind === "asset") copied.current.assetId = assetIds.get(copied.current.assetId) ?? copied.current.assetId;
    config.contentLibrary.mediaItems[id] = copied;
    summary.media.push({ id, name: copied.displayName });
  }
  for (const oldId of selected.sourceIds) {
    if (!source.dataSources?.[oldId]) continue;
    const copied = structuredClone(source.dataSources[oldId]), id = map.sources[oldId];
    delete copied.browserAssetId; delete copied.browserImageAssetIds;
    if (copied.kind === "staticImage") copied.mediaId = map.media[copied.mediaId];
    if (copied.kind === "staticText") copied.qmd = rewriteImportedQmdMedia(copied.qmd, map.media);
    config.dataSources[id] = copied;
    if (source.datasetProfiles?.[oldId]) config.datasetProfiles[id] = { ...structuredClone(source.datasetProfiles[oldId]), sourceId: id };
    const entry = source.contentLibrary?.sourceEntries?.[oldId];
    const displayName = name("sources", oldId, entry?.displayName || copied.fileName || oldId);
    if (entry) config.contentLibrary.sourceEntries[id] = { ...structuredClone(entry), sourceId: id, displayName };
    summary.sources.push({ id, name: displayName });
  }
  const placementContexts = new Map(buildDashboardPackageImportInventory(candidate).placements.map(item => [item.id, item]));
  const externalDrills = new Set(selected.externalReferences.filter(ref => ref.kind === "drill").map(ref => ref.placementId));
  const copyPlacement = (placement, removeDrills = false) => {
    const original = placement.chart ?? placement, chart = structuredClone(original);
    chart.id = map.charts[original.id]; chart.sourceId = map.sources[original.sourceId];
    chart.title = name("charts", original.id, original.title);
    if (chart.presentation?.map?.geoSource) chart.presentation.map.geoSource = map.sources[chart.presentation.map.geoSource];
    if (chart.interaction?.timeSync) chart.interaction.timeSync.groupId = map.groups[chart.interaction.timeSync.groupId];
    const copied = { id: map.placements[placement.id], chart };
    if (placement.drill && !removeDrills && !externalDrills.has(placement.id)) copied.drill = placement.drill.kind === "section"
      ? { kind: "section", sectionId: map.sections[dashboardPackageSectionKey(placementContexts.get(placement.id).pageId, placement.drill.sectionId)] } : { kind: "chart", chartId: map.charts[placement.drill.chartId] };
    summary.placements.push({ id: copied.id, chartId: chart.id, name: chart.title });
    return copied;
  };
  const selectedPlacements = new Set(selected.placementIds);
  const copySection = (section, pageId, scopedTitle) => {
    const sectionKey = dashboardPackageSectionKey(pageId, section.id);
    const converting = section.role === "attention" && resolutions.standardAttention;
    if (converting && section.panels.some(panel => panel.drill)) addIssue("converted-drill",
      `Converting “${section.title}” to Standard requires removing its drill links. Accept that removal or choose another destination.`, !resolutions.detachConvertedDrills);
    const copied = { ...structuredClone(section), id: map.sections[sectionKey], title: scopedTitle ?? name("sections", sectionKey, section.title),
      panels: section.panels.filter(p => selectedPlacements.has(p.id)).map(panel => copyPlacement(panel, converting && resolutions.detachConvertedDrills)) };
    if (copied.role === "attention" && resolutions.standardAttention) {
      copied.role = "standard";
      addIssue("attention-converted", `“${copied.title}” will become a Standard section.`, false);
    }
    summary.sections.push({ id: copied.id, name: copied.title });
    return copied;
  };
  const insert = (items, additions) => {
    const position = destination.position ?? "append";
    if (position === "append") { items.push(...additions); return; }
    if (position === "start") { items.unshift(...additions); return; }
    const index = items.findIndex(item => item.id === destination.anchorId);
    if (index < 0) { addIssue("destination", "The reviewed insertion anchor is no longer available. Choose a current destination."); return; }
    items.splice(index + (position === "after" ? 1 : 0), 0, ...additions);
  };
  if (scope === "mixed") {
    const plan = planMixedPackageTargets({ current: config, source, selected, destination, resolutions, map });
    requirements = plan.requirements;
    const newPageIds = [...plan.pages.filter(row => !row.existing).map(row => row.target.id), ...plan.destinationPages.map(page => page.id)];
    const newSectionIds = [...plan.sections.filter(row => !row.existing).map(row => row.sectionId), ...plan.placements.filter(row => row.createSection).map(row => row.section.id)];
    if (newPageIds.some(id => currentInventory.pages.some(page => page.id === id))
      || newSectionIds.some(id => currentInventory.sections.some(section => section.sectionId === id))) {
      addIssue("identity", "A new destination identity is no longer available. Start a new import review.");
      return result();
    }
    for (const request of requirements.filter(request => !request.resolved)) addIssue("destination-required",
      `Choose a destination for “${request.breadcrumb ? `${request.breadcrumb} / ` : ""}${request.name}”.`);
    for (const row of plan.pages) {
      if (!row.existing) {
        const title = name("pages", row.incoming.id, row.target.title);
        config.pages.push({ ...structuredClone(row.target), title, label: title });
      }
      summary.pages.push({ id: row.target.id, name: row.target.title, merged: row.existing });
      if (!row.existing) summary.firstImported ??= { kind: "page", pageId: row.target.id };
    }
    for (const page of plan.destinationPages) {
      config.pages.push(structuredClone(page));
      summary.pages.push({ id: page.id, name: page.title });
    }
    for (const row of plan.sections) {
      const page = config.pages.find(page => page.id === row.pageId);
      let section;
      if (row.existing) {
        section = page.sections.find(section => section.id === row.sectionId);
        const incomingAttention = row.incoming.role === "attention";
        if (incomingAttention && section.role !== "attention" && !resolutions.standardAttention) addIssue("attention",
          `“${row.title}” is an Attention section. Convert it to Standard before adding its panels to this section.`);
        if (incomingAttention && resolutions.standardAttention && row.incoming.panels.some(panel => panel.drill)) addIssue("converted-drill",
          "Converting an Attention section requires explicit removal of its drill links.", !resolutions.detachConvertedDrills);
        const additions = row.incoming.panels.filter(panel => selectedPlacements.has(panel.id))
          .map(panel => copyPlacement(panel, incomingAttention && resolutions.standardAttention && resolutions.detachConvertedDrills));
        section.panels.push(...additions);
        if (additions[0]) summary.firstImported ??= { kind: "chart", pageId: page.id, sectionId: section.id,
          placementId: additions[0].id, chartId: additions[0].chart.id };
        summary.sections.push({ id: section.id, name: section.title, merged: true });
      } else {
        section = copySection(row.incoming, row.incomingPageId, row.title);
        if (section.role === "attention" && page.sections.some(existing => existing.role === "attention")) addIssue("attention",
          "The destination can have one Attention strip. Convert incoming Attention sections to Standard or choose another page.");
        page.sections.push(section);
      }
      summary.firstImported ??= section.panels[0] && { kind: "section", pageId: page.id, sectionId: section.id };
    }
    for (const row of plan.placements) {
      const page = config.pages.find(page => page.id === row.pageId);
      if (row.createSection) {
        page.sections.push(structuredClone(row.section));
        summary.sections.push({ id: row.section.id, name: row.section.title });
      }
      const section = page.sections.find(section => section.id === row.section.id);
      const incoming = row.panels.map(panel => copyPlacement(panel));
      section.panels.push(...incoming);
      summary.firstImported ??= { kind: "chart", pageId: page.id, sectionId: section.id,
        placementId: incoming[0].id, chartId: incoming[0].chart.id };
    }
  } else if (scope === "pages") {
    insert(config.pages, source.pages.filter(page => selected.pageIds.includes(page.id)).map(page => {
      const pageName = name("pages", page.id, page.label || page.title);
      const copied = { ...structuredClone(page), id: map.pages[page.id], title: pageName, label: pageName, sections: page.sections.map(section => copySection(section, page.id)) };
      summary.pages.push({ id: copied.id, name: pageName });
      summary.firstImported ??= { kind: "page", pageId: copied.id };
      return copied;
    }));
  } else if (["sections", "placements"].includes(scope)) {
    let page = config.pages.find(page => page.id === destination.pageId);
    if (destination.newPageTitle?.trim()) {
      page = { id: map.destinationPage, title: destination.newPageTitle.trim(), label: destination.newPageTitle.trim(), sections: [] };
      config.pages.push(page); summary.pages.push({ id: page.id, name: page.title });
    }
    if (!page || page.landing || page.pageType === "landing") addIssue("destination", "Choose an existing authored destination page or create a new page.");
    else if (scope === "sections") {
      const incoming = source.pages.flatMap(page => page.sections.filter(section => selected.sectionIds.includes(dashboardPackageSectionKey(page.id, section.id))).map(section => copySection(section, page.id)));
      if ([...page.sections, ...incoming].filter(section => section.role === "attention").length > 1) addIssue("attention", "The destination can have one Attention strip. Convert incoming Attention sections to Standard or choose another page.");
      insert(page.sections, incoming);
      summary.firstImported ??= incoming[0] && { kind: "section", pageId: page.id, sectionId: incoming[0].id };
    } else {
      let section = page.sections.find(section => section.id === destination.sectionId);
      if (destination.newSectionTitle?.trim() || destination.newPageTitle?.trim()) {
        section = { id: map.destinationSection, title: destination.newSectionTitle?.trim() || "Imported charts", panels: [] };
        page.sections.push(section); summary.sections.push({ id: section.id, name: section.title });
      }
      if (!section) addIssue("destination", "The destination section is no longer available. Choose a current section.");
      else {
        const incoming = source.pages.flatMap(p => p.sections.flatMap(s => s.panels)).filter(p => selectedPlacements.has(p.id)).map(panel => copyPlacement(panel));
        insert(section.panels, incoming);
        summary.firstImported ??= incoming[0] && { kind: "chart", pageId: page.id, sectionId: section.id, placementId: incoming[0].id, chartId: incoming[0].chart.id };
      }
    }
  } else if (scope !== "content") addIssue("destination", "Choose a supported import destination.");
  for (const group of source.chronoGroups ?? []) if (selected.groupIds.includes(group.id)) {
    const copied = { ...structuredClone(group), id: map.groups[group.id], name: name("groups", group.id, group.name),
      members: group.members.filter(member => selected.chartIds.includes(member.chartId)).map(member => ({ ...structuredClone(member), chartId: map.charts[member.chartId] })) };
    if (copied.temporalReview) {
      copied.temporalReview.sourceIds = copied.temporalReview.sourceIds.filter(id => selected.sourceIds.includes(id)).map(id => map.sources[id]).sort();
      if (!copied.temporalReview.sourceIds.length) delete copied.temporalReview;
    }
    config.chronoGroups ??= []; config.chronoGroups.push(copied);
  }
  const bytes = Object.values(config.assets ?? {}).reduce((sum, asset) => sum + (asset.byteLength ?? 0), 0);
  if (scope === "content" && (selected.pageIds.length || selected.sectionIds.length || selected.placementIds.length)) addIssue("scope", "Choose reusable content in content mode, or switch to the matching object import mode.");
  if (scope !== "content" && scope !== "mixed" && (!summary[scope]?.length || summary.placements.length !== selected.placementIds.length)) addIssue("scope", "The selected objects do not all belong to this import mode. Review the selection and destination.");
  if (scope === "mixed" && !requirements.some(request => !request.resolved) && summary.placements.length !== selected.placementIds.length) addIssue("scope", "Some selected panels have no reviewed destination.");
  if (JSON.stringify(source.globalStyles) !== JSON.stringify(current.globalStyles)) addIssue("theme", "Imported objects inherit the current dashboard theme, while keeping their explicit chart overrides.", false);
  if (bytes > IMAGE_ASSET_LIMITS.dashboardBudgetBytes) addIssue("budget", "The combined dashboard exceeds the 200 MiB authored-image budget. Choose fewer images.");
  if (!issues.some(issue => issue.blocking)) {
    try { validateDashboardSessionCandidate(config); }
    catch (error) { addIssue("validation", error.message); }
  }
  return result();
}

export function rewriteImportedQmdMedia(qmd, mediaMap) {
  const { ast } = parsePortableQmdWithMedia(qmd);
  if (!ast) throw new Error("Selected text cannot be parsed as Portable QMD.");
  let result = qmd;
  for (const node of [...ast.mediaNodes].sort((a, b) => b.sourceStart - a.sourceStart)) {
    if (!Number.isInteger(node.sourceStart) || !Number.isInteger(node.sourceEnd) || !mediaMap[node.mediaId]) throw new Error("A selected QMD image cannot be safely remapped.");
    result = result.slice(0, node.sourceStart) + serializePortableMediaReference({ ...node.attributes, alt: node.alt, mediaId: mediaMap[node.mediaId] }) + result.slice(node.sourceEnd);
  }
  return result;
}
