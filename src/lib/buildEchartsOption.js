const DEFAULT_TEXT_COLOR = "#08224A";
const DEFAULT_GRID = {
  left: 52,
  right: 28,
  top: 86,
  bottom: 48,
};

export function buildEchartsOption(chart, data) {
  if (chart.type === "table") {
    return {};
  }

  const isHorizontal = chart.type === "horizontalBar";
  const labels = data.map((row) => row[chart.x]);
  const seriesType = chart.type === "area" ? "line" : chartType(chart.type);

  const series = chart.series.map((item) => ({
    name: item.name,
    type: seriesType,
    data: data.map((row) => row[item.y]),
    itemStyle: {
      color: item.color,
    },
    lineStyle: {
      color: item.color,
      width: item.lineWidth ?? 3,
      type: item.lineStyle ?? "solid",
    },
    areaStyle: chart.type === "area" ? { opacity: 0.18 } : undefined,
    smooth: item.smooth ?? false,
  }));

  return {
    title: {
      text: chart.title,
      left: 0,
      textStyle: {
        color: DEFAULT_TEXT_COLOR,
        fontSize: 18,
      },
    },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) =>
        typeof value === "number" ? value.toLocaleString() : value,
    },
    legend: {
      show: chart.legend ?? true,
      top: 34,
      right: 0,
    },
    grid: DEFAULT_GRID,
    xAxis: isHorizontal
      ? { type: "value", axisLabel: { color: DEFAULT_TEXT_COLOR } }
      : { type: "category", data: labels, axisLabel: { color: DEFAULT_TEXT_COLOR } },
    yAxis: isHorizontal
      ? { type: "category", data: labels, axisLabel: { color: DEFAULT_TEXT_COLOR } }
      : { type: "value", axisLabel: { color: DEFAULT_TEXT_COLOR } },
    series: isHorizontal
      ? series.map((item) => ({
          ...item,
          data: [...item.data].reverse(),
        }))
      : series,
  };
}

function chartType(type) {
  if (type === "horizontalBar") {
    return "bar";
  }
  return type;
}
