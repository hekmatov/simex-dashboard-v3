import { validateSeriesRendererMark } from "../presentation/seriesStyleContract.js";
import {
  buildEChartsDataZoom,
  rangeSelectorVisible,
} from "./zoomOptions.js";
import {
  valueAxisPresentation,
  xAxisPresentation,
} from "./axisPresentation.js";
import { createValueAxisTitleProjection } from "./axisTitleGraphics.js";

const BAR_MARKS = new Set([
  "bar",
  "grouped-bar",
  "stacked-bar",
  "horizontal-bar",
  "horizontal-stacked-bar",
]);
const HORIZONTAL_MARKS = new Set([
  "horizontal-bar",
  "horizontal-stacked-bar",
]);
const STACKED_MARKS = new Set([
  "stacked-bar",
  "horizontal-stacked-bar",
]);
const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function buildAxisRenderModel({ chart, prepared }, schema) {
  const mark = validateSeriesRendererMark("axis", schema?.semantics?.mark);
  const horizontal = HORIZONTAL_MARKS.has(mark);
  const temporal = prepared.meta?.axisInterpretation === "temporal";
  const activeTime = prepared.meta?.activeTime ?? null;
  const seriesStyle = chart.presentation?.series;
  const referenceLine = chart.presentation?.referenceLine;
  const categories = unique(prepared.marks.map(({ x }) => x));
  const categoryIndexes = new Map(categories.map((category, index) => [category, index]));
  const grouped = groupSeries(prepared.marks);
  const hasSecondary = grouped.some(({ axis }) => axis === "secondary");
  const axes = chart.presentation?.axes;
  const xSettings = {
    ...legacyXAxisSettings(axes),
    ...(axes?.x ?? {}),
  };
  const xPresentation = xAxisPresentation(
    xSettings,
    temporal ? "temporal" : "category",
    horizontal ? "y" : "x",
  );
  const fixedTemporalTicks = temporal && Number.isFinite(xPresentation.interval);
  const temporalExtent = fixedTemporalTicks
    ? temporalDataExtent(prepared.marks)
    : null;
  const categoryAxis = {
    type: fixedTemporalTicks ? "value" : temporal ? "time" : "category",
    ...(temporal ? {} : { data: categories }),
    ...xPresentation,
    ...(fixedTemporalTicks ? {
      min: temporalAxisValue(xPresentation.min) ?? temporalExtent?.min,
      max: temporalAxisValue(xPresentation.max) ?? temporalExtent?.max,
    } : {}),
  };
  const primarySettings = axes?.primary;
  const secondarySettings = axes?.secondary;
  const primaryValues = groupedValues(grouped, "primary");
  const secondaryValues = groupedValues(grouped, "secondary");
  const primaryAxis = valueAxis(primarySettings, false, primaryValues);
  const secondaryAxis = valueAxis(secondarySettings, true, secondaryValues);
  const valueAxisTitleProjection = [
    createValueAxisTitleProjection({
      id: "primary",
      horizontal,
      secondary: false,
      settings: primarySettings,
      tickValues: primaryValues,
    }),
    hasSecondary
      ? createValueAxisTitleProjection({
          id: "secondary",
          horizontal,
          secondary: true,
          settings: secondarySettings,
          tickValues: secondaryValues,
        })
      : null,
  ].filter(Boolean);
  const series = grouped.map((group, index) => {
    const type = seriesType(mark, group, index);
    const values = temporal
      ? [...group.marks]
          .sort((left, right) => String(left.x).localeCompare(String(right.x)))
          .map((mark) => axisDataValue(
            mark,
            horizontal
              ? [mark.value, fixedTemporalTicks ? temporalAxisValue(mark.x) : mark.x]
              : [fixedTemporalTicks ? temporalAxisValue(mark.x) : mark.x, mark.value],
            activeTime,
            type,
          ))
      : categoryValues(group.marks, categoryIndexes, categories.length, activeTime, type);
    const marker = type === "line"
      ? playbackMarker(group.marks, activeTime, fixedTemporalTicks)
      : undefined;
    return {
      name: group.name,
      type,
      data: values,
      xAxisIndex: horizontal ? group.axis === "secondary" ? 1 : 0 : undefined,
      yAxisIndex: horizontal ? undefined : group.axis === "secondary" ? 1 : 0,
      stack: STACKED_MARKS.has(mark) ? "total" : undefined,
      areaStyle: mark === "area" ? { opacity: 0.24 } : undefined,
      showSymbol: type === "line" && group.marks.length <= 48,
      symbolSize: type === "line" ? 5 : undefined,
      label: axisLabelOption(
        chart,
        horizontal,
        type,
        prepared.marks.length,
      ),
      emphasis: { focus: "series" },
      ...(type === "line" && Number.isFinite(seriesStyle?.lineWidth)
        ? { lineStyle: { width: seriesStyle.lineWidth } }
        : {}),
      ...(type === "bar" && Number.isFinite(seriesStyle?.barWidth)
        ? { barWidth: seriesStyle.barWidth }
        : {}),
      ...(marker ? { markPoint: marker } : {}),
      ...(index === 0 && type === "line" && referenceLine?.visible === true
        && Number.isFinite(referenceLine.value)
        ? { markLine: referenceLineOption(referenceLine) }
        : {}),
    };
  });

  return {
    kind: "echarts",
    valueAxisTitleProjection,
    option: {
      title: titleOption(chart),
      aria: ariaOption(chart),
      tooltip: { trigger: "axis" },
      legend: { show: chart.presentation?.legend?.visible !== false },
      ...(Array.isArray(seriesStyle?.colors)
        ? { color: [...seriesStyle.colors] }
        : {}),
      grid: {
        containLabel: true,
        left: horizontal
          ? 48
          : 48,
        right: horizontal
          ? hasSecondary ? 56 : 28
          : hasSecondary
            ? 56
            : 28,
        top: horizontal
          ? 76
          : 76,
        bottom: horizontal
          ? rangeSelectorVisible(chart) ? 52 : 32
          : rangeSelectorVisible(chart) ? 52 : 32,
      },
      xAxis: horizontal
        ? hasSecondary ? [primaryAxis, secondaryAxis] : primaryAxis
        : categoryAxis,
      yAxis: horizontal ? categoryAxis : hasSecondary ? [primaryAxis, secondaryAxis] : primaryAxis,
      series,
      dataZoom: buildEChartsDataZoom(chart, horizontal ? "y" : "x"),
    },
  };
}

function referenceLineOption(referenceLine) {
  const color = /^#[0-9a-f]{6}$/i.test(referenceLine.color ?? "")
    ? referenceLine.color
    : "#E56B2F";
  return {
    silent: true,
    symbol: "none",
    lineStyle: {
      color,
      type: referenceLine.lineStyle ?? "dashed",
      width: 2,
    },
    label: {
      show: true,
      color,
      formatter: referenceLine.label?.trim() || String(referenceLine.value),
      position: "insideEndTop",
    },
    data: [{ yAxis: referenceLine.value }],
  };
}

function axisLabelOption(chart, horizontal, seriesType, totalMarkCount) {
  const labels = chart.presentation?.labels;
  if (!labels) return undefined;
  const densityLimit = seriesType === "line"
    ? 14
    : horizontal
      ? 24
      : 18;
  const show = labels.visible === true && totalMarkCount <= densityLimit;
  return {
    show,
    position: labels.position ?? (horizontal ? "right" : "top"),
    ...(show ? { formatter: labels.format ?? formatSeriesLabel } : {}),
  };
}

function formatSeriesLabel(params) {
  const raw = Array.isArray(params?.value)
    ? params.value[params.value.length - 1]
    : params?.value?.value ?? params?.value;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? NUMBER_FORMATTER.format(numeric) : String(raw ?? "");
}

function valueAxis(settings = {}, secondary = false, values = []) {
  const presentation = valueAxisPresentation(settings, values);
  delete presentation.name;
  delete presentation.nameLocation;
  delete presentation.nameRotate;
  delete presentation.nameGap;
  return {
    type: "value",
    ...presentation,
    min: settings?.min,
    max: settings?.max,
    splitLine: { show: secondary ? false : settings?.grid !== false },
  };
}

function groupedValues(groups, axis) {
  return groups
    .filter((group) => group.axis === axis)
    .flatMap((group) => group.marks.map(({ value }) => value))
    .filter(Number.isFinite);
}

function legacyXAxisSettings(axes) {
  const primary = axes?.primary;
  if (!primary?.xTitle) return {};
  return { title: primary.xTitle };
}

function temporalDataExtent(marks) {
  const values = marks
    .map(({ x }) => temporalAxisValue(x))
    .filter(Number.isFinite);
  return values.length === 0
    ? null
    : { min: Math.min(...values), max: Math.max(...values) };
}

function temporalAxisValue(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const localCalendar = typeof value === "string"
    ? /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(value)
    : null;
  const numeric = typeof value === "number"
    ? value
    : localCalendar
      ? new Date(
          Number(localCalendar[1]),
          Number(localCalendar[2]) - 1,
          Number(localCalendar[3]),
          Number(localCalendar[4] ?? 0),
          Number(localCalendar[5] ?? 0),
          Number(localCalendar[6] ?? 0),
          Number((localCalendar[7] ?? "0").padEnd(3, "0")),
        ).valueOf()
      : Date.parse(value);
  return Number.isFinite(numeric) ? numeric : undefined;
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

function seriesType(mark, group, index) {
  if (mark === "line" || mark === "area") return "line";
  if (mark === "mixed-axis") {
    return group.axis === "secondary" || index > 0 ? "line" : "bar";
  }
  if (BAR_MARKS.has(mark)) return "bar";
  throw new Error(`Unsupported axis renderer mark "${mark}".`);
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

function categoryValues(marks, indexes, count, activeTime, type) {
  const values = Array.from({ length: count }, () => null);
  for (const mark of marks) {
    const index = indexes.get(mark.x);
    if (index !== undefined) {
      values[index] = axisDataValue(mark, mark.value, activeTime, type);
    }
  }
  return values;
}

function axisDataValue(mark, value, activeTime, type) {
  if (!activeTime || type === "line" || !isActiveObservation(mark)) return value;
  const provenance = provenanceSummary(mark.temporalProvenance);
  return {
    value,
    active: true,
    activeTime: activeTime.canonical,
    temporalStatus: provenance.status,
    provenance,
    itemStyle: cueItemStyle(provenance.status),
    tooltip: { formatter: provenance.label },
  };
}

function playbackMarker(marks, activeTime, numericTime = false) {
  if (!activeTime) return undefined;
  const mark = marks.find(isActiveObservation);
  if (!mark) return undefined;
  const provenance = provenanceSummary(mark.temporalProvenance);
  return {
    symbol: provenance.status === "observed" ? "circle" : "emptyCircle",
    symbolSize: 12,
    data: [{
      name: provenance.label,
      coord: [numericTime ? temporalAxisValue(activeTime.canonical) : activeTime.canonical, mark.value],
      value: mark.value,
      active: true,
      activeTime: activeTime.canonical,
      temporalStatus: provenance.status,
      provenance,
      itemStyle: cueItemStyle(provenance.status),
      tooltip: { formatter: provenance.label },
    }],
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
  const estimated = status !== "observed";
  return {
    borderColor: "#2456a6",
    borderWidth: 2,
    borderType: estimated ? "dashed" : "solid",
    ...(estimated ? { color: "#ffffff" } : {}),
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
