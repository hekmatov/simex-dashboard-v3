const READY_SOURCE_STATE = Object.freeze({ status: "ready" });
const LOADING_SOURCE_STATE = Object.freeze({ status: "loading" });

export function sourceStateForDashboard(dashboard, sourceId, chartId) {
  const chartState = dashboard?.chartDataStates?.[chartId];
  if (chartState && typeof chartState === "object") return chartState;
  const explicit = dashboard?.dataSourceStates?.[sourceId];
  if (explicit && typeof explicit === "object") return explicit;
  return Object.hasOwn(dashboard?.loadedData ?? {}, sourceId)
    ? READY_SOURCE_STATE
    : LOADING_SOURCE_STATE;
}

export function resolveChartDataState({
  chartTitle,
  rows,
  sourceState,
} = {}) {
  if (!sourceState || typeof sourceState !== "object") return null;
  const title = typeof chartTitle === "string" && chartTitle.trim()
    ? chartTitle.trim()
    : "Chart";
  const status = sourceState.status;
  const hasValidContent = Array.isArray(rows) && rows.length > 0;

  if (status === "loading" || status === "unloaded") {
    return state("loading", `Loading ${title}…`, hasValidContent);
  }
  if (status === "error") {
    return state(
      "error",
      `Couldn’t load ${title}. The previous valid dashboard state is unchanged.`,
      hasValidContent,
    );
  }
  if (status === "partial") {
    const unavailableSeries = typeof sourceState.unavailableSeries === "string"
      && sourceState.unavailableSeries.trim()
      ? sourceState.unavailableSeries.trim()
      : "A configured series";
    return state(
      "partial",
      `${title} is showing partial data. ${unavailableSeries} is unavailable.`,
      hasValidContent,
    );
  }
  if (status === "ready" && !hasValidContent) {
    return state("empty", `No data is available for ${title}.`, false);
  }
  return null;
}

function state(kind, message, hasValidContent) {
  return Object.freeze({ kind, message, hasValidContent });
}
