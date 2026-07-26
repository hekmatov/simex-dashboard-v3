import React from "react";
import * as echarts from "echarts";

import { describeAccessibilityCompanion } from "../../charting/rendering/accessibilityRows.js";
import { titleContainerProps } from "./chartViewPresentation.js";

const MAX_RUNTIME_ERROR_LENGTH = 240;

export default function EChartsChartView({
  model,
  chart = {},
  provenance,
  runtimeError: suppliedRuntimeError = null,
}) {
  const hostRef = React.useRef(null);
  const lifecycleRef = React.useRef(null);
  const [runtimeError, setRuntimeError] = React.useState(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const summaryId = React.useId();
  const title = chart.title || "Chart";
  const description = chart.description || model.option?.aria?.description || "Interactive chart.";
  const summary = summaryFor(model, chart);
  const activeError = suppliedRuntimeError ?? runtimeError;

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
    lifecycleRef.current.update(model);
  }, [model]);

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
    role: "img",
    "aria-labelledby": titleId,
    "aria-describedby": `${descriptionId} ${summaryId}`,
    "data-zoom-modifier": model.interaction?.zoom?.modifierKey
      ?? (chart.interaction?.zoom?.enabled === true ? "Control" : undefined),
    ...titleContainerProps(chart),
  },
  React.createElement("h3", {
    id: titleId,
    className: "chart-view-title chart-view-title--visually-hidden",
  }, title),
  React.createElement("p", { id: descriptionId, className: "chart-view-description" }, description),
  React.createElement("p", { id: summaryId, className: "chart-view-summary" }, summary),
  React.createElement("p", { className: "chart-view-provenance" }, `Source: ${provenance?.label ?? "Unavailable"}`),
  provenance?.capturedAt ? React.createElement("p", { className: "chart-view-provenance" }, `Captured: ${provenance.capturedAt}`) : null,
  React.createElement("div", { ref: hostRef, className: "chart-echarts-host", "aria-hidden": true }));
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
