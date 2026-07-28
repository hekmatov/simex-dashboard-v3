import { validateSeriesRendererMark } from "../presentation/seriesStyleContract.js";

export function buildCompositionRenderModel({ chart, prepared }, schema) {
  const mark = validateSeriesRendererMark(
    "composition",
    schema?.semantics?.mark,
  );
  const groups = groupMarks(prepared.marks);
  const layout = compositionLayout(groups.length);
  const colors = chart.presentation?.series?.colors;
  return {
    kind: "echarts",
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { trigger: "item" },
      legend: { show: chart.presentation?.legend?.visible !== false },
      ...(Array.isArray(colors) ? { color: [...colors] } : {}),
      series: groups.map(({ name, marks }, index) => ({
        name,
        type: "pie",
        center: layout.centers[index],
        radius: mark === "donut"
          ? [layout.innerRadius, layout.outerRadius]
          : ["0%", layout.outerRadius],
        avoidLabelOverlap: true,
        label: { show: chart.presentation?.labels?.visible !== false },
        data: marks.map(({ category, value, share }) => ({ name: String(category), value, share })),
      })),
    },
  };
}

function compositionLayout(count) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const outer = count === 1 ? 72 : Math.max(12, Math.min(32, 38 / Math.max(columns, rows)));
  return {
    centers: Array.from({ length: count }, (_, index) => [
      `${((index % columns + 0.5) / columns) * 100}%`,
      `${((Math.floor(index / columns) + 0.5) / rows) * 100}%`,
    ]),
    innerRadius: `${Math.round(outer * 0.58)}%`,
    outerRadius: `${outer}%`,
  };
}

function groupMarks(marks) {
  const groups = new Map();
  for (const mark of marks) {
    const key = String(mark.groupKey ?? mark.group ?? "");
    if (!groups.has(key)) groups.set(key, { name: mark.group ?? "Composition", marks: [] });
    groups.get(key).marks.push(mark);
  }
  return [...groups.values()];
}

function titleOption(chart) {
  return { text: chart.title ?? "", left: chart.presentation?.title?.align ?? "left" };
}
