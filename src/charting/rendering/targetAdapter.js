const GAUGE_COLORS = ["#d73027", "#fdae61", "#1a9850", "#2c7bb6"];

export function buildTargetRenderModel({ chart, prepared }) {
  if (chart.typeId === "gauge") return gaugeModel(chart, prepared.marks);
  if (chart.typeId === "bullet") return bulletModel(chart, prepared.marks);
  return cardModel(chart, prepared.marks);
}

function gaugeModel(chart, marks) {
  const ranges = chart.presentation?.targets?.ranges ?? [];
  const rangeMaximum = Math.max(0, ...ranges.map(rangeEnd).filter(Number.isFinite));
  const maximum = Math.max(
    100,
    rangeMaximum,
    ...marks.flatMap(({ value, target }) => [finite(value), finite(target)]),
  );
  const layout = gaugeLayout(chart.presentation?.collection, marks.length);
  return {
    kind: "echarts",
    presentation: {
      collection: clone(chart.presentation?.collection ?? null),
    },
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      series: marks.map((mark, index) => {
        const name = mark.entity ?? mark.label ?? chart.title ?? "";
        return {
          name,
          type: "gauge",
          min: 0,
          max: maximum,
          center: layout.centers[index],
          radius: layout.radius,
          axisLine: { lineStyle: { color: gaugeSegments(ranges, maximum) } },
          detail: { valueAnimation: true },
          title: { show: Boolean(name) },
          data: [{
            value: mark.value,
            name,
            target: mark.target,
            time: mark.time,
          }],
        };
      }),
    },
  };
}

function gaugeLayout(collection, count) {
  const columns = collection?.columns ?? Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = collection?.rows ?? Math.max(1, Math.ceil(count / columns));
  return {
    centers: Array.from({ length: count }, (_, index) => [
      `${((index % columns + 0.5) / columns) * 100}%`,
      `${((Math.floor(index / columns) + 0.5) / rows) * 100}%`,
    ]),
    radius: `${Math.max(12, Math.min(38, 36 / Math.max(columns, rows)))}%`,
  };
}

function bulletModel(chart, marks) {
  const categories = marks.map((mark, index) => mark.label ?? `Item ${index + 1}`);
  return {
    kind: "echarts",
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { trigger: "axis" },
      grid: { containLabel: true, left: 72, right: 36, top: 76, bottom: 42 },
      xAxis: { type: "value" },
      yAxis: { type: "category", data: categories },
      series: [
        {
          name: "Actual",
          type: "bar",
          data: marks.map(({ actual }) => actual),
          z: 2,
        },
        {
          name: "Target",
          type: "scatter",
          symbol: "rect",
          symbolSize: [4, 24],
          data: marks.map((mark, index) => ({
            value: [mark.target, categories[index]],
            time: mark.time,
          })),
          z: 3,
        },
      ],
    },
  };
}

function cardModel(chart, marks) {
  const delta = chart.typeId === "deltaCard" || chart.typeId === "deltaList";
  return {
    kind: "cards",
    items: marks.map((mark, index) => delta ? deltaItem(chart, mark, index) : kpiItem(chart, mark, index)),
    presentation: {
      collection: clone(chart.presentation?.collection ?? null),
      labels: clone(chart.presentation?.labels ?? null),
      accessibility: clone(chart.presentation?.accessibility ?? null),
    },
  };
}

function kpiItem(chart, mark, index) {
  return {
    key: `kpi-${index}`,
    label: chart.title ?? "KPI",
    value: mark.value,
    target: mark.target ?? null,
    time: mark.time ?? null,
    comparison: null,
    delta: null,
    direction: null,
  };
}

function deltaItem(chart, mark, index) {
  const absolute = mark.delta?.absolute;
  return {
    key: String(mark.entity ?? `${chart.typeId}-${index}`),
    label: mark.entity ?? chart.title ?? "Change",
    value: mark.displayed,
    target: mark.target ?? null,
    time: mark.time ?? null,
    comparison: mark.comparison,
    delta: clone(mark.delta ?? { absolute: null, percentage: null }),
    direction: absolute > 0 ? "increase" : absolute < 0 ? "decrease" : "unchanged",
  };
}

function gaugeSegments(ranges, maximum) {
  if (!ranges.length) return [[1, GAUGE_COLORS[2]]];
  return ranges
    .map((range, index) => [
      Math.min(1, Math.max(0, rangeEnd(range) / maximum)),
      typeof range === "object" && range?.color ? range.color : GAUGE_COLORS[index % GAUGE_COLORS.length],
    ])
    .sort((left, right) => left[0] - right[0]);
}

function rangeEnd(range) {
  return Number(typeof range === "object" && range !== null ? range.max ?? range.to ?? range.value : range);
}

function finite(value) {
  return Number.isFinite(value) ? value : 0;
}

function titleOption(chart) {
  return { text: chart.title ?? "", left: chart.presentation?.title?.align ?? "left" };
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}
