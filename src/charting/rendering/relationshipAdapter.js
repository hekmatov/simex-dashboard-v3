import { validateSeriesRendererMark } from "../presentation/seriesStyleContract.js";
import {
  buildEChartsDataZoom,
  rangeSelectorVisible,
} from "./zoomOptions.js";

export function buildRelationshipRenderModel({ chart, prepared }, schema) {
  const mark = validateSeriesRendererMark(
    "relationship",
    schema?.semantics?.mark,
  );
  const bubble = mark === "bubble";
  const colors = chart.presentation?.series?.colors;
  const labels = chart.presentation?.labels;
  return {
    kind: "echarts",
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { trigger: "item" },
      legend: legendOption(chart),
      ...(Array.isArray(colors) ? { color: [...colors] } : {}),
      grid: {
        containLabel: true,
        left: 48,
        right: 28,
        top: 76,
        bottom: rangeSelectorVisible(chart) ? 52 : 32,
      },
      xAxis: { type: "value", name: chart.presentation?.axes?.primary?.xTitle ?? "" },
      yAxis: { type: "value", name: chart.presentation?.axes?.primary?.yTitle ?? "" },
      series: groupMarks(prepared.marks).map(({ name, marks }) => ({
        name,
        type: "scatter",
        data: marks.map((mark) => ({
          name: mark.label == null ? "" : String(mark.label),
          value: bubble ? [mark.x, mark.y, mark.size] : [mark.x, mark.y],
          cluster: mark.cluster,
          group: mark.group,
        })),
        symbolSize: bubble ? bubbleSize : undefined,
        label: relationshipLabelOption(labels),
        emphasis: { focus: "series" },
      })),
      dataZoom: buildEChartsDataZoom(chart),
    },
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

function relationshipLabelOption(labels) {
  if (!labels) return undefined;
  return {
    show: labels.visible === true,
    position: labels.position ?? "top",
  };
}

function groupMarks(marks) {
  const groups = new Map();
  for (const mark of marks) {
    const key = JSON.stringify([mark.clusterKey ?? mark.cluster ?? "", mark.groupKey ?? mark.group ?? ""]);
    if (!groups.has(key)) {
      const name = [mark.cluster, mark.group].filter((value) => value !== null && value !== undefined && value !== "").join(" · ") || "Values";
      groups.set(key, { name, marks: [] });
    }
    groups.get(key).marks.push(mark);
  }
  return [...groups.values()];
}

function bubbleSize(value) {
  const size = Number(value?.[2]);
  return Number.isFinite(size) ? Math.max(8, Math.min(64, 8 + Math.sqrt(Math.abs(size)) * 4)) : 8;
}

function titleOption(chart) {
  return { text: chart.title ?? "", left: chart.presentation?.title?.align ?? "left" };
}
