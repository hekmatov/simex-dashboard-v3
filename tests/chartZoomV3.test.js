import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const viteModuleUrl = import.meta.resolve("vite");
register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    const { transformWithEsbuild } = await import(${JSON.stringify(viteModuleUrl)});
    const transformed = await transformWithEsbuild(loaded.source.toString(), url, { loader: "jsx", format: "esm" });
    return { format: "module", source: transformed.code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const {
  default: ZoomGuard,
  attachZoomGuard,
  createZoomGuardController,
  wheelZoomDecision,
} = await import("../src/components/charts/ZoomGuard.jsx");
const {
  chartZoomEnabled,
} = await import("../src/components/charts/ChartView.jsx");
const {
  nextImageZoomScale,
} = await import("../src/components/charts/ImageChartView.jsx");

test("plain wheel input is blocked from the chart without blocking page scroll", () => {
  assert.deepEqual(wheelZoomDecision({ ctrlKey: false }), {
    allowChartZoom: false,
    preventDefault: false,
    showHint: true,
  });
  assert.deepEqual(wheelZoomDecision(), {
    allowChartZoom: false,
    preventDefault: false,
    showHint: true,
  });
});

test("Ctrl-wheel reaches the chart zoom handler and owns the browser gesture", () => {
  assert.deepEqual(wheelZoomDecision({ ctrlKey: true }), {
    allowChartZoom: true,
    preventDefault: true,
    showHint: false,
  });
  assert.deepEqual(wheelZoomDecision({ ctrlKey: "true" }), {
    allowChartZoom: false,
    preventDefault: false,
    showHint: true,
  });
});

test("the guard shows one hint per continuous hover or focus session", () => {
  const hintStates = [];
  const calls = [];
  const controller = createZoomGuardController({
    onHintChange(value) {
      hintStates.push(value);
    },
  });
  const event = {
    ctrlKey: false,
    stopPropagation() {
      calls.push("stop");
    },
    preventDefault() {
      calls.push("prevent");
    },
  };

  controller.pointerEnter();
  controller.handleWheel(event);
  controller.handleWheel(event);
  assert.deepEqual(hintStates, [true]);
  assert.deepEqual(calls, ["stop", "stop"]);

  controller.pointerLeave();
  controller.focus();
  controller.handleWheel(event);
  controller.handleWheel(event);
  assert.deepEqual(hintStates, [true, false, true]);

  controller.blur();
  controller.pointerEnter();
  controller.handleWheel({
    ctrlKey: true,
    stopPropagation() {
      calls.push("ctrl-stop");
    },
    preventDefault() {
      calls.push("ctrl-prevent");
    },
  });
  assert.deepEqual(calls, ["stop", "stop", "stop", "stop", "ctrl-prevent"]);
  assert.deepEqual(hintStates, [true, false, true, false]);
});

test("the native guard attaches one non-passive capture listener and removes that exact listener once", () => {
  const calls = [];
  const root = {
    addEventListener(type, listener, options) {
      calls.push({ operation: "add", type, listener, options });
    },
    removeEventListener(type, listener, options) {
      calls.push({ operation: "remove", type, listener, options });
    },
  };
  const controller = createZoomGuardController();
  const detach = attachZoomGuard(root, controller);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].operation, "add");
  assert.equal(calls[0].type, "wheel");
  assert.deepEqual(calls[0].options, { capture: true, passive: false });

  detach();
  detach();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].operation, "remove");
  assert.equal(calls[1].type, "wheel");
  assert.equal(calls[1].listener, calls[0].listener);
  assert.equal(calls[1].options, calls[0].options);
});

test("hostile wheel objects fail closed without invoking unusable callbacks", () => {
  const hostile = {};
  Object.defineProperty(hostile, "ctrlKey", {
    get() {
      throw new Error("hostile getter");
    },
  });
  assert.deepEqual(wheelZoomDecision(hostile), {
    allowChartZoom: false,
    preventDefault: false,
    showHint: true,
  });
  assert.doesNotThrow(() => createZoomGuardController().handleWheel({
    ctrlKey: false,
    stopPropagation: "not a function",
    preventDefault: null,
  }));
  const hostileCallback = { ctrlKey: false };
  Object.defineProperty(hostileCallback, "stopPropagation", {
    get() {
      throw new Error("hostile callback getter");
    },
  });
  assert.doesNotThrow(() => createZoomGuardController().handleWheel(hostileCallback));
});

test("zoom gating comes only from the schema capability and explicit chart setting", () => {
  assert.equal(chartZoomEnabled({
    typeId: "line",
    interaction: { zoom: { enabled: true } },
  }), true);
  assert.equal(chartZoomEnabled({
    typeId: "line",
    interaction: { zoom: { enabled: false } },
  }), false);
  assert.equal(chartZoomEnabled({
    typeId: "pie",
    interaction: { zoom: { enabled: true } },
  }), false);
  assert.equal(chartZoomEnabled({
    typeId: "choroplethMap",
    interaction: { zoom: { enabled: true } },
  }), true);
  assert.equal(chartZoomEnabled({
    typeId: "unknown",
    interaction: { zoom: { enabled: true } },
  }), false);
});

test("the zoom hint has a keyboard-focusable accessible status surface", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ZoomGuard,
      null,
      React.createElement("div", null, "Chart"),
    ),
  );

  assert.match(html, /class="chart-zoom-guard"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /aria-describedby="[^"]+"/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Hold Ctrl while scrolling to zoom/);
});

test("image Ctrl-wheel scaling is deterministic, bounded, and ignores plain or malformed wheels", () => {
  assert.equal(nextImageZoomScale(1, { ctrlKey: true, deltaY: -1 }), 1.25);
  assert.equal(nextImageZoomScale(1.25, { ctrlKey: true, deltaY: 1 }), 1);
  assert.equal(nextImageZoomScale(3, { ctrlKey: true, deltaY: -100 }), 3);
  assert.equal(nextImageZoomScale(1, { ctrlKey: true, deltaY: 100 }), 1);
  assert.equal(nextImageZoomScale(1.5, { ctrlKey: false, deltaY: -1 }), 1.5);
  assert.equal(nextImageZoomScale(Number.NaN, null), 1);

  const hostile = {};
  Object.defineProperty(hostile, "deltaY", {
    get() {
      throw new Error("hostile delta");
    },
  });
  assert.equal(nextImageZoomScale(2, hostile), 2);
});
