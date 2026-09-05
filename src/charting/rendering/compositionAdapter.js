import { validateSeriesRendererMark } from "../presentation/seriesStyleContract.js";

export function buildCompositionRenderModel({ chart, prepared }, schema) {
  const mark = validateSeriesRendererMark(
    "composition",
    schema?.semantics?.mark,
  );
  const groups = groupMarks(prepared.marks);
  const layout = compositionLayout(
    groups.length,
    chart.presentation?.series?.verticalCenter === true,
  );
  const colors = chart.presentation?.series?.colors;
  return {
    kind: "echarts",
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { trigger: "item" },
      legend: legendOption(chart),
      ...(Array.isArray(colors) ? { color: [...colors] } : {}),
      series: groups.map(({ name, marks }, index) => ({
        name,
        type: "pie",
        center: layout.centers[index],
        radius: mark === "donut"
          ? [layout.innerRadius, layout.outerRadius]
          : ["0%", layout.outerRadius],
        avoidLabelOverlap: true,
        label: compositionLabel(chart.presentation?.labels, marks.length),
        data: marks.map(({ category, value, share }) => ({ name: String(category), value, share })),
      })),
    },
  };
}

function compositionLayout(count, verticallyCentered = false) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const outer = count === 1 ? 58 : Math.max(12, Math.min(30, 36 / Math.max(columns, rows)));
  return {
    centers: Array.from({ length: count }, (_, index) => [
      `${((index % columns + 0.5) / columns) * 100}%`,
      `${verticallyCentered
        ? ((Math.floor(index / columns) + 0.5) / rows) * 100
        : 30 + ((Math.floor(index / columns) + 0.5) / rows) * 65}%`,
    ]),
    innerRadius: `${Math.round(outer * 0.58)}%`,
    outerRadius: `${outer}%`,
  };
}

function compositionLabel(labels = {}, markCount) {
  const valueMode = labels?.valueMode;
  const showValue = valueMode === "value" || valueMode === "percentage";
  const contrastText = {
    color: "#FFFFFF",
    textBorderColor: "rgba(0, 0, 0, 0.45)",
    textBorderWidth: 2,
  };
  const rich = {
    label: {
      fontSize: labels?.labelFontSize ?? 12,
      ...(labels?.labelWrap === true ? { width: 120, overflow: "break" } : {}),
      ...contrastText,
    },
    ...(showValue ? {
      value: {
        fontSize: labels?.valueFontSize ?? 14,
        ...contrastText,
      },
    } : {}),
  };
  return {
    show: labels?.visible !== false && markCount <= 8,
    position: "inside",
    formatter: showValue
      ? `{label|{b}}\\n{value|${valueMode === "percentage" ? "{d}%" : "{c}"}}`
      : "{label|{b}}",
    rich,
    labelLine: { show: false },
  };
}

function legendOption(chart) {
  const fontSize = chart.presentation?.legend?.fontSize;
  const textStyle = {
    ...(chart.presentation?.legend?.wrap === true
      ? { width: 120, overflow: "break" }
      : {}),
    ...(Number.isInteger(fontSize) ? { fontSize } : {}),
  };
  return {
    show: chart.presentation?.legend?.visible !== false,
    ...(Object.keys(textStyle).length > 0 ? { textStyle } : {}),
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
