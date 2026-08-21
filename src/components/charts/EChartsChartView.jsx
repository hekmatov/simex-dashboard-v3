import React from "react";
import * as echarts from "echarts";

import { describeAccessibilityCompanion } from "../../charting/rendering/accessibilityRows.js";
import { resolveChartSurfaceBackground } from "../../charting/presentation/chartSurfaceBackground.js";
import { titleContainerProps } from "./chartViewPresentation.js";
import { chartDescriptionVisible } from "./chartViewPresentation.js";

const MAX_RUNTIME_ERROR_LENGTH = 240;
const DEFAULT_CHART_TEXT_THEME = Object.freeze({
  textStrong: "#18334E",
  textMuted: "#49627A",
  borderSubtle: "#C7CBCF",
  gridline: "#D9DDE1",
  surfacePanel: "#FFFFFF",
  surfacePanelAlt: "#F4F5F5",
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
}) {
  const hostRef = React.useRef(null);
  const lifecycleRef = React.useRef(null);
  const [runtimeError, setRuntimeError] = React.useState(null);
  const [textTheme, setTextTheme] = React.useState(DEFAULT_CHART_TEXT_THEME);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const summaryId = React.useId();
  const title = chart.title || "Chart";
  const description = chart.description || model.option?.aria?.description || "Interactive chart.";
  const presentedModel = React.useMemo(
    () => applyEChartsPresentation(model, chart, accessibilityEnabled, textTheme),
    [model, chart, accessibilityEnabled, textTheme],
  );
  const summary = accessibilityEnabled ? summaryFor(presentedModel, chart) : null;
  const activeError = suppliedRuntimeError ?? runtimeError;

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
      dataColors: [1, 2, 3, 4, 5, 6].map((index) => (
        style.getPropertyValue(`--simex-data-${index}`).trim()
          || DEFAULT_CHART_TEXT_THEME.dataColors[index - 1]
      )),
    };
    setTextTheme((current) => sameChartTextTheme(current, next) ? current : next);
  });

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined" || typeof document === "undefined") return undefined;
    const lifecycle = createEChartsLifecycle({
      onError(error) {
        setRuntimeError(boundedRuntimeError(error));
      },
    });
    lifecycleRef.current = lifecycle;
    lifecycle.mount(host);
    return () => {
      lifecycle.dispose();
      if (lifecycleRef.current === lifecycle) lifecycleRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!lifecycleRef.current) return;
    lifecycleRef.current.update(presentedModel);
  }, [presentedModel]);

  if (activeError) {
    return React.createElement("div", {
      className: "chart-status-error",
      role: "status",
      "aria-live": "assertive",
      ...titleContainerProps(chart),
    }, boundedRuntimeError(activeError));
  }

  return React.createElement("section", {
    className: "chart-echarts-view",
    ...(accessibilityEnabled
      ? {
          role: "img",
          "aria-labelledby": titleId,
          "aria-describedby": `${descriptionId} ${summaryId}`,
        }
      : {}),
    "data-zoom-modifier": zoomEnabled
      ? presentedModel.interaction?.zoom?.modifierKey ?? "Control"
      : undefined,
    ...titleContainerProps(chart),
  },
  accessibilityEnabled
    ? React.createElement("h3", {
        id: titleId,
        className: "chart-view-title chart-view-title--visually-hidden",
      }, title)
    : null,
  chartDescriptionVisible(chart)
    ? React.createElement("p", { id: descriptionId, className: "chart-view-description" }, description)
    : accessibilityEnabled
      ? React.createElement("p", {
          id: descriptionId,
          className: "chart-view-title--visually-hidden",
        }, description)
    : null,
  accessibilityEnabled
    ? React.createElement("p", { id: summaryId, className: "chart-view-summary" }, summary)
    : null,
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
  const backgroundColor = resolveChartSurfaceBackground(
    chart?.presentation?.background,
    { themeDefault: "transparent" },
  );
  return {
    ...model,
    option: {
      ...optionWithoutBackground,
      color: Array.isArray(option.color) && option.color.length > 0 ? option.color : dataColors,
      textStyle: {
        ...(option.textStyle ?? {}),
        color: textStrong,
      },
      ...(option.title === undefined
        ? {}
        : {
            title: Array.isArray(option.title)
              ? option.title.map((title) => normalizedTitle(title, align, textStrong))
              : normalizedTitle(option.title, align, textStrong),
          }),
      ...(option.legend === undefined
        ? {}
        : { legend: normalizedLegend(option.legend, textMuted) }),
      ...(option.xAxis === undefined
        ? {}
        : { xAxis: normalizedAxis(option.xAxis, textMuted, borderSubtle, gridline) }),
      ...(option.yAxis === undefined
        ? {}
        : { yAxis: normalizedAxis(option.yAxis, textMuted, borderSubtle, gridline) }),
      ...(option.tooltip === undefined
        ? {}
        : { tooltip: normalizedTooltip(option.tooltip, textStrong, borderSubtle, surfacePanel) }),
      ...(option.series === undefined
        ? {}
        : { series: normalizedSeries(option.series, textStrong, textMuted, surfacePanelAlt) }),
      aria: {
        ...(option.aria ?? {}),
        enabled: accessibilityEnabled,
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
  onError = () => {},
} = {}) {
  let instance = null;
  let observer = null;
  let resizeListener = null;

  function cleanup(nextInstance = instance) {
    observer?.disconnect?.();
    if (resizeListener) windowTarget?.removeEventListener?.("resize", resizeListener);
    try {
      nextInstance?.dispose?.();
    } catch {}
    instance = null;
    observer = null;
    resizeListener = null;
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
          } catch (error) {
            fail(error, nextInstance);
          }
        };
        windowTarget?.addEventListener?.("resize", resizeListener);
        observer = ResizeObserverCtor ? new ResizeObserverCtor(resizeListener) : null;
        observer?.observe(host);
        instance = nextInstance;
      } catch (error) {
        fail(error, nextInstance);
      }
    },
    update(model) {
      if (!instance) return;
      try {
        registerMap(echartsApi, model?.mapRegistration);
        instance.setOption(model?.option ?? {}, {
          notMerge: true,
          replaceMerge: model?.replaceMerge,
          lazyUpdate: false,
        });
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

function normalizedTitle(value, align, textColor) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? {
        ...value,
        left: align,
        top: value.top ?? 0,
        textStyle: {
          fontSize: 16,
          fontWeight: 600,
          ...(value.textStyle ?? {}),
          color: textColor,
        },
      }
    : { text: "", left: align, top: 0 };
}

function normalizedLegend(value, textColor) {
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
    },
  };
}

function normalizedAxis(value, textColor, borderColor, gridColor) {
  const normalize = (axis = {}) => ({
    ...axis,
    axisLabel: { ...(axis.axisLabel ?? {}), color: textColor },
    nameTextStyle: { ...(axis.nameTextStyle ?? {}), color: textColor },
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

function normalizedTooltip(value, textColor, borderColor, backgroundColor) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return {
    ...value,
    backgroundColor,
    borderColor,
    textStyle: { ...(value.textStyle ?? {}), color: textColor },
  };
}

function normalizedSeries(value, textStrong, textMuted, surfaceAlt) {
  if (!Array.isArray(value)) return value;
  return value.map((series) => {
    if (!series || typeof series !== "object") return series;
    return {
      ...series,
      ...(series.label === undefined
        ? {}
        : { label: { ...series.label, color: textStrong } }),
      ...(series.detail === undefined
        ? {}
        : { detail: { ...series.detail, color: textStrong } }),
      ...(series.title === undefined
        ? {}
        : { title: { ...series.title, color: textMuted } }),
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

function summaryFor(model, chart) {
  const companion = describeAccessibilityCompanion(model.accessibility);
  if (companion) return companion;
  const semanticItems = model.semanticSummary?.items;
  if (Array.isArray(semanticItems) && semanticItems.length > 0) {
    return semanticItems.map((item) => [
      `${item.label ?? "Item"}: actual ${displayValue(item.actual)}`,
      `target ${displayValue(item.target)}`,
      item.time ? `observed ${item.time}` : null,
    ].filter(Boolean).join("; ")).join(". ");
  }
  const targetDetails = (model.option?.series ?? [])
    .flatMap((series) => Array.isArray(series.data) ? series.data : [])
    .filter((item) => item && typeof item === "object" && "target" in item)
    .map((item) => `${item.name ? `${item.name}: ` : ""}Value ${displayValue(item.value)}; target ${displayValue(item.target)}`);
  if (targetDetails.length > 0) return targetDetails.join(". ");
  const count = model.option?.series?.reduce((total, series) => (
    total + (Array.isArray(series.data) ? series.data.length : 0)
  ), 0) ?? 0;
  return count > 0
    ? `${chart.title || "Chart"} contains ${count} plotted value${count === 1 ? "" : "s"}.`
    : "Chart data is available.";
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

function displayValue(value) {
  return value === null
    || value === undefined
    || (typeof value === "number" && !Number.isFinite(value))
    ? "Unavailable"
    : String(value);
}
