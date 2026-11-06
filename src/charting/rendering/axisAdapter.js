import { validateSeriesRendererMark } from "../presentation/seriesStyleContract.js";
import { bindingField, bindingList } from "../data/bindings.js";
import { pointLabelKey, pointLabelMatcher } from "../presentation/pointLabelSelection.js";
import {
  buildEChartsDataZoom,
  rangeSelectorVisible,
} from "./zoomOptions.js";
import {
  createTemporalHoverLabelFormatter,
  valueAxisPresentation,
  xAxisPresentation,
} from "./axisPresentation.js";
import { createValueAxisTitleProjection } from "./axisTitleGraphics.js";
import {
  categoryPresentationKey, categoryDescriptors, axisSeriesDescriptors,
  resolveOrderedKeys, legendProjection, legendTooltipFormatter,
} from "../presentation/categorySeriesPresentation.js";

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
  const labels = chart.presentation?.labels;
  const pointSelection = labels?.pointSelection;
  const explicitPointLabels = labels?.visible === true && pointSelection !== undefined;
  const pointLabels = pointSelection === undefined ? undefined
    : explicitPointLabels ? pointLabelMatcher(pointSelection) : () => false;
  const categorical = !["temporal", "number"].includes(prepared.meta?.axisInterpretation);
  const sourceCategories = categoryDescriptors(prepared.marks);
  const categoryByKey = new Map(sourceCategories.map(entry => [entry.key, entry]));
  const categoryKeys = resolveOrderedKeys(sourceCategories.map(entry => entry.key), categorical ? chart.presentation?.axes?.x?.categoryOrder : undefined);
  const categories = categoryKeys.map(key => categoryByKey.get(key).value);
  const categoryIndexes = new Map(categoryKeys.map((key, index) => [key, index]));
  const sourceGroups = axisSeriesDescriptors(prepared.marks);
  const groupByKey = new Map(sourceGroups.map(group => [group.key, group]));
  const grouped = resolveOrderedKeys(sourceGroups.map(group => group.key), categorical ? seriesStyle?.order : undefined).map(key => groupByKey.get(key));
  const legendEntries = chart.presentation?.legend?.entries;
  const customLegend = legendEntries && Object.keys(legendEntries).length > 0;
  const hasSecondary = grouped.some(({ axis }) => axis === "secondary");
  const axes = chart.presentation?.axes;
  const xSettings = {
    ...legacyXAxisSettings(axes),
    ...(axes?.x ?? {}),
  };
  const temporalHoverLabels = temporal
    ? temporalHoverLabelLookup(prepared.marks)
    : null;
  const temporalHoverFormatter = temporal
    ? createTemporalHoverLabelFormatter({
      preset: xSettings.hoverLabelPreset,
      sourceFormat: prepared.meta?.axisTemporalFormat ?? chart.roles?.observation?.format,
      resolveValue: (value) => temporalHoverLabels.get(temporalAxisValue(value)) ?? value,
    })
    : null;
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
    ...(temporal ? {
      axisPointer: {
        ...xPresentation.axisPointer,
        label: {
          ...xPresentation.axisPointer?.label,
          formatter: temporalHoverFormatter,
        },
      },
    } : {}),
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
    const measureIndex = bindingList(chart.roles?.measurements)
      .findIndex(binding => bindingField(binding) === group.marks[0]?.measure);
    const type = seriesType(mark, group, measureIndex >= 0 ? measureIndex : group.sourceIndex);
    let values = temporal
      ? [...group.marks]
          .sort((left, right) => String(left.x).localeCompare(String(right.x)))
          .map((mark) => axisDataValue(
            mark,
            horizontal
              ? [mark.value, fixedTemporalTicks ? temporalAxisValue(mark.x) : mark.x]
              : [fixedTemporalTicks ? temporalAxisValue(mark.x) : mark.x, mark.value],
            activeTime,
            type,
            pointLabels,
          ))
      : categoryValues(group.marks, categoryIndexes, categories.length, activeTime, type, pointLabels);
    if (categorical && type === "bar" && grouped.length === 1 && seriesStyle?.categoryOverrides) {
      values = values.map((point, position) => {
        const color = seriesStyle.categoryOverrides[categoryKeys[position]]?.color;
        return !color || point == null ? point : {
          ...(typeof point === "object" && !Array.isArray(point) ? point : { value: point }),
          itemStyle: { color, ...(point?.itemStyle ?? {}) },
        };
      });
    }
    const color = seriesStyle?.overrides?.[group.key]?.color
      ?? (seriesStyle?.order && seriesStyle?.colors?.length ? seriesStyle.colors[group.sourceIndex % seriesStyle.colors.length] : undefined);
    const marker = type === "line"
      ? playbackMarker(group.marks, activeTime, fixedTemporalTicks)
      : undefined;
    const explicitLineLabels = type === "line" && explicitPointLabels;
    const sparseLineSymbols = explicitLineLabels && group.marks.length > 48;
    // ECharts draws line point labels on symbols. Keep symbols sparse on long lines.
    if (sparseLineSymbols) {
      values = values.map(point => point?.label?.show ? { ...point, symbol: "emptyCircle" } : point);
    }
    return {
      id: group.key,
      name: customLegend ? group.key : group.defaultLabel,
      type,
      data: values,
      xAxisIndex: horizontal ? group.axis === "secondary" ? 1 : 0 : undefined,
      yAxisIndex: horizontal ? undefined : group.axis === "secondary" ? 1 : 0,
      stack: STACKED_MARKS.has(mark) ? "total" : undefined,
      areaStyle: mark === "area" ? { opacity: 0.24 } : undefined,
      showSymbol: type === "line" && (group.marks.length <= 48 || sparseLineSymbols),
      ...(explicitLineLabels && categorical ? { showAllSymbol: true } : {}),
      ...(sparseLineSymbols ? { symbol: "none" } : {}),
      symbolSize: type === "line" ? 5 : undefined,
      label: axisLabelOption(labels, horizontal, type, prepared.marks.length),
      emphasis: { focus: "series" },
      ...(color ? { itemStyle: { color } } : {}),
      ...(type === "line" && Number.isFinite(seriesStyle?.lineWidth)
        ? { lineStyle: { width: seriesStyle.lineWidth } }
        : {}),
      ...barSeriesPresentation(type, seriesStyle, horizontal),
      ...(marker ? { markPoint: marker } : {}),
      ...(index === 0 && type === "line" && referenceLine?.visible === true
        && Number.isFinite(referenceLine.value)
        ? { markLine: referenceLineOption(referenceLine) }
        : {}),
    };
  });

  return {
    kind: "echarts",
    ...(seriesStyle?.order ? { seriesPresentation: grouped.map(({ key, sourceIndex }) => ({ key, sourceIndex })) } : {}),
    valueAxisTitleProjection,
    option: {
      title: titleOption(chart),
      aria: ariaOption(chart),
      tooltip: { trigger: "axis", ...(customLegend ? { formatter: legendTooltipFormatter(grouped, legendEntries) } : {}) },
      legend: legendProjection(legendOption(chart), grouped, legendEntries),
      ...(Array.isArray(seriesStyle?.colors)
        ? { color: [...seriesStyle.colors] }
        : {}),
      grid: {
        containLabel: true,
        left: horizontal
          ? 24
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
    orient: chart.presentation?.legend?.orientation ?? "horizontal",
    ...(Object.keys(textStyle).length > 0 ? { textStyle } : {}),
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

function axisLabelOption(labels, horizontal, seriesType, totalMarkCount) {
  if (!labels) return undefined;
  const densityLimit = seriesType === "line" ? 14 : horizontal ? 24 : 18;
  const show = labels.visible === true && (labels.pointSelection !== undefined || totalMarkCount <= densityLimit);
  const format = labelFormatter(labels);
  return {
    show,
    position: labels.position ?? (horizontal ? "right" : "top"),
    ...(show ? { formatter: format } : {}),
    ...(Number.isInteger(labels.fontSize) ? { fontSize: labels.fontSize } : {}),
  };
}

function labelFormatter(labels) {
  const unit = typeof labels.unit === "string" ? labels.unit.trim() : "";
  const format = typeof labels.format === "string" ? labels.format.trim() : "";
  if (format) return unit ? `${format}${unit}` : format;
  if (!unit) return formatSeriesLabel;
  return (params) => `${formatSeriesLabel(params)}${unit}`;
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

function barSeriesPresentation(type, seriesStyle, horizontal) {
  if (type !== "bar") return {};
  const result = {};
  if (Number.isFinite(seriesStyle?.barSeparation)) {
    result.barCategoryGap = `${seriesStyle.barSeparation}%`;
    if (horizontal && seriesStyle?.verticalFill === true) {
      result.barGap = `${seriesStyle.barSeparation}%`;
    }
  }
  if (Number.isFinite(seriesStyle?.barWidth) && !(horizontal && seriesStyle?.verticalFill === true)) {
    result.barWidth = seriesStyle.barWidth;
  }
  return result;
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

function temporalHoverLabelLookup(marks) {
  const labels = new Map();
  for (const { x } of marks) {
    const axisValue = temporalAxisValue(x);
    if (Number.isFinite(axisValue) && !labels.has(axisValue)) labels.set(axisValue, x);
  }
  return labels;
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

function categoryValues(marks, indexes, count, activeTime, type, pointLabels) {
  const values = Array.from({ length: count }, () => null);
  for (const mark of marks) {
    const index = indexes.get(mark.categoryKey ?? categoryPresentationKey(mark.x));
    if (index !== undefined) {
      values[index] = axisDataValue(mark, mark.value, activeTime, type, pointLabels);
    }
  }
  return values;
}

function axisDataValue(mark, value, activeTime, type, pointLabels) {
  const result = activeAxisDataValue(mark, value, activeTime, type);
  if (!pointLabels || mark.value == null) return result;
  return {
    ...(typeof result === "object" && !Array.isArray(result) ? result : { value: result }),
    label: { ...result?.label, show: pointLabels(pointLabelKey(mark)) },
  };
}

function activeAxisDataValue(mark, value, activeTime, type) {
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
