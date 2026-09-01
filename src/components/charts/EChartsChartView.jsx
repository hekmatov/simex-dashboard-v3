import React from "react";
import * as echarts from "echarts";

import { resolveChartSurfaceBackground } from "../../charting/presentation/chartSurfaceBackground.js";
import {
  resolveValueAxisTitleGraphics,
  valueAxisTitleGutters,
} from "../../charting/rendering/axisTitleGraphics.js";
import { useDashboardChartTheme } from "../../theme/DashboardChartThemeContext.jsx";
import ChartHeading from "./ChartHeading.jsx";
import { titleContainerProps } from "./chartViewPresentation.js";
import { mapBudgetNotice, useBuildMapBudgetSlot } from "../build/BuildMapBudgetContext.jsx";

const MAX_RUNTIME_ERROR_LENGTH = 240;
const NOOP = () => {};
const DEFAULT_CHART_TEXT_THEME = Object.freeze({
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
  const presentedModel = React.useMemo(
    () => applyEChartsPresentation(model, chart, false, textTheme),
    [model, chart, textTheme],
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
    const style = window.getComputedStyle(host);
    const next = {
      textStrong: style.getPropertyValue("--simex-text-strong").trim()
        || DEFAULT_CHART_TEXT_THEME.textStrong,
      textMuted: style.getPropertyValue("--simex-text-muted").trim()
        || DEFAULT_CHART_TEXT_THEME.textMuted,
      borderSubtle: style.getPropertyValue("--simex-border-subtle").trim()
        || DEFAULT_CHART_TEXT_THEME.borderSubtle,
      gridline: style.getPropertyValue("--simex-gridline").trim()
        || DEFAULT_CHART_TEXT_THEME.gridline,
      surfacePanel: style.getPropertyValue("--simex-surface-panel").trim()
        || DEFAULT_CHART_TEXT_THEME.surfacePanel,
      surfacePanelAlt: style.getPropertyValue("--simex-surface-panel-alt").trim()
        || DEFAULT_CHART_TEXT_THEME.surfacePanelAlt,
      bodyFont: style.getPropertyValue("--simex-style-body-font").trim()
        || DEFAULT_CHART_TEXT_THEME.bodyFont,
      headingFont: style.getPropertyValue("--simex-style-heading-font").trim()
        || DEFAULT_CHART_TEXT_THEME.headingFont,
      dataFont: style.getPropertyValue("--simex-style-data-font").trim()
        || DEFAULT_CHART_TEXT_THEME.dataFont,
      typographyKey,
      dataColors: [1, 2, 3, 4, 5, 6].map((index) => (
        style.getPropertyValue(`--simex-data-${index}`).trim()
          || DEFAULT_CHART_TEXT_THEME.dataColors[index - 1]
      )),
    };
    setTextTheme((current) => sameChartTextTheme(current, next) ? current : next);
  }, [typographyKey]);

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
    ? model.valueAxisTitleProjection
    : [];
  const valueAxisTitleTextTheme = { bodyFont, dataFont, textMuted };
  const titleGutters = valueAxisTitleGutters(valueAxisTitleProjection, valueAxisTitleTextTheme);
  const grid = normalizedGrid(option.grid, titleGutters);
  return {
    ...model,
    valueAxisTitleProjection,
    valueAxisTitleTextTheme,
    option: {
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
        : { legend: normalizedLegend(option.legend, textMuted, bodyFont) }),
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
        : { series: normalizedSeries(option.series, textStrong, textMuted, surfacePanelAlt, bodyFont, dataFont) }),
      aria: {
        ...(option.aria ?? {}),
        enabled: false,
      },
      ...(backgroundColor ? { backgroundColor } : {}),
    },
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
        valueAxisTitleProjection = Array.isArray(model?.valueAxisTitleProjection)
          ? model.valueAxisTitleProjection
          : [];
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

function normalizedLegend(value, textColor, bodyFont) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return {
    ...value,
    type: value.type ?? "scroll",
    left: value.left ?? "center",
    top: value.top ?? 32,
    width: value.width ?? "88%",
    itemWidth: value.itemWidth ?? 16,
    itemHeight: value.itemHeight ?? 10,
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

function normalizedSeries(value, textStrong, textMuted, surfaceAlt, bodyFont, dataFont) {
  if (!Array.isArray(value)) return value;
  return value.map((series) => {
    if (!series || typeof series !== "object") return series;
    return {
      ...series,
      ...(series.label === undefined
        ? {}
        : { label: { ...series.label, color: textStrong, fontFamily: dataFont } }),
      ...(series.detail === undefined
        ? {}
        : { detail: { ...series.detail, color: textStrong, fontFamily: dataFont } }),
      ...(series.axisLabel === undefined
        ? {}
        : { axisLabel: { ...series.axisLabel, fontFamily: dataFont } }),
      ...(series.title === undefined
        ? {}
        : { title: { ...series.title, color: textMuted, fontFamily: bodyFont } }),
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
