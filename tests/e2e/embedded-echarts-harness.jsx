import React from "react";
import { createRoot } from "react-dom/client";

import EmbeddedEChartsItem, {
  createEmbeddedEChartsLifecycle,
} from "../../src/components/charts/EmbeddedEChartsItem.jsx";

const events = [];
const activeInstances = new Set();
const activeListeners = new Set();
const activeObservers = new Set();
let instanceSequence = 0;
let observerSequence = 0;

const echartsApi = {
  getInstanceByDom() {
    return null;
  },
  init() {
    const instanceId = ++instanceSequence;
    const instance = {
      setOption(option) {
        events.push(`update:${instanceId}:${option.id}`);
        if (option.id === "runtime-fail") {
          throw new Error("test runtime failure");
        }
      },
      resize() {},
      dispose() {
        events.push(`dispose:${instanceId}`);
        activeInstances.delete(instanceId);
      },
    };
    events.push(`mount:${instanceId}`);
    activeInstances.add(instanceId);
    return instance;
  },
  registerMap() {},
};

const windowTarget = {
  addEventListener(type, listener) {
    if (type !== "resize") return;
    events.push("listen");
    activeListeners.add(listener);
  },
  removeEventListener(type, listener) {
    if (type !== "resize") return;
    events.push("unlisten");
    activeListeners.delete(listener);
  },
};

class HarnessResizeObserver {
  constructor() {
    this.id = ++observerSequence;
  }

  observe() {
    events.push(`observe:${this.id}`);
    activeObservers.add(this.id);
  }

  disconnect() {
    events.push(`disconnect:${this.id}`);
    activeObservers.delete(this.id);
  }
}

function lifecycleFactory(options) {
  return createEmbeddedEChartsLifecycle({
    echartsApi,
    windowTarget,
    ResizeObserverCtor: HarnessResizeObserver,
    ...options,
  });
}

function snapshot() {
  return {
    events: [...events],
    activeInstances: activeInstances.size,
    activeListeners: activeListeners.size,
    activeObservers: activeObservers.size,
  };
}

window.__embeddedEChartsHarness = { snapshot };

function Harness() {
  const [mounted, setMounted] = React.useState(true);
  const [model, setModel] = React.useState({
    kind: "echarts",
    option: { id: "first" },
  });

  return React.createElement(
    React.Fragment,
    null,
    React.createElement("button", {
      type: "button",
      onClick: () => setModel({ kind: "error", message: "invalid" }),
    }, "Invalid model"),
    React.createElement("button", {
      type: "button",
      onClick: () => setModel({ kind: "echarts", option: { id: "second" } }),
    }, "Valid model"),
    React.createElement("button", {
      type: "button",
      onClick: () => setModel({
        kind: "echarts",
        option: { id: "runtime-fail" },
      }),
    }, "Runtime failure"),
    React.createElement("button", {
      type: "button",
      onClick: () => setModel({
        kind: "echarts",
        option: { id: "recovered" },
      }),
    }, "Recover"),
    React.createElement("button", {
      type: "button",
      onClick: () => setMounted(false),
    }, "Unmount"),
    mounted
      ? React.createElement(EmbeddedEChartsItem, {
          model,
          createLifecycle: lifecycleFactory,
        })
      : null,
  );
}

createRoot(document.getElementById("root")).render(React.createElement(Harness));
