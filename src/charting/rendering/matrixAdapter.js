const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function buildMatrixRenderModel({ chart, prepared }) {
  const activeTime = prepared.meta?.activeTime ?? null;
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
            pieces: [...new Set(values)].sort(numericSort).map((value) => ({
              value,
              label: NUMBER_FORMATTER.format(value),
            })),
          }
        : {
            type: "continuous",
            min: values.length ? Math.min(...values) : 0,
            max: values.length ? Math.max(...values) : 0,
            precision: 2,
          },
      series: [{
        name: chart.title ?? "",
        type: "heatmap",
        label: {
          show: readiness || (
            chart.presentation?.labels?.visible === true
            && prepared.marks.length <= 30
          ),
          formatter: (params) => {
            const value = Array.isArray(params?.value) ? params.value[2] : params?.value;
            return Number.isFinite(Number(value))
              ? NUMBER_FORMATTER.format(Number(value))
              : String(value ?? "");
          },
        },
        data: prepared.marks.map((mark) => matrixDataItem(
          mark,
          columnIndexes.get(mark.column),
          rowIndexes.get(mark.row),
          activeTime,
        )),
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

function matrixDataItem(mark, columnIndex, rowIndex, activeTime) {
  const value = [
    columnIndex,
    rowIndex,
    mark.value,
    { time: mark.time, group: mark.group },
  ];
  if (!activeTime || !isActiveObservation(mark)) return value;
  const provenance = provenanceSummary(mark.temporalProvenance);
  return {
    value: value.slice(0, 3),
    time: mark.time,
    group: mark.group,
    active: true,
    activeTime: activeTime.canonical,
    temporalStatus: provenance.status,
    provenance,
    itemStyle: cueItemStyle(provenance.status),
    tooltip: { formatter: provenance.label },
  };
}

function isActiveObservation(mark) {
  return mark?.active === true
    && mark.temporalProvenance?.status
    && mark.temporalProvenance.status !== "missing";
}

function provenanceSummary(provenance) {
  const status = provenance?.status ?? "missing";
  const sourceTime = formatEpoch(provenance?.sourceEpochMs);
  const lowerTime = formatEpoch(provenance?.lowerEpochMs);
  const upperTime = formatEpoch(provenance?.upperEpochMs);
  const observedTime = sourceTime ?? formatEpoch(provenance?.activeEpochMs);
  const label = bounded(
    status === "observed"
      ? `Observed ${observedTime}`
      : status === "carried"
        ? `Last measured ${sourceTime}`
        : status === "nearest"
          ? `Nearest measurement ${sourceTime}`
          : status === "interpolated"
            ? `Interpolated between ${lowerTime} and ${upperTime}`
            : "No measurement at this time",
  );
  return {
    status,
    label,
    ...(sourceTime ? { sourceTime } : {}),
    ...(lowerTime ? { lowerTime } : {}),
    ...(upperTime ? { upperTime } : {}),
  };
}

function cueItemStyle(status) {
  return {
    borderColor: "#2456a6",
    borderWidth: 3,
    borderType: status === "observed" ? "solid" : "dashed",
  };
}

function formatEpoch(epochMs) {
  if (!Number.isFinite(epochMs)) return null;
  const canonical = new Date(epochMs).toISOString();
  return canonical.endsWith("T00:00:00.000Z") ? canonical.slice(0, 10) : canonical;
}

function bounded(value) {
  return value.length <= 240 ? value : `${value.slice(0, 239)}â€¦`;
}
