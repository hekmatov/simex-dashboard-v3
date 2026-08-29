const MOVE_KINDS = new Set(["page", "section", "panel"]);
const PRESENT_LAYOUTS = Object.freeze({
  1: ["single"],
  2: ["vertical-divider", "horizontal-divider"],
  3: ["large-top", "large-bottom", "large-left", "large-right"],
  4: ["grid-2x2"],
});

export function analyzeBuildLayoutMove(dashboardDraft, move) {
  const dashboard = dashboardValue(dashboardDraft);
  if (!dashboard || !Array.isArray(dashboard.pages)) {
    return immutableFailure("MOVE_LAYOUT_INVALID", "A dashboard layout draft is required.");
  }
  if (!MOVE_KINDS.has(move?.kind)) {
    return immutableFailure("MOVE_KIND_INVALID", "Move kind must be page, section, or panel.");
  }

  const source = locateSource(dashboard, move);
  if (!source) return immutableFailure("MOVE_SOURCE_NOT_FOUND", "The move source no longer exists.");
  const target = locateTarget(dashboard, move);
  if (!target) return immutableFailure("MOVE_TARGET_NOT_FOUND", "The move target no longer exists.");

  const nextDashboard = structuredClone(dashboard);
  const applied = moveEntity(nextDashboard, move, source, target);
  if (!applied.valid) return immutableFailure(applied.code, applied.message);
  if (!applied.changed) {
    return deepFreeze({ status: "noop", error: null, move: structuredClone(move), consequences: [] });
  }

  const movedPanels = panelsForMove(source);
  const movedCharts = movedPanels
    .map((panel) => ({ id: chartIdForPanel(panel), name: chartNameForPanel(panel) }))
    .filter(({ id }) => typeof id === "string" && id !== "");
  const consequences = source.pageId !== applied.pageId
    ? applySceneConsequences(nextDashboard, {
        sourcePageId: source.pageId,
        destinationPageId: applied.pageId,
        movedCharts,
      })
    : [];
  const requiresConfirmation = consequences.some(({ type }) => type === "scene-partial-split");

  return deepFreeze({
    status: "ready",
    error: null,
    kind: move.kind,
    move: structuredClone(move),
    source: sourceDescriptor(source),
    destination: {
      pageId: applied.pageId,
      sectionId: applied.sectionId ?? null,
      index: applied.index,
    },
    targetId: source.targetId,
    movedPlacementIds: movedPanels.map(({ id }) => id).filter(Boolean),
    movedChartIds: movedCharts.map(({ id }) => id),
    consequences,
    requiresConfirmation,
    value: nextDashboard,
  });
}

export function applyBuildLayoutMove(layoutDraft, analysis, { confirmed = false } = {}) {
  if (!layoutDraft || analysis?.status !== "ready") return layoutDraft;
  if (analysis.requiresConfirmation && confirmed !== true) return layoutDraft;
  return {
    ...layoutDraft,
    value: structuredClone(analysis.value),
    targetId: analysis.targetId,
    status: "dirty",
    error: null,
    sceneConsequences: structuredClone(analysis.consequences),
  };
}

function locateSource(dashboard, move) {
  if (move.kind === "page") {
    const index = dashboard.pages.findIndex(({ id }) => id === move.source?.pageId);
    if (index < 0) return null;
    return {
      pageId: move.source.pageId,
      pageIndex: index,
      page: dashboard.pages[index],
      targetId: move.source.pageId,
    };
  }
  const pageIndex = dashboard.pages.findIndex(({ id }) => id === move.source?.pageId);
  const page = dashboard.pages[pageIndex];
  if (!page) return null;
  const sectionIndex = (page.sections ?? []).findIndex(({ id }) => id === move.source?.sectionId);
  const section = page.sections?.[sectionIndex];
  if (!section) return null;
  if (move.kind === "section") {
    return {
      pageId: page.id,
      pageIndex,
      page,
      sectionId: section.id,
      sectionIndex,
      section,
      targetId: section.id,
    };
  }
  const panelIndex = (section.panels ?? []).findIndex(({ id }) => id === move.source?.placementId);
  const panel = section.panels?.[panelIndex];
  if (!panel) return null;
  return {
    pageId: page.id,
    pageIndex,
    page,
    sectionId: section.id,
    sectionIndex,
    section,
    panelIndex,
    panel,
    targetId: panel.id,
  };
}

function locateTarget(dashboard, move) {
  if (move.kind === "page") {
    return validIndex(move.target?.index, dashboard.pages.length)
      ? { index: move.target.index }
      : null;
  }
  const pageIndex = dashboard.pages.findIndex(({ id }) => id === move.target?.pageId);
  const page = dashboard.pages[pageIndex];
  if (!page || page.landing) return null;
  if (move.kind === "section") {
    return validIndex(move.target?.index, (page.sections ?? []).length)
      ? { page, pageIndex, index: move.target.index }
      : null;
  }
  const sectionIndex = (page.sections ?? []).findIndex(({ id }) => id === move.target?.sectionId);
  const section = page.sections?.[sectionIndex];
  if (!section || !validIndex(move.target?.index, (section.panels ?? []).length)) return null;
  return { page, pageIndex, section, sectionIndex, index: move.target.index };
}

function moveEntity(dashboard, move, source, target) {
  if (move.kind === "page") {
    const [page] = dashboard.pages.splice(source.pageIndex, 1);
    const index = reconcileIndex(source.pageIndex, target.index, dashboard.pages.length);
    if (index === source.pageIndex) return { valid: true, changed: false };
    dashboard.pages.splice(index, 0, page);
    return { valid: true, changed: true, pageId: page.id, sectionId: null, index };
  }

  const sourcePage = dashboard.pages[source.pageIndex];
  const targetPage = dashboard.pages[target.pageIndex];
  if (move.kind === "section") {
    if (sourcePage !== targetPage && sourcePage.sections.length === 1) {
      return {
        valid: false,
        code: "MOVE_FINAL_SECTION_PROTECTED",
        message: "The source Page must retain a Section.",
      };
    }
    const [section] = sourcePage.sections.splice(source.sectionIndex, 1);
    const index = sourcePage === targetPage
      ? reconcileIndex(source.sectionIndex, target.index, targetPage.sections.length)
      : Math.min(target.index, targetPage.sections.length);
    if (sourcePage === targetPage && index === source.sectionIndex) {
      sourcePage.sections.splice(source.sectionIndex, 0, section);
      return { valid: true, changed: false };
    }
    targetPage.sections.splice(index, 0, section);
    return { valid: true, changed: true, pageId: targetPage.id, sectionId: section.id, index };
  }

  const sourceSection = sourcePage.sections[source.sectionIndex];
  const targetSection = targetPage.sections[target.sectionIndex];
  const [panel] = sourceSection.panels.splice(source.panelIndex, 1);
  const index = sourceSection === targetSection
    ? reconcileIndex(source.panelIndex, target.index, targetSection.panels.length)
    : Math.min(target.index, targetSection.panels.length);
  if (sourceSection === targetSection && index === source.panelIndex) {
    sourceSection.panels.splice(source.panelIndex, 0, panel);
    return { valid: true, changed: false };
  }
  targetSection.panels.splice(index, 0, panel);
  return {
    valid: true,
    changed: true,
    pageId: targetPage.id,
    sectionId: targetSection.id,
    index,
  };
}

function applySceneConsequences(dashboard, { sourcePageId, destinationPageId, movedCharts }) {
  if (movedCharts.length === 0) return [];
  const movedById = new Map(movedCharts.map((chart) => [chart.id, chart]));
  const consequences = [];
  for (const scene of dashboard.scenes ?? []) {
    if (scene.pageId !== sourcePageId) continue;
    const members = Array.isArray(scene.members)
      ? scene.members
      : (scene.chartIds ?? []).map((chartId) => ({ chartId }));
    const movedMembers = members.filter(({ chartId }) => movedById.has(chartId));
    if (movedMembers.length === 0) continue;
    const chartNames = movedMembers.map(({ chartId }) => movedById.get(chartId)?.name ?? chartId);
    const sceneName = scene.name ?? scene.id;
    if (movedMembers.length === members.length) {
      scene.pageId = destinationPageId;
      consequences.push({
        type: "scene-page-migration",
        sceneId: scene.id,
        sceneName,
        chartIds: movedMembers.map(({ chartId }) => chartId),
        chartNames,
        destinationPageId,
      });
      continue;
    }

    const movedIds = new Set(movedMembers.map(({ chartId }) => chartId));
    scene.members = members.filter(({ chartId }) => !movedIds.has(chartId));
    if (Array.isArray(scene.chartIds)) {
      scene.chartIds = scene.chartIds.filter((chartId) => !movedIds.has(chartId));
    }
    consequences.push({
      type: "scene-partial-split",
      sceneId: scene.id,
      sceneName,
      chartIds: [...movedIds],
      chartNames,
      destinationPageId,
    });

    if (scene.frames?.mode === "source" && movedIds.has(scene.frames.chartId)) {
      const previousChartId = scene.frames.chartId;
      scene.frames = {
        mode: "unresolved",
        reason: "source-chart-moved",
        previousChartId,
      };
      consequences.push({
        type: "scene-frame-source-unresolved",
        sceneId: scene.id,
        sceneName,
        chartIds: [previousChartId],
        chartNames: [movedById.get(previousChartId)?.name ?? previousChartId],
      });
    }

    const previousPresentIds = scene.present?.chartIds ?? [];
    const nextPresentIds = previousPresentIds.filter((chartId) => !movedIds.has(chartId));
    if (nextPresentIds.length !== previousPresentIds.length) {
      if (nextPresentIds.length === 0) nextPresentIds.push(scene.members[0].chartId);
      scene.present = {
        ...(scene.present ?? {}),
        chartIds: nextPresentIds,
        layout: validPresentLayout(scene.present?.layout, nextPresentIds.length)
          ? scene.present.layout
          : PRESENT_LAYOUTS[nextPresentIds.length][0],
      };
      consequences.push({
        type: "scene-present-fallback",
        sceneId: scene.id,
        sceneName,
        chartIds: [...movedIds],
        chartNames,
        presentChartIds: [...nextPresentIds],
        presentLayout: scene.present.layout,
      });
    }
  }
  return consequences;
}

function dashboardValue(value) {
  return value?.value && Array.isArray(value.value.pages) ? value.value : value;
}

function panelsForMove(source) {
  if (source.panel) return [source.panel];
  if (source.section) return source.section.panels ?? [];
  if (source.page) return (source.page.sections ?? []).flatMap(({ panels = [] }) => panels);
  return [];
}

function chartIdForPanel(panel) {
  if (panel?.chart?.id) return panel.chart.id;
  if (panel?.configVersion === 3 || typeof panel?.typeId === "string") return panel.id;
  return null;
}

function chartNameForPanel(panel) {
  const chart = panel?.chart ?? panel;
  return chart?.title ?? chart?.label ?? chart?.id;
}

function sourceDescriptor(source) {
  return {
    pageId: source.pageId,
    sectionId: source.sectionId ?? null,
    placementId: source.panel?.id ?? null,
  };
}

function reconcileIndex(sourceIndex, requestedIndex, targetLengthAfterRemoval) {
  const adjusted = sourceIndex < requestedIndex ? requestedIndex - 1 : requestedIndex;
  return Math.max(0, Math.min(adjusted, targetLengthAfterRemoval));
}

function validIndex(value, length) {
  return Number.isInteger(value) && value >= 0 && value <= length;
}

function validPresentLayout(layout, count) {
  return PRESENT_LAYOUTS[count]?.includes(layout) === true;
}

function immutableFailure(code, message) {
  return deepFreeze({ status: "invalid", error: { code, message }, consequences: [] });
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
