import { reorderPage, reorderSection } from "./buildStructureModel.js";

export function createBuildLayoutDraft(dashboard) {
  const baseline = structuredClone(dashboard);
  return {
    draftId: `layout-${String(dashboard?.id ?? "dashboard")}`,
    kind: "layout",
    targetId: null,
    status: "clean",
    baseline,
    value: structuredClone(baseline),
    error: null,
  };
}

export function reorderBuildLayoutPanel(draft, sourceId, targetId) {
  const next = cloneDraft(draft);
  if (!movePanel(next.value, sourceId, targetId)) return draft;
  return markDirty(next, targetId);
}

export function reorderBuildLayoutPage(draft, pageId, targetIndex) {
  const next = cloneDraft(draft);
  if (!reorderPage(next.value, pageId, targetIndex)) return draft;
  return markDirty(next, pageId);
}

export function reorderBuildLayoutSection(draft, pageId, sectionId, targetIndex) {
  const next = cloneDraft(draft);
  if (!reorderSection(next.value, pageId, sectionId, targetIndex)) return draft;
  return markDirty(next, sectionId);
}

export function renameBuildLayoutPage(draft, pageId, label) {
  const next = cloneDraft(draft);
  const page = findPage(next.value, pageId);
  const name = String(label ?? "").trim();
  if (!page) return failCommand(draft, "PAGE_NOT_FOUND", "The Page no longer exists.");
  if (!name) return failCommand(draft, "PAGE_NAME_REQUIRED", "Enter a Page name.");
  page.label = name;
  return markDirty(next, pageId);
}

export function addBuildLayoutPage(draft, page) {
  const next = cloneDraft(draft);
  if (!page?.id || next.value.pages.some(({ id }) => id === page.id)) {
    return failCommand(draft, "PAGE_ID_INVALID", "The new Page needs a unique stable ID.");
  }
  next.value.pages.push(structuredClone(page));
  return markDirty(next, page.id);
}

export function addBuildLayoutSection(draft, pageId, section) {
  const next = cloneDraft(draft);
  const page = findPage(next.value, pageId);
  if (!page || !section?.id || next.value.pages.flatMap(({ sections = [] }) => sections).some(({ id }) => id === section.id)) {
    return failCommand(draft, "SECTION_ID_INVALID", "The new Section needs a unique stable ID.");
  }
  page.sections.push(structuredClone(section));
  return markDirty(next, section.id);
}

export function renameBuildLayoutSection(draft, pageId, sectionId, title) {
  const next = cloneDraft(draft);
  const section = findSection(next.value, pageId, sectionId);
  const name = String(title ?? "").trim();
  if (!section) return failCommand(draft, "SECTION_NOT_FOUND", "The Section no longer exists.");
  if (!name) return failCommand(draft, "SECTION_NAME_REQUIRED", "Enter a Section name.");
  section.title = name;
  return markDirty(next, sectionId);
}

export function moveBuildLayoutSection(draft, pageId, sectionId, targetPageId, placement = {}) {
  const next = cloneDraft(draft);
  const source = findPage(next.value, pageId);
  const target = findPage(next.value, targetPageId);
  const index = source?.sections?.findIndex(({ id }) => id === sectionId) ?? -1;
  if (!source || !target || source === target || index < 0 || target.landing) {
    return failCommand(draft, "MOVE_TARGET_INVALID", "Choose an eligible destination Page.");
  }
  if (source.sections.length === 1) {
    return failCommand(draft, "FINAL_SECTION_PROTECTED", "The source Page must retain a Section.");
  }
  const [section] = source.sections.splice(index, 1);
  const targetIndex = placement.first === true
    ? 0
    : placement.afterSectionId
      ? target.sections.findIndex(({ id }) => id === placement.afterSectionId) + 1
      : target.sections.length;
  target.sections.splice(Math.max(0, Math.min(targetIndex, target.sections.length)), 0, section);
  removePageScopedSceneChartReferences(next.value, pageId, chartIdsForSections([section]));
  return markDirty(next, sectionId);
}

export function mergeBuildLayoutSection(draft, pageId, sectionId, targetSectionId) {
  const next = cloneDraft(draft);
  const page = findPage(next.value, pageId);
  const sourceIndex = page?.sections?.findIndex(({ id }) => id === sectionId) ?? -1;
  const target = findSection(next.value, pageId, targetSectionId);
  if (!page || sourceIndex < 0 || !target || sectionId === targetSectionId) {
    return failCommand(draft, "SECTION_MERGE_TARGET_INVALID", "Choose another Section on this Page.");
  }
  const [source] = page.sections.splice(sourceIndex, 1);
  target.panels = [...(source.panels ?? []), ...(target.panels ?? [])];
  return markDirty(next, targetSectionId);
}

export function removeBuildLayoutSection(draft, pageId, sectionId, { disposition } = {}) {
  const next = cloneDraft(draft);
  const page = findPage(next.value, pageId);
  const index = page?.sections?.findIndex(({ id }) => id === sectionId) ?? -1;
  if (!page || index < 0) return failCommand(draft, "SECTION_NOT_FOUND", "The Section no longer exists.");
  if (page.sections.length === 1) return failCommand(draft, "FINAL_SECTION_PROTECTED", "A Page must retain a Section.");
  const source = page.sections[index];
  if ((source.panels?.length ?? 0) > 0 && !["delete-charts", "merge-above", "merge-below"].includes(disposition)) {
    return failCommand(draft, "SECTION_DISPOSITION_REQUIRED", "Choose what happens to the charts in this Section.");
  }
  if (disposition === "merge-above" && index === 0) return failCommand(draft, "MERGE_DESTINATION_UNAVAILABLE", "There is no Section above.");
  if (disposition === "merge-below" && index === page.sections.length - 1) return failCommand(draft, "MERGE_DESTINATION_UNAVAILABLE", "There is no Section below.");
  const [removed] = page.sections.splice(index, 1);
  if (disposition === "merge-above") page.sections[index - 1].panels.push(...(removed.panels ?? []));
  if (disposition === "merge-below") page.sections[index].panels.unshift(...(removed.panels ?? []));
  if (disposition === "delete-charts") removeChartReferences(next.value, chartIdsForSections([removed]));
  return markDirty(next, sectionId);
}

export function mergeBuildLayoutPage(draft, pageId, targetPageId) {
  const next = cloneDraft(draft);
  const sourceIndex = next.value.pages.findIndex(({ id }) => id === pageId);
  const source = next.value.pages[sourceIndex];
  const target = findPage(next.value, targetPageId);
  if (!source || !target || source === target || source.landing || target.landing) {
    return failCommand(draft, "PAGE_MERGE_TARGET_INVALID", "Choose another analytical Page.");
  }
  target.sections.push(...source.sections);
  next.value.pages.splice(sourceIndex, 1);
  reassignPageScopedScenes(next.value, pageId, targetPageId);
  repairLandingRoutes(next.value, pageId, targetPageId);
  return markDirty(next, targetPageId);
}

export function removeBuildLayoutPage(draft, pageId, { disposition, targetPageId } = {}) {
  if ((draft?.value?.pages?.length ?? 0) <= 1) return failCommand(draft, "FINAL_PAGE_PROTECTED", "The final Page cannot be removed.");
  const next = cloneDraft(draft);
  const index = next.value.pages.findIndex(({ id }) => id === pageId);
  const source = next.value.pages[index];
  if (!source || source.landing) return failCommand(draft, "PAGE_PROTECTED", "This Page cannot be removed.");
  if (disposition === "move-sections") {
    const target = findPage(next.value, targetPageId);
    if (!target || target === source || target.landing) return failCommand(draft, "PAGE_MOVE_TARGET_INVALID", "Choose an eligible destination Page.");
    target.sections.push(...source.sections);
    reassignPageScopedScenes(next.value, pageId, targetPageId);
  } else if (disposition === "delete-charts") {
    removeChartReferences(next.value, chartIdsForSections(source.sections));
  } else {
    return failCommand(draft, "PAGE_DISPOSITION_REQUIRED", "Choose what happens to the Page content.");
  }
  next.value.pages.splice(index, 1);
  pruneScenesWithRemovedParents(next.value, { pageIds: new Set([pageId]) });
  repairLandingRoutes(next.value);
  return markDirty(next, pageId);
}

export function previewBuildStructureConsequences(dashboard, operation) {
  const page = findPage(dashboard, operation.pageId);
  const sections = operation.sectionId
    ? [findSection(dashboard, operation.pageId, operation.sectionId)].filter(Boolean)
    : page?.sections ?? [];
  const ids = chartIdsForSections(sections);
  const charts = sections.flatMap(({ panels = [] }) => panels.map((panel) => (panel.chart ?? panel).title || (panel.chart ?? panel).id));
  const chronoGroups = (dashboard?.chronoGroups ?? [])
    .filter((group) => (group.members ?? []).some(({ chartId }) => ids.includes(chartId)))
    .map(({ name, id }) => name || id);
  const scenes = (dashboard?.scenes ?? [])
    .filter((scene) => scene.pageId === operation.pageId && sceneChartIds(scene).some((id) => ids.includes(id)))
    .map(({ name, id }) => name || id);
  const deletesCharts = (operation.kind === "remove-page" || operation.kind === "remove-section")
    && operation.disposition === "delete-charts";
  const movesPageScope = operation.kind === "merge-page"
    || (operation.kind === "remove-page" && operation.disposition === "move-sections");
  const invalidatesPageScopedSceneCharts = operation.kind === "move-section" || deletesCharts;
  const groupText = chronoGroups.length
    ? deletesCharts
      ? `${chronoGroups.join(", ")} loses membership for ${charts.join(" and ")}.`
      : `${chronoGroups.join(", ")} remains attached.`
    : "No Chrono Group membership changes.";
  const sceneText = scenes.length
    ? movesPageScope
      ? `${scenes.join(", ")} moves to the destination Page without losing chart membership.`
      : invalidatesPageScopedSceneCharts
        ? `${scenes.join(", ")} loses ${charts.join(" and ")}.`
        : "No Scene references change."
    : "No Scene references change.";
  return { charts, chronoGroups, scenes, summary: `${groupText} ${sceneText}` };
}

export function beginBuildLayoutSave(draft) {
  if (!draft || draft.status === "clean" || draft.status === "saving") return draft;
  return { ...draft, status: "saving", error: null };
}

export function failBuildLayoutSave(draft, error) {
  return { ...draft, status: "error", error };
}

export function discardBuildLayoutDraft(draft) {
  return {
    ...draft,
    targetId: null,
    status: "clean",
    value: structuredClone(draft.baseline),
    error: null,
  };
}

function repairLandingRoutes(dashboard, mergedPageId, mergeTargetPageId) {
  const remainingPageIds = new Set(dashboard.pages.map(({ id }) => id));
  for (const page of dashboard.pages) {
    if (!page.landing) continue;
    const previousRoutes = (page.landing.domainRoutes ?? [])
      .map((route) => route.pageId === mergedPageId ? { ...route, pageId: mergeTargetPageId } : route)
      .filter((route, index, routes) => routes.findIndex(({ pageId }) => pageId === route.pageId) === index);
    const retainedRoutes = previousRoutes.filter(
      ({ pageId }) => remainingPageIds.has(pageId),
    );
    if (retainedRoutes.length === 0) {
      const fallbackTarget = dashboard.pages.find(({ id }) => id !== page.id)?.id ?? page.id;
      retainedRoutes.push({ ...(previousRoutes[0] ?? {}), pageId: fallbackTarget });
    }
    page.landing.domainRoutes = retainedRoutes;
    const primaryAction = page.landing.hero?.primaryAction;
    if (primaryAction && primaryAction.pageId === mergedPageId) primaryAction.pageId = mergeTargetPageId;
    if (primaryAction && !remainingPageIds.has(primaryAction.pageId)) {
      primaryAction.pageId = retainedRoutes[0].pageId;
    }
  }
}

function cloneDraft(draft) {
  return { ...draft, value: structuredClone(draft.value), error: null };
}

function markDirty(draft, targetId) {
  return { ...draft, targetId, status: "dirty" };
}

function failCommand(draft, code, message) {
  return { ...draft, status: "error", error: { code, message, retryable: false } };
}

function findPage(dashboard, pageId) {
  return (dashboard?.pages ?? []).find(({ id }) => id === pageId);
}

function findSection(dashboard, pageId, sectionId) {
  return findPage(dashboard, pageId)?.sections?.find(({ id }) => id === sectionId);
}

function chartIdsForSections(sections = []) {
  return sections.flatMap(({ panels = [] }) => panels.map((panel) => (panel.chart ?? panel).id).filter(Boolean));
}

function sceneChartIds(scene) {
  return scene.chartIds ?? scene.members?.map(({ chartId }) => chartId) ?? [];
}

function removePageScopedSceneChartReferences(dashboard, pageId, chartIds) {
  for (const scene of dashboard?.scenes ?? []) {
    if (scene.pageId !== pageId) continue;
    removeSceneChartReferences(scene, chartIds);
  }
}

function removeChartReferences(dashboard, chartIds) {
  const removed = new Set(chartIds);
  const removedChronoGroupIds = new Set();
  dashboard.chronoGroups = (dashboard?.chronoGroups ?? []).flatMap((group) => {
    group.members = (group.members ?? []).filter(({ chartId }) => !removed.has(chartId));
    if (Array.isArray(group.chartIds)) group.chartIds = group.chartIds.filter((id) => !removed.has(id));
    if (group.members.length > 0) return [group];
    removedChronoGroupIds.add(group.id);
    return [];
  });
  for (const scene of dashboard?.scenes ?? []) removeSceneChartReferences(scene, chartIds);
  pruneScenesWithRemovedParents(dashboard, { chronoGroupIds: removedChronoGroupIds });
}

function pruneScenesWithRemovedParents(dashboard, { pageIds = new Set(), chronoGroupIds = new Set() } = {}) {
  dashboard.scenes = (dashboard?.scenes ?? []).filter((scene) => (
    !pageIds.has(scene?.pageId)
    && !chronoGroupIds.has(scene?.chronoGroupId)
  ));
}

function removeSceneChartReferences(scene, chartIds) {
  const removed = new Set(chartIds);
  if (Array.isArray(scene.chartIds)) scene.chartIds = scene.chartIds.filter((id) => !removed.has(id));
  if (Array.isArray(scene.members)) scene.members = scene.members.filter(({ chartId }) => !removed.has(chartId));
  if (Array.isArray(scene.present?.chartIds)) scene.present.chartIds = scene.present.chartIds.filter((id) => !removed.has(id));
  if (scene.frameRule?.chartId && removed.has(scene.frameRule.chartId)) scene.frameRule = { type: "calendar" };
}

function reassignPageScopedScenes(dashboard, sourcePageId, targetPageId) {
  for (const scene of dashboard?.scenes ?? []) if (scene.pageId === sourcePageId) scene.pageId = targetPageId;
}

function movePanel(dashboard, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return false;
  let sourceLocation = null;
  let targetLocation = null;
  for (const page of dashboard?.pages ?? []) {
    for (const section of page.sections ?? []) {
      const sourceIndex = (section.panels ?? []).findIndex(({ id }) => id === sourceId);
      const targetIndex = (section.panels ?? []).findIndex(({ id }) => id === targetId);
      if (sourceIndex >= 0) sourceLocation = { section, index: sourceIndex };
      if (targetIndex >= 0) targetLocation = { section, index: targetIndex };
    }
  }
  if (!sourceLocation || !targetLocation) return false;
  const [source] = sourceLocation.section.panels.splice(sourceLocation.index, 1);
  const targetIndex = sourceLocation.section === targetLocation.section
    && sourceLocation.index < targetLocation.index
    ? targetLocation.index - 1
    : targetLocation.index;
  targetLocation.section.panels.splice(targetIndex, 0, source);
  return true;
}
