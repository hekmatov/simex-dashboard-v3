import {
  movePageByIndex,
  movePlacementBefore,
  moveSectionByIndex,
  updatePage,
  updatePlacement,
  updateSection,
} from "./immutableDashboardLayout.js";

export function createBuildLayoutDraft(dashboard) {
  const baseline = cloneLayoutStructure(dashboard);
  return {
    draftId: `layout:${String(dashboard?.id ?? "dashboard")}`,
    kind: "layout",
    scopeId: String(dashboard?.id ?? "dashboard"),
    targetId: null,
    status: "clean",
    activity: "active",
    surface: "dashboard-map",
    baseline,
    value: cloneLayoutStructure(baseline),
    error: null,
    revision: 0,
  };
}

export function reorderBuildLayoutPanel(draft, sourceId, targetId) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const value = movePlacementBefore(draft.value, sourceId, targetId);
  return value === draft.value ? draft : markDirty(draft, targetId, value);
}

export function reorderBuildLayoutPage(draft, pageId, targetIndex) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const value = movePageByIndex(draft.value, pageId, targetIndex);
  return value === draft.value ? draft : markDirty(draft, pageId, value);
}

export function reorderBuildLayoutSection(draft, pageId, sectionId, targetIndex) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const value = moveSectionByIndex(draft.value, pageId, sectionId, targetIndex);
  return value === draft.value ? draft : markDirty(draft, sectionId, value);
}

export function renameBuildLayoutPage(draft, pageId, label) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const name = String(label ?? "").trim();
  const page = findPage(draft.value, pageId);
  if (!page) return failCommand(draft, "PAGE_NOT_FOUND", "The Page no longer exists.");
  if (!name) return failCommand(draft, "PAGE_NAME_REQUIRED", "Enter a Page name.");
  const value = updatePage(draft.value, pageId, (current) => ({ ...current, label: name }));
  return markDirty(draft, pageId, value);
}

export function addBuildLayoutPage(draft, page) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  if (!page?.id || draft.value.pages.some(({ id }) => id === page.id)) {
    return failCommand(draft, "PAGE_ID_INVALID", "The new Page needs a unique stable ID.");
  }
  const value = { ...draft.value, pages: [...draft.value.pages, structuredClone(page)] };
  return markDirty(draft, page.id, value);
}

export function addBuildLayoutSection(draft, pageId, section) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const page = findPage(draft.value, pageId);
  if (!page || !section?.id || draft.value.pages.flatMap(({ sections = [] }) => sections).some(({ id }) => id === section.id)) {
    return failCommand(draft, "SECTION_ID_INVALID", "The new Section needs a unique stable ID.");
  }
  const value = updatePage(draft.value, pageId, (current) => ({
    ...current,
    sections: [...(current.sections ?? []), structuredClone(section)],
  }));
  return markDirty(draft, section.id, value);
}

export function renameBuildLayoutSection(draft, pageId, sectionId, title) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const name = String(title ?? "").trim();
  const section = findSection(draft.value, pageId, sectionId);
  if (!section) return failCommand(draft, "SECTION_NOT_FOUND", "The Section no longer exists.");
  if (!name) return failCommand(draft, "SECTION_NAME_REQUIRED", "Enter a Section name.");
  const value = updateSection(draft.value, pageId, sectionId, (current) => ({ ...current, title: name }));
  return markDirty(draft, sectionId, value);
}

export function renameBuildLayoutPanel(draft, placementId, title) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const placement = draft.value.pages
    .flatMap(({ sections = [] }) => sections)
    .flatMap(({ panels = [] }) => panels)
    .find(({ id }) => id === placementId);
  const name = String(title ?? "").trim();
  if (!placement) return failCommand(draft, "PANEL_NOT_FOUND", "The panel no longer exists.");
  if (!name) return failCommand(draft, "PANEL_NAME_REQUIRED", "Enter a panel name.");
  const value = updatePlacement(draft.value, placementId, (current) => (
    current.chart
      ? { ...current, chart: { ...current.chart, title: name } }
      : { ...current, title: name }
  ));
  return markDirty(draft, placementId, value);
}

export function moveBuildLayoutSection(draft, pageId, sectionId, targetPageId, placement = {}) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const source = findPage(draft.value, pageId);
  const target = findPage(draft.value, targetPageId);
  const index = source?.sections?.findIndex(({ id }) => id === sectionId) ?? -1;
  if (!source || !target || source === target || index < 0 || target.landing) {
    return failCommand(draft, "MOVE_TARGET_INVALID", "Choose an eligible destination Page.");
  }
  if (source.sections.length === 1) {
    return failCommand(draft, "FINAL_SECTION_PROTECTED", "The source Page must retain a Section.");
  }
  const sourceSections = source.sections.slice();
  const [section] = sourceSections.splice(index, 1);
  const targetSections = target.sections.slice();
  const targetIndex = placement.first === true
    ? 0
    : placement.afterSectionId
      ? targetSections.findIndex(({ id }) => id === placement.afterSectionId) + 1
      : targetSections.length;
  targetSections.splice(Math.max(0, Math.min(targetIndex, targetSections.length)), 0, section);
  const pages = draft.value.pages.map((page) => {
    if (page.id === source.id) return { ...page, sections: sourceSections };
    if (page.id === target.id) return { ...page, sections: targetSections };
    return page;
  });
  let value = { ...draft.value, pages };
  value = removePageScopedSceneChartReferences(value, pageId, chartIdsForSections([section]));
  return markDirty(draft, sectionId, value);
}

export function mergeBuildLayoutSection(draft, pageId, sectionId, targetSectionId) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const page = findPage(draft.value, pageId);
  const sourceIndex = page?.sections?.findIndex(({ id }) => id === sectionId) ?? -1;
  const target = findSection(draft.value, pageId, targetSectionId);
  if (!page || sourceIndex < 0 || !target || sectionId === targetSectionId) {
    return failCommand(draft, "SECTION_MERGE_TARGET_INVALID", "Choose another Section on this Page.");
  }
  const sections = page.sections.slice();
  const [source] = sections.splice(sourceIndex, 1);
  const targetIndex = sections.findIndex(({ id }) => id === targetSectionId);
  sections[targetIndex] = {
    ...sections[targetIndex],
    panels: [...(source.panels ?? []), ...(target.panels ?? [])],
  };
  const value = updatePage(draft.value, pageId, (current) => ({ ...current, sections }));
  return markDirty(draft, targetSectionId, value);
}

export function removeBuildLayoutSection(draft, pageId, sectionId, { disposition } = {}) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const page = findPage(draft.value, pageId);
  const index = page?.sections?.findIndex(({ id }) => id === sectionId) ?? -1;
  if (!page || index < 0) return failCommand(draft, "SECTION_NOT_FOUND", "The Section no longer exists.");
  if (page.sections.length === 1) return failCommand(draft, "FINAL_SECTION_PROTECTED", "A Page must retain a Section.");
  const source = page.sections[index];
  if ((source.panels?.length ?? 0) > 0 && !["delete-charts", "merge-above", "merge-below"].includes(disposition)) {
    return failCommand(draft, "SECTION_DISPOSITION_REQUIRED", "Choose what happens to the charts in this Section.");
  }
  if (disposition === "merge-above" && index === 0) return failCommand(draft, "MERGE_DESTINATION_UNAVAILABLE", "There is no Section above.");
  if (disposition === "merge-below" && index === page.sections.length - 1) return failCommand(draft, "MERGE_DESTINATION_UNAVAILABLE", "There is no Section below.");
  const sections = page.sections.slice();
  const [removed] = sections.splice(index, 1);
  if (disposition === "merge-above") {
    sections[index - 1] = {
      ...sections[index - 1],
      panels: [...(sections[index - 1].panels ?? []), ...(removed.panels ?? [])],
    };
  }
  if (disposition === "merge-below") {
    sections[index] = {
      ...sections[index],
      panels: [...(removed.panels ?? []), ...(sections[index].panels ?? [])],
    };
  }
  let value = updatePage(draft.value, pageId, (current) => ({ ...current, sections }));
  if (disposition === "delete-charts") value = removeChartReferences(value, chartIdsForSections([removed]));
  return markDirty(draft, sectionId, value);
}

export function mergeBuildLayoutPage(draft, pageId, targetPageId) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const sourceIndex = draft.value.pages.findIndex(({ id }) => id === pageId);
  const source = draft.value.pages[sourceIndex];
  const target = findPage(draft.value, targetPageId);
  if (!source || !target || source === target || source.landing || target.landing) {
    return failCommand(draft, "PAGE_MERGE_TARGET_INVALID", "Choose another analytical Page.");
  }
  let value = {
    ...draft.value,
    pages: draft.value.pages
      .filter(({ id }) => id !== pageId)
      .map((page) => page.id === targetPageId
        ? { ...page, sections: [...(page.sections ?? []), ...(source.sections ?? [])] }
        : page),
  };
  value = reassignPageScopedScenes(value, pageId, targetPageId);
  value = repairLandingRoutes(value, pageId, targetPageId);
  return markDirty(draft, targetPageId, value);
}

export function removeBuildLayoutPage(draft, pageId, { disposition, targetPageId } = {}) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  if ((draft?.value?.pages?.length ?? 0) <= 1) return failCommand(draft, "FINAL_PAGE_PROTECTED", "The final Page cannot be removed.");
  const index = draft.value.pages.findIndex(({ id }) => id === pageId);
  const source = draft.value.pages[index];
  if (!source || source.landing) return failCommand(draft, "PAGE_PROTECTED", "This Page cannot be removed.");
  let value = draft.value;
  if (disposition === "move-sections") {
    const target = findPage(value, targetPageId);
    if (!target || target === source || target.landing) return failCommand(draft, "PAGE_MOVE_TARGET_INVALID", "Choose an eligible destination Page.");
    value = updatePage(value, targetPageId, (page) => ({
      ...page,
      sections: [...(page.sections ?? []), ...(source.sections ?? [])],
    }));
    value = reassignPageScopedScenes(value, pageId, targetPageId);
  } else if (disposition === "delete-charts") {
    value = removeChartReferences(value, chartIdsForSections(source.sections));
  } else {
    return failCommand(draft, "PAGE_DISPOSITION_REQUIRED", "Choose what happens to the Page content.");
  }
  value = { ...value, pages: value.pages.filter(({ id }) => id !== pageId) };
  value = pruneScenesWithRemovedParents(value, { pageIds: new Set([pageId]) });
  value = repairLandingRoutes(value);
  return markDirty(draft, pageId, value);
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
  return { ...draft, status: "saving", saveRevision: draft.revision ?? 0, error: null };
}

export function completeBuildLayoutSave(current, saving) {
  return isExactBuildLayoutSave(current, saving) ? null : current;
}

export function failBuildLayoutSave(current, savingOrError, nextError) {
  const saving = nextError === undefined ? current : savingOrError;
  const error = nextError === undefined ? savingOrError : nextError;
  if (!isExactBuildLayoutSave(current, saving)) return current;
  return { ...current, status: "error", saveRevision: null, error };
}

export function discardBuildLayoutDraft(draft) {
  return {
    ...draft,
    targetId: null,
    status: "clean",
    activity: "active",
    value: structuredClone(draft.baseline),
    error: null,
    sceneConsequences: [],
  };
}

function repairLandingRoutes(dashboard, mergedPageId, mergeTargetPageId) {
  const remainingPageIds = new Set(dashboard.pages.map(({ id }) => id));
  let changed = false;
  const pages = dashboard.pages.map((page) => {
    if (!page.landing) return page;
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
    const primaryAction = page.landing.hero?.primaryAction;
    const previousPrimaryPageId = primaryAction?.pageId;
    const nextPrimaryPageId = previousPrimaryPageId === mergedPageId
      ? mergeTargetPageId
      : remainingPageIds.has(previousPrimaryPageId)
        ? previousPrimaryPageId
        : retainedRoutes[0].pageId;
    const routesChanged = retainedRoutes.length !== (page.landing.domainRoutes ?? []).length
      || retainedRoutes.some((route, index) => route.pageId !== page.landing.domainRoutes?.[index]?.pageId);
    if (!routesChanged && nextPrimaryPageId === previousPrimaryPageId) return page;
    changed = true;
    return {
      ...page,
      landing: {
        ...page.landing,
        domainRoutes: retainedRoutes,
        hero: primaryAction ? {
          ...(page.landing.hero ?? {}),
          primaryAction: { ...primaryAction, pageId: nextPrimaryPageId },
        } : page.landing.hero,
      },
    };
  });
  return changed ? { ...dashboard, pages } : dashboard;
}

function cloneLayoutStructure(dashboard = {}) {
  return {
    ...dashboard,
    pages: (dashboard.pages ?? []).map((page) => ({
      ...page,
      sections: [...(page.sections ?? [])],
    })),
  };
}

function markDirty(draft, targetId, value = draft.value) {
  return {
    ...draft,
    value,
    targetId,
    status: "dirty",
    revision: (draft.revision ?? 0) + 1,
    error: null,
  };
}

function isBuildLayoutDraftMutable(draft) {
  return Boolean(draft) && draft.status !== "saving";
}

function isExactBuildLayoutSave(current, saving) {
  return Boolean(
    current
    && saving
    && current.draftId === saving.draftId
    && current.status === "saving"
    && current.revision === saving.revision
    && current.saveRevision === saving.saveRevision,
  );
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
  const scenes = (dashboard?.scenes ?? []).map((scene) => (
    scene.pageId === pageId ? removeSceneChartReferences(scene, chartIds) : scene
  ));
  return scenes.some((scene, index) => scene !== dashboard.scenes[index])
    ? { ...dashboard, scenes }
    : dashboard;
}

function removeChartReferences(dashboard, chartIds) {
  const removed = new Set(chartIds);
  const removedChronoGroupIds = new Set();
  const chronoGroups = (dashboard?.chronoGroups ?? []).flatMap((group) => {
    const members = (group.members ?? []).filter(({ chartId }) => !removed.has(chartId));
    const chartIdsValue = Array.isArray(group.chartIds)
      ? group.chartIds.filter((id) => !removed.has(id))
      : group.chartIds;
    if (members.length > 0) {
      if (members.length === (group.members ?? []).length && chartIdsValue?.length === group.chartIds?.length) return [group];
      return [{ ...group, members, ...(Array.isArray(group.chartIds) ? { chartIds: chartIdsValue } : {}) }];
    }
    removedChronoGroupIds.add(group.id);
    return [];
  });
  const scenes = (dashboard?.scenes ?? [])
    .filter((scene) => !removedChronoGroupIds.has(scene?.chronoGroupId))
    .map((scene) => removeSceneChartReferences(scene, chartIds));
  return { ...dashboard, chronoGroups, scenes };
}

function pruneScenesWithRemovedParents(dashboard, { pageIds = new Set(), chronoGroupIds = new Set() } = {}) {
  const scenes = (dashboard?.scenes ?? []).filter((scene) => (
    !pageIds.has(scene?.pageId)
    && !chronoGroupIds.has(scene?.chronoGroupId)
  ));
  return scenes.length === (dashboard.scenes ?? []).length ? dashboard : { ...dashboard, scenes };
}

function removeSceneChartReferences(scene, chartIds) {
  const removed = new Set(chartIds);
  const chartIdsValue = Array.isArray(scene.chartIds)
    ? scene.chartIds.filter((id) => !removed.has(id))
    : scene.chartIds;
  const members = Array.isArray(scene.members)
    ? scene.members.filter(({ chartId }) => !removed.has(chartId))
    : scene.members;
  const presentChartIds = Array.isArray(scene.present?.chartIds)
    ? scene.present.chartIds.filter((id) => !removed.has(id))
    : scene.present?.chartIds;
  const frameRule = scene.frameRule?.chartId && removed.has(scene.frameRule.chartId)
    ? { type: "calendar" }
    : scene.frameRule;
  const changed = chartIdsValue?.length !== scene.chartIds?.length
    || members?.length !== scene.members?.length
    || presentChartIds?.length !== scene.present?.chartIds?.length
    || frameRule !== scene.frameRule;
  if (!changed) return scene;
  return {
    ...scene,
    ...(Array.isArray(scene.chartIds) ? { chartIds: chartIdsValue } : {}),
    ...(Array.isArray(scene.members) ? { members } : {}),
    ...(Array.isArray(scene.present?.chartIds) ? {
      present: { ...scene.present, chartIds: presentChartIds },
    } : {}),
    ...(scene.frameRule !== undefined || frameRule !== undefined ? { frameRule } : {}),
  };
}

function reassignPageScopedScenes(dashboard, sourcePageId, targetPageId) {
  const scenes = (dashboard?.scenes ?? []).map((scene) => (
    scene.pageId === sourcePageId ? { ...scene, pageId: targetPageId } : scene
  ));
  return scenes.some((scene, index) => scene !== dashboard.scenes[index])
    ? { ...dashboard, scenes }
    : dashboard;
}
