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

test("embedded ECharts delegates one mount, in-place updates, resize, and complete cleanup", async () => {
  const {
    createEmbeddedEChartsLifecycle,
  } = await import("../src/components/charts/EmbeddedEChartsItem.jsx");
  const calls = [];
  const instance = {
    setOption(option) { calls.push(`option:${option.id}`); },
    resize() { calls.push("resize"); },
    dispose() { calls.push("dispose"); },
  };
  let resizeListener;
  let observer;
  const lifecycle = createEmbeddedEChartsLifecycle({
    echartsApi: {
      getInstanceByDom() { return null; },
      init() { calls.push("init"); return instance; },
      registerMap() {},
    },
    windowTarget: {
      addEventListener(type, listener) {
        if (type === "resize") resizeListener = listener;
      },
      removeEventListener(type, listener) {
        if (type === "resize" && listener === resizeListener) {
          calls.push("remove-resize");
        }
      },
    },
    ResizeObserverCtor: class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe() { calls.push("observe"); }
      disconnect() { calls.push("disconnect"); }
    },
  });

  const host = {};
  lifecycle.mount(host);
  lifecycle.mount(host);
  lifecycle.update({ option: { id: "first" } });
  lifecycle.update({ option: { id: "second" } });
  resizeListener();
  observer.callback();
  lifecycle.dispose();
  lifecycle.dispose();

  assert.deepEqual(calls, [
    "init",
    "observe",
    "option:first",
    "option:second",
    "resize",
    "resize",
    "disconnect",
    "remove-resize",
    "dispose",
  ]);
});

test("embedded ECharts reports bounded errors and releases resources after an update failure", async () => {
  const {
    createEmbeddedEChartsLifecycle,
  } = await import("../src/components/charts/EmbeddedEChartsItem.jsx");
  const calls = [];
  const messages = [];
  const lifecycle = createEmbeddedEChartsLifecycle({
    echartsApi: {
      getInstanceByDom() { return null; },
      init() {
        return {
          setOption() { throw new Error(`render ${"x".repeat(400)}`); },
          dispose() { calls.push("dispose"); },
        };
      },
      registerMap() {},
    },
    windowTarget: {
      addEventListener() {},
      removeEventListener() { calls.push("remove-resize"); },
    },
    ResizeObserverCtor: class {
      observe() {}
      disconnect() { calls.push("disconnect"); }
    },
    onError(message) { messages.push(message); },
  });

  lifecycle.mount({});
  assert.doesNotThrow(() => lifecycle.update({ option: { id: "broken" } }));
  assert.deepEqual(calls, ["disconnect", "remove-resize", "dispose"]);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /^render x+/);
  assert.ok(messages[0].length <= 240);
  assert.doesNotThrow(() => lifecycle.update({ option: { id: "ignored" } }));
});

test("embedded ECharts is SSR-safe, semantic-only outside its hidden canvas, and bounds supplied errors", async () => {
  const {
    default: EmbeddedEChartsItem,
  } = await import("../src/components/charts/EmbeddedEChartsItem.jsx");
  const originalSetInterval = globalThis.setInterval;
  let timerAllocations = 0;
  globalThis.setInterval = () => {
    timerAllocations += 1;
    return 1;
  };
  try {
    const rendered = renderToStaticMarkup(React.createElement(
      EmbeddedEChartsItem,
      {
        model: { kind: "echarts", option: { series: [] } },
      },
    ));
    const failed = renderToStaticMarkup(React.createElement(
      EmbeddedEChartsItem,
      {
        model: { kind: "echarts", option: { series: [] } },
        runtimeError: `embedded ${"y".repeat(400)}`,
      },
    ));

    assert.equal(timerAllocations, 0);
    assert.match(rendered, /class="chart-embedded-echarts-host"/);
    assert.match(rendered, /aria-hidden="true"/);
    assert.doesNotMatch(rendered, /chart-view-title|chart-view-provenance|Source:/);
    assert.match(failed, /role="status"/);
    assert.match(failed, /aria-live="assertive"/);
    assert.ok(failed.length < 400);
  } finally {
    globalThis.setInterval = originalSetInterval;
  }
});
