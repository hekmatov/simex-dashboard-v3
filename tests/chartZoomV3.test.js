import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const {
  default: ZoomGuard,
  createZoomGuardController,
  wheelZoomDecision,
} = await import("../src/components/charts/ZoomGuard.jsx");
const {
  chartZoomEnabled,
} = await import("../src/components/charts/ChartView.jsx");

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
