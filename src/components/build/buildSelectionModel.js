export function reconcileBuildSelection(selection, dashboard = {}, activePageId) {
  const pages = Array.isArray(dashboard.pages) ? dashboard.pages : [];
  const activePage = pages.find(({ id }) => id === activePageId) ?? pages[0];
  const fallback = activePage
    ? { kind: "page", pageId: activePage.id }
    : { kind: "scenario" };
  if (!selection || typeof selection !== "object") return fallback;

  if (selection.kind === "scenario") return { kind: "scenario" };
  if (selection.kind === "chronoGroup") {
    const group = (dashboard.chronoGroups ?? []).find(
      ({ id }) => id === selection.chronoGroupId,
    );
    return group ? { kind: "chronoGroup", chronoGroupId: group.id } : fallback;
  }

  const page = pages.find(({ id }) => id === selection.pageId);
  if (!page) return fallback;
  if (activePage && page.id !== activePage.id) return fallback;
  if (selection.kind === "page") return { kind: "page", pageId: page.id };

  const section = (page.sections ?? []).find(
    ({ id }) => id === selection.sectionId,
  );
  if (!section) return { kind: "page", pageId: page.id };
  if (selection.kind === "section") {
    return { kind: "section", pageId: page.id, sectionId: section.id };
  }

  const placement = (section.panels ?? []).find(
    ({ id }) => id === selection.placementId,
  );
  const chart = placement?.chart ?? placement;
  if (selection.kind !== "chart") {
    return { kind: "section", pageId: page.id, sectionId: section.id };
  }
  if (!placement || !chart?.id) return { kind: "page", pageId: page.id };
  return {
    kind: "chart",
    pageId: page.id,
    sectionId: section.id,
    placementId: placement.id,
    chartId: chart.id,
  };
}

export function requestBuildChartSelection(buildState, {
  pageId,
  sectionId,
  placementId,
  chartId,
} = {}) {
  const reopeningCurrent = buildState?.selection?.kind === "chart"
    && typeof placementId === "string"
    && placementId !== ""
    && buildState.selection.placementId === placementId;
  if (
    (buildState?.disabled && !reopeningCurrent)
    || typeof buildState?.onSelect !== "function"
  ) {
    return false;
  }
  buildState.onSelect({
    kind: "chart",
    pageId,
    sectionId,
    placementId,
    chartId,
  });
  return true;
}
