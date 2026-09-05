import React from "react";
import * as echarts from "echarts";

import { chartDescriptionVisible } from "../../charting/presentation/chartCitation.js";
import { resolveChartSurfaceBackground } from "../../charting/presentation/chartSurfaceBackground.js";
import {
  resolveValueAxisTitleGraphics,
  valueAxisTitleGutters,
} from "../../charting/rendering/axisTitleGraphics.js";
import { useDashboardChartTheme } from "../../theme/DashboardChartThemeContext.jsx";
import ChartHeading from "./ChartHeading.jsx";
import PrecisionArcGauge from "./PrecisionArcGauge.jsx";
import { titleContainerProps } from "./chartViewPresentation.js";
import { mapBudgetNotice, useBuildMapBudgetSlot } from "../build/BuildMapBudgetContext.jsx";

const MAX_RUNTIME_ERROR_LENGTH = 240;
const NOOP = () => {};
export const DEFAULT_CHART_TEXT_THEME = Object.freeze({
  textStrong: "#18334E",
  textMuted: "#49627A",
  borderSubtle: "#C7CBCF",
  gridline: "#D9DDE1",
  surfacePanel: "#FFFFFF",
  surfacePanelAlt: "#F4F5F5",
  bodyFont: "inherit",
  headingFont: "inherit",
  dataFont: "inherit",
  typographyKey: "",
  audienceTier: "",
  dataColors: Object.freeze([
    "#4E79A7",
    "#F28E2B",
    "#E15759",
    "#76B7B2",
    "#59A14F",
    "#EDC948",
  ]),
});

export default function EChartsChartView({
  model,
  chart = {},
  provenance,
  zoomEnabled = false,
  accessibilityEnabled = false,
  runtimeError: suppliedRuntimeError = null,
  mapBudgetRequest = null,
  audienceScale = null,
  onVisualChange,
}) {
  const hostRef = React.useRef(null);
  const lifecycleRef = React.useRef(null);
  const [runtimeError, setRuntimeError] = React.useState(null);
  const [textTheme, setTextTheme] = React.useState(DEFAULT_CHART_TEXT_THEME);
  const dashboardChartTheme = useDashboardChartTheme();
  const titleId = React.useId();
  const descriptionId = React.useId();
  const summaryId = React.useId();
  const typographyKey = dashboardChartTheme?.key ?? "";
  const audienceTier = audienceScale?.tier ?? "";
  const presentedModel = React.useMemo(
    () => applyEChartsPresentation(model, chart, false, textTheme, audienceScale),
    [model, chart, textTheme, audienceScale],
  );
  const activeError = suppliedRuntimeError ?? runtimeError;
  const mapBudget = useBuildMapBudgetSlot({
    ownerId: mapBudgetRequest?.ownerId ?? `unbudgeted:${chart.id ?? "chart"}`,
    kind: mapBudgetRequest?.kind ?? "dashboard",
    visible: mapBudgetRequest?.visible === true,
    active: Boolean(model?.mapRegistration) && mapBudgetRequest?.active === true,
  });
  const mapAllocated = !model?.mapRegistration || !mapBudgetRequest || mapBudget.allocated;

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;
    const next = readChartTextTheme(
      window.getComputedStyle(host),
      typographyKey,
      audienceTier,
    );
    setTextTheme((current) => sameChartTextTheme(current, next) ? current : next);
  }, [audienceTier, typographyKey]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!mapAllocated || !host || typeof window === "undefined" || typeof document === "undefined") return undefined;
    const lifecycle = createEChartsLifecycle({
      onError(error) {
        setRuntimeError(boundedRuntimeError(error));
      },
      onRender: onVisualChange,
    });
    lifecycleRef.current = lifecycle;
    lifecycle.mount(host);
    return () => {
      lifecycle.dispose();
      if (lifecycleRef.current === lifecycle) lifecycleRef.current = null;
    };
  }, [mapAllocated, onVisualChange]);

  React.useEffect(() => {
    if (!mapAllocated || !lifecycleRef.current) return;
    lifecycleRef.current.update(presentedModel);
  }, [mapAllocated, presentedModel]);

  if (activeError) {
    return React.createElement("div", {
      className: "chart-status-error",
      role: "status",
      "aria-live": "assertive",
      ...titleContainerProps(chart),
    }, boundedRuntimeError(activeError));
  }

  if (!mapAllocated) {
    return React.createElement("div", {
      className: "chart-deferred-placeholder",
      role: "status",
      "data-map-budget-status": mapBudget.status,
    },
    React.createElement("p", null, "Map preview waits for an available rendering slot."),
    React.createElement("button", { type: "button", onClick: mapBudget.activate }, "Render this map"));
  }

  const budgetNotice = mapBudgetNotice(mapBudget.status);

  if (model?.precisionGauge) {
    return React.createElement("section", {
      className: "chart-echarts-view chart-echarts-view--precision-gauge",
      ...titleContainerProps(chart),
    },
    React.createElement(ChartHeading, { chart, titleId, descriptionId }),
    React.createElement(PrecisionArcGauge, {
      gauge: model.precisionGauge,
      label: chart.title || "Gauge",
      audienceScale,
    }));
  }

  return React.createElement("section", {
    className: "chart-echarts-view",
    "data-map-budget-status": mapBudgetRequest ? mapBudget.status : undefined,
    "data-zoom-modifier": zoomEnabled
      ? presentedModel.interaction?.zoom?.modifierKey ?? "Control"
      : undefined,
    ...titleContainerProps(chart),
  },
  budgetNotice
    ? React.createElement("p", {
        className: "chart-map-budget-warning",
        role: "status",
      }, budgetNotice)
    : null,
  React.createElement(ChartHeading, { chart, titleId, descriptionId }),
  React.createElement("div", { ref: hostRef, className: "chart-echarts-host", "aria-hidden": true }));
}

export function applyEChartsPresentation(
  model = {},
  chart = {},
  accessibilityEnabled = false,
  textTheme = DEFAULT_CHART_TEXT_THEME,
  audienceScale = null,
) {
  const option = model.option && typeof model.option === "object" && !Array.isArray(model.option)
    ? model.option
    : {};
  const {
    backgroundColor: _ignoredBackground,
    ...optionWithoutBackground
  } = option;
  const align = normalizedTitleAlignment(chart?.presentation?.title?.align);
  const textStrong = normalizedTextColor(
    textTheme?.textStrong,
    DEFAULT_CHART_TEXT_THEME.textStrong,
  );
  const textMuted = normalizedTextColor(textTheme?.textMuted, textStrong);
  const borderSubtle = normalizedTextColor(textTheme?.borderSubtle, DEFAULT_CHART_TEXT_THEME.borderSubtle);
  const gridline = normalizedTextColor(textTheme?.gridline, borderSubtle);
  const surfacePanel = normalizedTextColor(textTheme?.surfacePanel, DEFAULT_CHART_TEXT_THEME.surfacePanel);
  const surfacePanelAlt = normalizedTextColor(textTheme?.surfacePanelAlt, surfacePanel);
  const dataColors = normalizedDataColors(
    textTheme?.dataColors,
    DEFAULT_CHART_TEXT_THEME.dataColors,
  );
  const bodyFont = normalizedFontFamily(textTheme?.bodyFont, DEFAULT_CHART_TEXT_THEME.bodyFont);
  const headingFont = normalizedFontFamily(textTheme?.headingFont, DEFAULT_CHART_TEXT_THEME.headingFont);
  const dataFont = normalizedFontFamily(textTheme?.dataFont, DEFAULT_CHART_TEXT_THEME.dataFont);
  const backgroundColor = resolveChartSurfaceBackground(
    chart?.presentation?.background,
    { themeDefault: "transparent" },
  );
  const valueAxisTitleProjection = Array.isArray(model.valueAxisTitleProjection)
    ? audienceScale
      ? model.valueAxisTitleProjection.map((projection) => (
          projection && typeof projection === "object"
            ? {
                ...projection,
                fontSize: audienceScale.text,
                ...(Array.isArray(projection.tickValues)
                  ? { tickValues: [...projection.tickValues] }
                  : {}),
              }
            : projection
        ))
      : model.valueAxisTitleProjection
    : [];
  const valueAxisTitleTextTheme = {
    bodyFont,
    dataFont,
    textMuted,
    ...(audienceScale ? { tickFontSize: audienceScale.text } : {}),
  };
  const titleGutters = valueAxisTitleGutters(valueAxisTitleProjection, valueAxisTitleTextTheme);
  const grid = verticallyBalancedGrid(
    normalizedGrid(option.grid, titleGutters),
    chart,
    titleGutters,
  );
  const presentedOption = {
      ...optionWithoutBackground,
      ...(grid === undefined ? {} : { grid }),
      color: Array.isArray(option.color) && option.color.length > 0 ? option.color : dataColors,
      textStyle: {
        ...(option.textStyle ?? {}),
        color: textStrong,
        fontFamily: bodyFont,
      },
      ...(option.title === undefined
        ? {}
        : {
            title: Array.isArray(option.title)
              ? option.title.map((title) => normalizedTitle(title, align, textStrong, headingFont))
              : normalizedTitle(option.title, align, textStrong, headingFont),
          }),
      ...(option.legend === undefined
        ? {}
        : {
            legend: normalizedLegend(
              option.legend,
              textMuted,
              bodyFont,
              horizontalBarsFillVertically(chart),
            ),
          }),
      ...(option.xAxis === undefined
        ? {}
        : { xAxis: normalizedAxis(option.xAxis, textMuted, borderSubtle, gridline, bodyFont, dataFont) }),
      ...(option.yAxis === undefined
        ? {}
        : { yAxis: normalizedAxis(option.yAxis, textMuted, borderSubtle, gridline, bodyFont, dataFont) }),
      ...(option.tooltip === undefined
        ? {}
        : { tooltip: normalizedTooltip(option.tooltip, textStrong, borderSubtle, surfacePanel, bodyFont) }),
      ...(option.series === undefined
        ? {}
        : {
            series: normalizedSeries(
              option.series,
              textStrong,
              textMuted,
              surfacePanelAlt,
              bodyFont,
              dataFont,
              audienceScale,
            ),
          }),
      aria: {
        ...(option.aria ?? {}),
        enabled: false,
      },
      ...(backgroundColor ? { backgroundColor } : {}),
    };
  return {
    ...model,
    valueAxisTitleProjection,
    valueAxisTitleTextTheme,
    option: audienceScale
      ? normalizeAudienceOption(presentedOption, audienceScale)
      : presentedOption,
  };
}

export function readChartTextTheme(computedStyle, typographyKey = "", audienceTier = "") {
  const token = (name, fallback) => {
    const value = computedStyle?.getPropertyValue?.(name);
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  };
  return {
    textStrong: token("--simex-text-strong", DEFAULT_CHART_TEXT_THEME.textStrong),
    textMuted: token("--simex-text-muted", DEFAULT_CHART_TEXT_THEME.textMuted),
    borderSubtle: token("--simex-border-subtle", DEFAULT_CHART_TEXT_THEME.borderSubtle),
    gridline: token("--simex-gridline", DEFAULT_CHART_TEXT_THEME.gridline),
    surfacePanel: token("--simex-surface-panel", DEFAULT_CHART_TEXT_THEME.surfacePanel),
    surfacePanelAlt: token("--simex-surface-panel-alt", DEFAULT_CHART_TEXT_THEME.surfacePanelAlt),
    bodyFont: token("--simex-style-body-font", DEFAULT_CHART_TEXT_THEME.bodyFont),
    headingFont: token("--simex-style-heading-font", DEFAULT_CHART_TEXT_THEME.headingFont),
    dataFont: token("--simex-style-data-font", DEFAULT_CHART_TEXT_THEME.dataFont),
    typographyKey,
    audienceTier,
    dataColors: [1, 2, 3, 4, 5, 6].map((index) => (
      token(`--simex-data-${index}`, DEFAULT_CHART_TEXT_THEME.dataColors[index - 1])
    )),
  };
}

export function sameChartTextTheme(current = {}, next = {}) {
  const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
  for (const key of keys) {
    if (key === "dataColors") {
      const currentColors = current.dataColors ?? [];
      const nextColors = next.dataColors ?? [];
      if (
        currentColors.length !== nextColors.length
        || currentColors.some((color, index) => color !== nextColors[index])
      ) return false;
      continue;
    }
    if (current[key] !== next[key]) return false;
  }
  return true;
}

const AUDIENCE_TEXT_ROLE_KEYS = new Set([
  "axisLabel",
  "axisName",
  "dayLabel",
  "edgeLabel",
  "endLabel",
  "label",
  "monthLabel",
  "nameTextStyle",
  "subtextStyle",
  "textStyle",
  "upperLabel",
  "yearLabel",
]);

function normalizeAudienceOption(option, scale) {
  const normalized = normalizeAudienceTextTree(option, scale);
  const withAxisSpacing = normalizeAudienceAxisSpacing(normalized, scale);
  if (withAxisSpacing.legend === undefined) return withAxisSpacing;
  const normalizeLegend = (legend) => (
    legend && typeof legend === "object" && !Array.isArray(legend)
      ? {
          ...legend,
          itemWidth: Math.round(scale.text * 1.5),
          itemHeight: scale.text,
          itemGap: scale.text,
        }
      : legend
  );
  return {
    ...withAxisSpacing,
    legend: Array.isArray(withAxisSpacing.legend)
      ? withAxisSpacing.legend.map(normalizeLegend)
      : normalizeLegend(withAxisSpacing.legend),
  };
}

function normalizeAudienceAxisSpacing(option, scale) {
  const axisKeys = ["xAxis", "yAxis", "singleAxis", "parallelAxis", "angleAxis", "radiusAxis"];
  const normalizeAxis = (axis) => {
    if (!isPlainObject(axis)) return axis;
    const labelMargin = Math.round(scale.text * 0.55);
    const nameGap = Math.round(scale.text * 1.7);
    return {
      ...axis,
      axisLabel: {
        ...(axis.axisLabel ?? {}),
        fontSize: scale.text,
        margin: Number.isFinite(axis.axisLabel?.margin)
          ? Math.max(axis.axisLabel.margin, labelMargin)
          : labelMargin,
      },
      nameTextStyle: {
        ...(axis.nameTextStyle ?? {}),
        fontSize: scale.text,
      },
      nameGap: Number.isFinite(axis.nameGap) ? Math.max(axis.nameGap, nameGap) : nameGap,
    };
  };
  return Object.fromEntries(Object.entries(option).map(([key, value]) => [
    key,
    axisKeys.includes(key)
      ? Array.isArray(value) ? value.map(normalizeAxis) : normalizeAxis(value)
      : value,
  ]));
}

function normalizeAudienceTextTree(value, scale, path = []) {
  if (Array.isArray(value)) {
    return value.map((child, index) => normalizeAudienceTextTree(child, scale, [...path, index]));
  }
  if (!isPlainObject(value)) return value;
  const normalized = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "renderItem" && value.type === "custom" && typeof child === "function") {
      normalized[key] = wrapAudienceRenderItem(child, scale.text);
      continue;
    }
    const next = normalizeAudienceTextTree(child, scale, [...path, key]);
    const roleSize = audienceTextRoleSize(key, path, value, scale);
    normalized[key] = roleSize === null ? next : withAudienceFontSize(next, roleSize);
  }
  return normalized;
}

function audienceTextRoleSize(key, path, parent, scale) {
  if (key === "detail" && path.includes("series")) return scale.value;
  if (key === "title" && path.includes("series")) return scale.text;
  if (key === "style" && visibleGraphicText(parent)) return scale.text;
  if (!AUDIENCE_TEXT_ROLE_KEYS.has(key)) return null;
  if (key === "textStyle" && path[0] === "title") return scale.title;
  return scale.text;
}

function withAudienceFontSize(value, fontSize) {
  if (Array.isArray(value)) return value.map((entry) => withAudienceFontSize(entry, fontSize));
  if (!isPlainObject(value)) return value;
  return {
    ...value,
    fontSize,
    ...(isPlainObject(value.rich)
      ? {
          rich: Object.fromEntries(Object.entries(value.rich).map(([key, style]) => [
            key,
            isPlainObject(style) ? { ...style, fontSize } : style,
          ])),
        }
      : {}),
  };
}

function wrapAudienceRenderItem(renderItem, textSize) {
  return function audienceRenderItem(...args) {
    return normalizeCustomGraphic(renderItem.apply(this, args), textSize);
  };
}

function normalizeCustomGraphic(value, textSize) {
  if (Array.isArray(value)) return value.map((child) => normalizeCustomGraphic(child, textSize));
  if (!isPlainObject(value)) return value;
  const normalized = Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    normalizeCustomGraphic(child, textSize),
  ]));
  if (isPlainObject(normalized.style) && visibleGraphicText(normalized)) {
    normalized.style = withAudienceFontSize(normalized.style, textSize);
  }
  return normalized;
}

function visibleGraphicText(value) {
  return value?.type === "text"
    || (isPlainObject(value?.style) && Object.hasOwn(value.style, "text"));
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function createEChartsLifecycle({
  echartsApi = echarts,
  windowTarget = typeof window === "undefined" ? null : window,
  ResizeObserverCtor = typeof ResizeObserver === "undefined" ? null : ResizeObserver,
  onError = NOOP,
  onRender = NOOP,
} = {}) {
  let instance = null;
  let observer = null;
  let resizeListener = null;
  let finishedListener = null;
  let valueAxisTitleProjection = [];
  let valueAxisTitleTextTheme = {};
  let valueAxisTitleGraphicIds = [];

  function replaceValueAxisTitleGraphics(nextInstance = instance) {
    if (!nextInstance || (valueAxisTitleProjection.length === 0 && valueAxisTitleGraphicIds.length === 0)) return;
    const gridRect = resolvedGridRect(nextInstance);
    if (!gridRect) return;
    const graphics = resolveValueAxisTitleGraphics({
      projection: valueAxisTitleProjection,
      gridRect,
      textTheme: valueAxisTitleTextTheme,
    });
    const nextIds = graphics.map(({ id }) => id);
    const removals = valueAxisTitleGraphicIds
      .filter((id) => !nextIds.includes(id))
      .map((id) => ({ id, $action: "remove" }));
    nextInstance.setOption({
      graphic: [
        ...removals,
        ...graphics.map((graphic) => ({ ...graphic, $action: "replace" })),
      ],
    }, { lazyUpdate: false });
    valueAxisTitleGraphicIds = nextIds;
  }

  function clearValueAxisTitleGraphics(nextProjection, nextInstance = instance) {
    if (!nextInstance || valueAxisTitleGraphicIds.length === 0) return;
    const nextIds = new Set((Array.isArray(nextProjection) ? nextProjection : [])
      .filter((projection) => projection && typeof projection === "object")
      .map(({ id }) => `simex-value-axis-title-${id === "secondary" ? "secondary" : "primary"}`));
    const staleIds = valueAxisTitleGraphicIds.filter((id) => !nextIds.has(id));
    if (staleIds.length === 0) return;
    nextInstance.setOption({
      graphic: staleIds.map((id) => ({ id, $action: "remove" })),
    }, { lazyUpdate: false });
    valueAxisTitleGraphicIds = valueAxisTitleGraphicIds.filter((id) => nextIds.has(id));
  }

  function cleanup(nextInstance = instance) {
    observer?.disconnect?.();
    if (resizeListener) windowTarget?.removeEventListener?.("resize", resizeListener);
    if (finishedListener) nextInstance?.off?.("finished", finishedListener);
    try {
      nextInstance?.dispose?.();
    } catch {}
    instance = null;
    observer = null;
    resizeListener = null;
    finishedListener = null;
    valueAxisTitleProjection = [];
    valueAxisTitleTextTheme = {};
    valueAxisTitleGraphicIds = [];
  }

  function fail(error, nextInstance = instance) {
    cleanup(nextInstance);
    onError(normalizeError(error));
  }

  return {
    mount(host) {
      if (instance || !host) return;
      let nextInstance = null;
      try {
        nextInstance = echartsApi.getInstanceByDom(host)
          ?? echartsApi.init(host, undefined, { renderer: "canvas" });
        resizeListener = () => {
          try {
            nextInstance?.resize();
            replaceValueAxisTitleGraphics(nextInstance);
          } catch (error) {
            fail(error, nextInstance);
          }
        };
        windowTarget?.addEventListener?.("resize", resizeListener);
        observer = ResizeObserverCtor ? new ResizeObserverCtor(resizeListener) : null;
        observer?.observe(host);
        finishedListener = () => onRender();
        nextInstance?.on?.("finished", finishedListener);
        instance = nextInstance;
      } catch (error) {
        fail(error, nextInstance);
      }
    },
    update(model) {
      if (!instance) return;
      try {
        registerMap(echartsApi, model?.mapRegistration);
        const nextValueAxisTitleProjection = Array.isArray(model?.valueAxisTitleProjection)
          ? model.valueAxisTitleProjection
          : [];
        clearValueAxisTitleGraphics(nextValueAxisTitleProjection, instance);
        valueAxisTitleProjection = nextValueAxisTitleProjection;
        valueAxisTitleTextTheme = model?.valueAxisTitleTextTheme ?? {};
        instance.setOption(model?.option ?? {}, {
          notMerge: true,
          replaceMerge: model?.replaceMerge,
          lazyUpdate: false,
        });
        replaceValueAxisTitleGraphics(instance);
      } catch (error) {
        fail(error);
      }
    },
    dispose() {
      cleanup();
    },
  };
}

function registerMap(echartsApi, registration) {
  if (registration?.name && registration.geoJson) {
    echartsApi.registerMap(registration.name, registration.geoJson);
  }
}

function normalizedTitle(value, align, textColor, headingFont) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? {
        ...value,
        show: false,
        left: align,
        top: value.top ?? 0,
        textStyle: {
          fontSize: 16,
          fontWeight: 600,
          ...(value.textStyle ?? {}),
          color: textColor,
          fontFamily: headingFont,
        },
      }
    : {
        text: "",
        show: false,
        left: align,
        top: 0,
        textStyle: { color: textColor, fontFamily: headingFont },
      };
}

function normalizedLegend(value, textColor, bodyFont, compactTop = false) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const fontSize = Number.isFinite(value.textStyle?.fontSize) ? value.textStyle.fontSize : 11;
  return {
    ...value,
    type: value.type ?? "scroll",
    left: value.left ?? "center",
    top: value.top ?? (compactTop ? 12 : 32),
    width: value.width ?? "88%",
    itemWidth: value.itemWidth ?? Math.round((fontSize * 16) / 11),
    itemHeight: value.itemHeight ?? Math.round((fontSize * 10) / 11),
    textStyle: {
      fontSize: 11,
      ...(value.textStyle ?? {}),
      color: textColor,
      fontFamily: bodyFont,
    },
  };
}

function normalizedAxis(value, textColor, borderColor, gridColor, bodyFont, dataFont) {
  const normalize = (axis = {}) => ({
    ...axis,
    axisLabel: { ...(axis.axisLabel ?? {}), color: textColor, fontFamily: dataFont },
    nameTextStyle: { ...(axis.nameTextStyle ?? {}), color: textColor, fontFamily: bodyFont },
    axisLine: {
      ...(axis.axisLine ?? {}),
      lineStyle: { ...(axis.axisLine?.lineStyle ?? {}), color: borderColor },
    },
    axisTick: {
      ...(axis.axisTick ?? {}),
      lineStyle: { ...(axis.axisTick?.lineStyle ?? {}), color: borderColor },
    },
    splitLine: {
      ...(axis.splitLine ?? {}),
      lineStyle: { ...(axis.splitLine?.lineStyle ?? {}), color: gridColor },
    },
  });
  return Array.isArray(value) ? value.map(normalize) : normalize(value);
}

function normalizedTooltip(value, textColor, borderColor, backgroundColor, bodyFont) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return {
    ...value,
    backgroundColor,
    borderColor,
    textStyle: { ...(value.textStyle ?? {}), color: textColor, fontFamily: bodyFont },
  };
}

function normalizedSeries(value, textStrong, textMuted, surfaceAlt, bodyFont, dataFont, audienceScale) {
  if (!Array.isArray(value)) return value;
  return value.map((series) => {
    if (!series || typeof series !== "object") return series;
    const materializeAudienceGaugeText = series.type === "gauge" && audienceScale;
    return {
      ...series,
      ...(series.label === undefined
        ? {}
        : { label: { ...series.label, color: textStrong, fontFamily: dataFont } }),
      ...(series.detail === undefined && !materializeAudienceGaugeText
        ? {}
        : {
            detail: {
              ...(series.detail ?? {}),
              color: textStrong,
              fontFamily: dataFont,
              ...(materializeAudienceGaugeText ? { fontSize: audienceScale.value } : {}),
            },
          }),
      ...(series.axisLabel === undefined && !materializeAudienceGaugeText
        ? {}
        : {
            axisLabel: {
              ...(series.axisLabel ?? {}),
              fontFamily: dataFont,
              ...(materializeAudienceGaugeText ? { fontSize: audienceScale.text } : {}),
            },
          }),
      ...(series.title === undefined && !materializeAudienceGaugeText
        ? {}
        : {
            title: {
              ...(series.title ?? {}),
              color: textMuted,
              fontFamily: bodyFont,
              ...(materializeAudienceGaugeText ? { fontSize: audienceScale.text } : {}),
            },
          }),
      ...(series.type === "gauge" && series.axisLine?.lineStyle?.color === undefined
        ? {
            axisLine: {
              ...(series.axisLine ?? {}),
              lineStyle: { ...(series.axisLine?.lineStyle ?? {}), color: [[1, surfaceAlt]] },
            },
          }
        : {}),
    };
  });
}
function normalizedTitleAlignment(value) {
  return ["left", "center", "right"].includes(value) ? value : "left";
}

function normalizedTextColor(value, fallback) {
  const color = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : fallback;
}

function normalizedDataColors(value, fallback) {
  if (!Array.isArray(value) || value.length === 0) return [...fallback];
  const colors = value
    .map((color) => normalizedTextColor(color, ""))
    .filter(Boolean);
  return colors.length > 0 ? colors : [...fallback];
}

function boundedRuntimeError(error) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "This chart could not be rendered.";
  const normalized = message.trim() || "This chart could not be rendered.";
  return normalized.length <= MAX_RUNTIME_ERROR_LENGTH
    ? normalized
    : `${normalized.slice(0, MAX_RUNTIME_ERROR_LENGTH - 1)}…`;
}

function normalizeError(error) {
  return error instanceof Error ? error : new Error(boundedRuntimeError(error));
}

function normalizedGrid(value, titleGutters) {
  const normalize = (grid) => {
    if (!grid || typeof grid !== "object" || Array.isArray(grid)) return grid;
    return {
      ...grid,
      left: maximumPixelGutter(grid.left, titleGutters.left),
      right: maximumPixelGutter(grid.right, titleGutters.right),
      top: maximumPixelGutter(grid.top, titleGutters.top),
      bottom: maximumPixelGutter(grid.bottom, titleGutters.bottom),
    };
  };
  return Array.isArray(value) ? value.map(normalize) : normalize(value);
}

function verticallyBalancedGrid(value, chart, titleGutters = {}) {
  if (horizontalBarsFillVertically(chart)) {
    const fill = (grid) => {
      if (!grid || typeof grid !== "object" || Array.isArray(grid)) return grid;
      return {
        ...grid,
        top: compactGridGutter(grid.top, titleGutters.top, 44),
        bottom: compactGridGutter(grid.bottom, titleGutters.bottom, 32),
      };
    };
    return Array.isArray(value) ? value.map(fill) : fill(value);
  }
  if (chartDescriptionVisible(chart) && String(chart?.description ?? "").trim()) return value;
  const balance = (grid) => {
    if (!grid || typeof grid !== "object" || Array.isArray(grid)) return grid;
    if (!Number.isFinite(grid.top) || !Number.isFinite(grid.bottom)) return grid;
    const gutter = Math.max(grid.top, grid.bottom);
    return { ...grid, top: gutter, bottom: gutter };
  };
  return Array.isArray(value) ? value.map(balance) : balance(value);
}

function compactGridGutter(current, required, target) {
  if (!Number.isFinite(current)) return current;
  return Math.min(current, Math.max(Number.isFinite(required) ? required : 0, target));
}

function horizontalBarsFillVertically(chart) {
  return chart?.presentation?.series?.verticalFill === true
    && ["horizontalBar", "horizontalStackedBar"].includes(chart?.typeId);
}

function maximumPixelGutter(current, required) {
  return Number.isFinite(current) ? Math.max(current, required) : current;
}

function resolvedGridRect(instance) {
  try {
    const grid = instance.getModel?.().getComponent?.("grid", 0);
    const rect = grid?.coordinateSystem?.getRect?.();
    if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) return null;
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  } catch {
    return null;
  }
}

function normalizedFontFamily(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
