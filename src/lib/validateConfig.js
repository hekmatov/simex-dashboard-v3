const SUPPORTED_CHART_TYPES = new Set([
  "bar",
  "line",
  "area",
  "horizontalBar",
  "table",
]);

export function validateChartConfig(chart, data) {
  if (!SUPPORTED_CHART_TYPES.has(chart.type)) {
    return `Unsupported chart type "${chart.type}".`;
  }

  if (!Array.isArray(data)) {
    return `Data source "${chart.dataSource}" was not loaded.`;
  }

  if (data.length === 0) {
    return `Data source "${chart.dataSource}" is empty.`;
  }

  const columns = new Set(Object.keys(data[0]));

  if (!columns.has(chart.x)) {
    return `Column "${chart.x}" was not found in "${chart.dataSource}".`;
  }

  for (const series of chart.series ?? []) {
    if (!columns.has(series.y)) {
      return `Column "${series.y}" was not found in "${chart.dataSource}".`;
    }
  }

  return null;
}
