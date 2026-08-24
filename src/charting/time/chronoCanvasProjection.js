export function buildChronoCanvasProjection({
  activePage,
  activeGroup,
  activeScene,
  scope,
}) {
  const pageChartIds = (activePage?.sections ?? []).flatMap((section) => (
    section.panels ?? []
  ).map((placement) => (placement.chart ?? placement).id));
  const pageChartIdSet = new Set(pageChartIds);
  const groupChartIds = (activeGroup?.members ?? [])
    .map(({ chartId }) => chartId)
    .filter((chartId) => pageChartIdSet.has(chartId));
  const focusedChartIds = activeScene
    ? (activeScene.members ?? [])
      .map(({ chartId }) => chartId)
      .filter((chartId) => pageChartIdSet.has(chartId))
    : groupChartIds;
  const visibleChartIds = scope === "group-only"
    ? new Set(groupChartIds)
    : pageChartIdSet;

  return Object.freeze({
    focusedChartIds: Object.freeze(focusedChartIds),
    hiddenChartIds: Object.freeze(pageChartIds.filter((chartId) => !visibleChartIds.has(chartId))),
  });
}
