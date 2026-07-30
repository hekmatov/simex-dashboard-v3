export function chartDescriptionVisible(chart) {
  return chart?.presentation?.description?.visible === true;
}

export function resolveChartCitation({
  chart = {},
  dataSources = {},
  datasetProfile,
} = {}) {
  return nonEmpty(chart.presentation?.citation?.label)
    ?? nonEmpty(readEntry(dataSources, chart.sourceId)?.provenance?.label)
    ?? nonEmpty(datasetProfile?.provenance?.label)
    ?? nonEmpty(chart.sourceId)
    ?? "Unavailable";
}

export function withChartCitation(chart, label) {
  const next = structuredClone(chart);
  next.presentation = { ...(next.presentation ?? {}) };
  const normalized = nonEmpty(label);
  if (normalized) {
    next.presentation.citation = { label: normalized };
  } else {
    delete next.presentation.citation;
  }
  return next;
}

export function applyCitationToSourceCharts(
  dashboard,
  { sourceId, label, excludeChartId = null } = {},
) {
  const normalizedSourceId = nonEmpty(sourceId);
  if (!normalizedSourceId) {
    throw new Error("A data source is required to apply a shared citation.");
  }
  const nextDashboard = structuredClone(dashboard);
  const affectedChartIds = [];
  nextDashboard.pages = (nextDashboard.pages ?? []).map((page) => ({
    ...page,
    sections: (page.sections ?? []).map((section) => ({
      ...section,
      panels: (section.panels ?? []).map((placement) => {
        const wrapped = placement?.chart && typeof placement.chart === "object";
        const chart = wrapped ? placement.chart : placement;
        if (
          chart?.sourceId !== normalizedSourceId
          || chart?.id === excludeChartId
        ) return placement;
        const updated = withChartCitation(chart, label);
        affectedChartIds.push(updated.id);
        return wrapped ? { ...placement, chart: updated } : updated;
      }),
    })),
  }));
  return { dashboard: nextDashboard, affectedChartIds };
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return collection && typeof collection === "object" ? collection[key] : undefined;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
