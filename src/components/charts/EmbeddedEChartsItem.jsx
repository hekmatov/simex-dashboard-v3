import React from "react";

import { createEChartsLifecycle } from "./EChartsChartView.jsx";

const MAX_RUNTIME_ERROR_LENGTH = 240;

export default function EmbeddedEChartsItem({
  model,
  runtimeError: suppliedRuntimeError = null,
}) {
  const hostRef = React.useRef(null);
  const lifecycleRef = React.useRef(null);
  const [runtimeError, setRuntimeError] = React.useState(null);
  const activeError = suppliedRuntimeError
    ?? invalidModelError(model)
    ?? runtimeError;

  React.useEffect(() => {
    const host = hostRef.current;
    if (
      !host
      || model?.kind !== "echarts"
      || typeof window === "undefined"
      || typeof document === "undefined"
    ) {
      return undefined;
    }
    const lifecycle = createEmbeddedEChartsLifecycle({
      onError: setRuntimeError,
    });
    lifecycleRef.current = lifecycle;
    lifecycle.mount(host);
    return () => {
      lifecycle.dispose();
      if (lifecycleRef.current === lifecycle) lifecycleRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!lifecycleRef.current || model?.kind !== "echarts") return;
    lifecycleRef.current.update(model);
  }, [model]);

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
    "aria-hidden": true,
  });
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
