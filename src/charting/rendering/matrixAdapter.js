export function buildMatrixRenderModel({ chart, prepared }) {
  const rows = unique(prepared.marks.map(({ row }) => row));
  const columns = unique(prepared.marks.map(({ column }) => column));
  const rowIndexes = new Map(rows.map((row, index) => [row, index]));
  const columnIndexes = new Map(columns.map((column, index) => [column, index]));
  const values = prepared.marks.map(({ value }) => value).filter(Number.isFinite);
  const readiness = chart.typeId === "readinessMatrix";
  return {
    kind: "echarts",
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { position: "top" },
      grid: { containLabel: true, left: 72, right: 32, top: 76, bottom: 68 },
      xAxis: { type: "category", data: columns },
      yAxis: { type: "category", data: rows },
      visualMap: readiness
        ? {
            type: "piecewise",
            pieces: [...new Set(values)].sort(numericSort).map((value) => ({ value, label: String(value) })),
          }
        : {
            type: "continuous",
            min: values.length ? Math.min(...values) : 0,
            max: values.length ? Math.max(...values) : 0,
          },
      series: [{
        name: chart.title ?? "",
        type: "heatmap",
        label: { show: readiness || chart.presentation?.labels?.visible === true },
        data: prepared.marks.map((mark) => [
          columnIndexes.get(mark.column),
          rowIndexes.get(mark.row),
          mark.value,
          { time: mark.time, group: mark.group },
        ]),
        emphasis: { itemStyle: { shadowBlur: 8 } },
      }],
    },
  };
}

function titleOption(chart) {
  return { text: chart.title ?? "", left: chart.presentation?.title?.align ?? "left" };
}

function unique(values) {
  return [...new Set(values)];
}

function numericSort(left, right) {
  return left - right;
}
