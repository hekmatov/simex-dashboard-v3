const HORIZONTAL_TYPES = new Set(["horizontalBar", "horizontalStackedBar"]);
const STACKED_TYPES = new Set(["stackedBar", "horizontalStackedBar"]);

export function buildAxisRenderModel({ chart, prepared, datasetProfile, renderContext = {} }) {
  const horizontal = HORIZONTAL_TYPES.has(chart.typeId);
  const temporal = !horizontal && observationInterpretation(chart, prepared, datasetProfile, renderContext) === "temporal";
  const categories = unique(prepared.marks.map(({ x }) => x));
  const grouped = groupSeries(prepared.marks);
  const hasSecondary = grouped.some(({ axis }) => axis === "secondary");
  const categoryAxis = {
    type: temporal ? "time" : "category",
    ...(temporal ? {} : { data: categories }),
  };
  const primaryAxis = valueAxis(chart.presentation?.axes?.primary);
  const secondaryAxis = valueAxis(chart.presentation?.axes?.secondary, true);
  const series = grouped.map((group, index) => {
    const type = seriesType(chart.typeId, group, index);
    const values = temporal
      ? [...group.marks]
          .sort((left, right) => String(left.x).localeCompare(String(right.x)))
          .map(({ x, value }) => [x, value])
      : categories.map((category) => group.marks.find(({ x }) => Object.is(x, category))?.value ?? null);
    return {
      name: group.name,
      type,
      data: values,
      yAxisIndex: horizontal ? undefined : group.axis === "secondary" ? 1 : 0,
      stack: STACKED_TYPES.has(chart.typeId) ? "total" : undefined,
      areaStyle: chart.typeId === "area" ? { opacity: 0.24 } : undefined,
      showSymbol: type === "line",
      emphasis: { focus: "series" },
    };
  });

  return {
    kind: "echarts",
    option: {
      title: titleOption(chart),
      aria: ariaOption(chart),
      tooltip: { trigger: "axis" },
      legend: { show: chart.presentation?.legend?.visible !== false },
      grid: { containLabel: true, left: 48, right: hasSecondary ? 56 : 28, top: 76, bottom: 52 },
      xAxis: horizontal ? primaryAxis : categoryAxis,
      yAxis: horizontal ? { ...categoryAxis, type: "category" } : hasSecondary ? [primaryAxis, secondaryAxis] : primaryAxis,
      series,
      dataZoom: zoomOption(chart, horizontal),
    },
  };
}

function observationInterpretation(chart, prepared, datasetProfile, renderContext) {
  return renderContext.axisInterpretation
    ?? renderContext.interpretations?.observation
    ?? prepared.meta?.axisInterpretation
    ?? prepared.meta?.observationInterpretation
    ?? chart.roles?.observation?.interpretation
    ?? profileInterpretation(chart, datasetProfile)
    ?? "category";
}

function profileInterpretation(chart, datasetProfile) {
  const field = chart.roles?.observation?.field;
  if (!field) return undefined;
  return datasetProfile?.columns?.find(({ name }) => name === field)?.type;
}

function valueAxis(settings = {}, secondary = false) {
  return {
    type: "value",
    name: settings?.title ?? settings?.name ?? "",
    min: settings?.min,
    max: settings?.max,
    splitLine: { show: secondary ? false : settings?.grid !== false },
  };
}

function groupSeries(marks) {
  const groups = new Map();
  for (const mark of marks) {
    const key = JSON.stringify([
      mark.measure ?? "",
      mark.clusterKey ?? mark.cluster ?? "",
      mark.groupKey ?? mark.group ?? "",
      mark.label ?? "",
      mark.axis ?? "primary",
    ]);
    if (!groups.has(key)) {
      groups.set(key, {
        axis: mark.axis ?? "primary",
        name: seriesName(mark),
        marks: [],
      });
    }
    groups.get(key).marks.push(mark);
  }
  return [...groups.values()];
}

function seriesName(mark) {
  return unique([
    mark.measureLabel ?? mark.measure ?? "Value",
    mark.cluster,
    mark.group,
    mark.label,
  ].filter((value) => value !== null && value !== undefined && value !== "").map(String)).join(" · ");
}

function seriesType(typeId, group, index) {
  if (typeId === "line" || typeId === "area") return "line";
  if (typeId !== "mixed") return "bar";
  if (group.axis === "secondary" || index > 0) return "line";
  return "bar";
}

function zoomOption(chart, horizontal) {
  if (!chart.interaction?.zoom?.enabled) return undefined;
  const axisIndex = horizontal ? { yAxisIndex: 0 } : { xAxisIndex: 0 };
  return [
    {
      type: "inside",
      ...axisIndex,
      zoomOnMouseWheel: "ctrl",
      moveOnMouseWheel: false,
      moveOnMouseMove: false,
    },
    { type: "slider", ...axisIndex },
  ];
}

function titleOption(chart) {
  return {
    text: chart.title ?? "",
    left: chart.presentation?.title?.align ?? "left",
  };
}

function ariaOption(chart) {
  return {
    enabled: true,
    description: chart.presentation?.accessibility?.description ?? chart.description ?? chart.title ?? "",
  };
}

function unique(values) {
  return [...new Set(values)];
}
