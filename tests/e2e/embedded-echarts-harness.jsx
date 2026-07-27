import React from "react";
import { createRoot } from "react-dom/client";

import EmbeddedEChartsItem, {
  createEmbeddedEChartsLifecycle,
} from "../../src/components/charts/EmbeddedEChartsItem.jsx";
import ImageChartView from "../../src/components/charts/ImageChartView.jsx";
import ZoomGuard from "../../src/components/charts/ZoomGuard.jsx";

const events = [];
const activeInstances = new Set();
const activeListeners = new Set();
const activeObservers = new Set();
let instanceSequence = 0;
let observerSequence = 0;
let wheelListenerAdds = 0;
let wheelListenerRemoves = 0;
let wheelTarget = null;
const activeWheelListeners = new Set();
const rendererWheelEvents = [];
const nativeAddEventListener = EventTarget.prototype.addEventListener;
const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;

EventTarget.prototype.addEventListener = function addHarnessListener(type, listener, options) {
  if (type === "wheel" && this?.classList?.contains("chart-zoom-guard")) {
    wheelListenerAdds += 1;
    activeWheelListeners.add(listener);
  }
  return nativeAddEventListener.call(this, type, listener, options);
};

EventTarget.prototype.removeEventListener = function removeHarnessListener(type, listener, options) {
  if (type === "wheel" && this?.classList?.contains("chart-zoom-guard")) {
    wheelListenerRemoves += 1;
    activeWheelListeners.delete(listener);
  }
  return nativeRemoveEventListener.call(this, type, listener, options);
};

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

function zoomSnapshot() {
  return {
    activeWheelListeners: activeWheelListeners.size,
    wheelListenerAdds,
    wheelListenerRemoves,
    rendererWheelEvents: [...rendererWheelEvents],
  };
}

function dispatchWheel(init = {}) {
  const event = new WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    ctrlKey: init.ctrlKey === true,
    deltaY: Number.isFinite(init.deltaY) ? init.deltaY : 0,
  });
  const dispatchResult = wheelTarget?.dispatchEvent(event) ?? true;
  return {
    defaultPrevented: event.defaultPrevented,
    dispatchResult,
  };
}

window.__embeddedEChartsHarness = { snapshot, zoomSnapshot, dispatchWheel };

function Harness() {
  const [mounted, setMounted] = React.useState(true);
  const [zoomMounted, setZoomMounted] = React.useState(true);
  const [zoomRevision, setZoomRevision] = React.useState(0);
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
    React.createElement("button", {
      type: "button",
      onClick: () => setZoomRevision((current) => current + 1),
    }, "Rerender zoom guard"),
    React.createElement("button", {
      type: "button",
      onClick: () => setZoomMounted(false),
    }, "Unmount zoom guard"),
    mounted
      ? React.createElement(EmbeddedEChartsItem, {
          model,
          createLifecycle: lifecycleFactory,
        })
      : null,
    zoomMounted
      ? React.createElement(
          ZoomGuard,
          null,
          React.createElement(ZoomRendererTarget, {
            revision: zoomRevision,
          }),
        )
      : null,
    React.createElement("div", {
      "aria-hidden": "true",
      style: { height: "1600px" },
    }),
  );
}

function ZoomRendererTarget({ revision }) {
  const targetRef = React.useRef(null);
  React.useEffect(() => {
    const target = targetRef.current;
    const eventTarget = target.querySelector(".chart-image-view");
    wheelTarget = eventTarget;
    const listener = (event) => {
      rendererWheelEvents.push({
        ctrlKey: event.ctrlKey,
        defaultPrevented: event.defaultPrevented,
      });
    };
    target.addEventListener("wheel", listener);
    return () => {
      target.removeEventListener("wheel", listener);
      if (wheelTarget === eventTarget) wheelTarget = null;
    };
  }, []);
  return React.createElement(
    "div",
    {
      ref: targetRef,
      "data-zoom-revision": revision,
    },
    React.createElement(ImageChartView, {
      chart: {
        title: "Zoomable map image",
        interaction: { zoom: { enabled: true } },
      },
      model: {
        src: "/showcase/section-1-collage.svg",
        alt: "Zoom test",
        fit: "contain",
      },
    }),
  );
}

createRoot(document.getElementById("root")).render(React.createElement(Harness));
