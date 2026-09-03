import React from "react";

import { useDashboardChartTheme } from "../../theme/DashboardChartThemeContext.jsx";
import {
  applyEChartsPresentation,
  createEChartsLifecycle,
  DEFAULT_CHART_TEXT_THEME,
  readChartTextTheme,
  sameChartTextTheme,
} from "./EChartsChartView.jsx";

const MAX_RUNTIME_ERROR_LENGTH = 240;

export default function EmbeddedEChartsItem({
  model,
  audienceScale = null,
  runtimeError: suppliedRuntimeError = null,
  createLifecycle = createEmbeddedEChartsLifecycle,
}) {
  const hostRef = React.useRef(null);
  const lifecycleRef = React.useRef(null);
  const lifecycleFactoryRef = React.useRef(null);
  const currentModelRef = React.useRef(model);
  const failedModelRef = React.useRef(null);
  const [runtimeError, setRuntimeError] = React.useState(null);
  const [textTheme, setTextTheme] = React.useState(DEFAULT_CHART_TEXT_THEME);
  const dashboardChartTheme = useDashboardChartTheme();
  const typographyKey = dashboardChartTheme?.key ?? "";
  const audienceTier = audienceScale?.tier ?? "";
  const modelError = invalidModelError(model);
  const activeError = suppliedRuntimeError
    ?? modelError
    ?? runtimeError;
  currentModelRef.current = model;

  React.useEffect(() => {
    if (
      runtimeError
      && suppliedRuntimeError === null
      && modelError === null
      && failedModelRef.current !== model
    ) {
      failedModelRef.current = null;
      setRuntimeError(null);
    }
  }, [model, modelError, runtimeError, suppliedRuntimeError]);

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
    if (
      !host
      || activeError
      || model?.kind !== "echarts"
      || typeof window === "undefined"
      || typeof document === "undefined"
    ) {
      disposeCurrentLifecycle(lifecycleRef, lifecycleFactoryRef);
      return;
    }

    if (
      !lifecycleRef.current
      || lifecycleFactoryRef.current !== createLifecycle
    ) {
      disposeCurrentLifecycle(lifecycleRef, lifecycleFactoryRef);
      const lifecycle = createLifecycle({
        onError(error) {
          failedModelRef.current = currentModelRef.current;
          setRuntimeError(boundedEmbeddedError(error));
        },
      });
      lifecycleRef.current = lifecycle;
      lifecycleFactoryRef.current = createLifecycle;
      lifecycle.mount(host);
    }
    updateEmbeddedEChartsLifecycle(
      lifecycleRef.current,
      model,
      textTheme,
      audienceScale,
    );
  }, [activeError, audienceScale, createLifecycle, model, textTheme]);

  React.useEffect(() => () => {
    disposeCurrentLifecycle(lifecycleRef, lifecycleFactoryRef);
  }, []);

  if (activeError) {
    return React.createElement("p", {
      className: "chart-embedded-echarts-error",
      role: "status",
      "aria-live": "assertive",
    }, boundedEmbeddedError(activeError));
  }

  return React.createElement("div", {
    ref: hostRef,
    className: "chart-embedded-echarts-host",
    "data-audience-scale-tier": audienceScale?.tier,
    "aria-hidden": true,
  });
}

export function updateEmbeddedEChartsLifecycle(
  lifecycle,
  model,
  textTheme = DEFAULT_CHART_TEXT_THEME,
  audienceScale = null,
) {
  const presented = applyEChartsPresentation(
    model,
    {},
    false,
    textTheme,
    audienceScale,
  );
  lifecycle?.update?.(presented);
  return presented;
}

function disposeCurrentLifecycle(lifecycleRef, lifecycleFactoryRef) {
  lifecycleRef.current?.dispose();
  lifecycleRef.current = null;
  lifecycleFactoryRef.current = null;
}

export function createEmbeddedEChartsLifecycle(options = {}) {
  const {
    onError = () => {},
    ...lifecycleOptions
  } = options;
  return createEChartsLifecycle({
    ...lifecycleOptions,
    onError(error) {
      onError(boundedEmbeddedError(error));
    },
  });
}

function invalidModelError(model) {
  return model?.kind === "echarts"
    ? null
    : "This collection item could not be rendered.";
}

function boundedEmbeddedError(error) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "This collection item could not be rendered.";
  const normalized = message.trim() || "This collection item could not be rendered.";
  return normalized.length <= MAX_RUNTIME_ERROR_LENGTH
    ? normalized
    : `${normalized.slice(0, MAX_RUNTIME_ERROR_LENGTH - 1)}…`;
}
