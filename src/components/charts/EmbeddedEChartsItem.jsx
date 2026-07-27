import React from "react";

import { createEChartsLifecycle } from "./EChartsChartView.jsx";

const MAX_RUNTIME_ERROR_LENGTH = 240;

export default function EmbeddedEChartsItem({
  model,
  runtimeError: suppliedRuntimeError = null,
  createLifecycle = createEmbeddedEChartsLifecycle,
}) {
  const hostRef = React.useRef(null);
  const lifecycleRef = React.useRef(null);
  const lifecycleFactoryRef = React.useRef(null);
  const currentModelRef = React.useRef(model);
  const failedModelRef = React.useRef(null);
  const [runtimeError, setRuntimeError] = React.useState(null);
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
    lifecycleRef.current.update(model);
  }, [activeError, createLifecycle, model]);

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
    "aria-hidden": true,
  });
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
