import assert from "node:assert/strict";
import test, { after, afterEach, beforeEach } from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});
await vite.listen();
const address = vite.httpServer.address();
const baseURL = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
let page;

beforeEach(async () => {
  page = await browser.newPage();
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
});

afterEach(async () => {
  await page?.close();
  page = null;
});

after(async () => {
  await browser.close();
  await vite.close();
});

test("healthy local media owns one lease and releases it exactly once on replacement and unmount", async () => {
  const result = await page.evaluate(async () => {
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { createRoot } = ReactDOMClient;
    const { default: QmdMediaView } = await import("/src/components/charts/QmdMediaView.jsx");
    const target = document.querySelector("#target");
    const root = createRoot(target);
    const calls = [];
    const resolveAsset = async (assetId) => {
      calls.push(`acquire:${assetId}`);
      let released = false;
      return {
        url: `blob:https://simex.test/${assetId}`,
        release() {
          if (released) return false;
          released = true;
          calls.push(`release:${assetId}`);
          return true;
        },
      };
    };
    const render = (mediaId) => root.render(React.createElement(QmdMediaView, {
      mediaItem: localItem(mediaId),
      attributes: {
        width: "50%", align: "end", flow: "wrap-start", frame: "card",
        caption: "Response map", decorative: true,
      },
      assets: { [`asset-${mediaId}`]: { assetId: `asset-${mediaId}` } },
      resolveAsset,
      onRepair: () => calls.push(`repair:${mediaId}`),
    }));
    const waitFor = async (predicate) => {
      for (let index = 0; index < 50; index += 1) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error("Timed out waiting for QMD media view.");
    };
    render("one");
    await waitFor(() => target.querySelector("img"));
    const first = {
      alt: target.querySelector("img")?.getAttribute("alt"),
      role: target.querySelector("img")?.getAttribute("role"),
      width: target.querySelector(".qmd-media-view")?.dataset.qmdMediaWidth,
      intrinsic: target.querySelector("img")?.getAttribute("width") + "x" + target.querySelector("img")?.getAttribute("height"),
    };
    render("two");
    await waitFor(() => target.querySelector("img")?.getAttribute("src")?.endsWith("asset-two"));
    root.unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { first, calls, remainingImages: target.querySelectorAll("img").length };

    function localItem(mediaId) {
      return {
        mediaId,
        revision: 1,
        current: { kind: "asset", assetId: `asset-${mediaId}` },
        health: "ready",
        displayName: mediaId,
        defaultDescription: mediaId,
        origin: "uploaded",
        dimensions: { width: 800, height: 400 },
        byteLength: 100,
        mediaType: "image/png",
      };
    }
  });

  assert.deepEqual(result, {
    first: { alt: "", role: "presentation", width: "50%", intrinsic: "800x400" },
    calls: ["acquire:asset-one", "release:asset-one", "acquire:asset-two", "release:asset-two"],
    remainingImages: 0,
  });
});

test("known missing media keeps a bounded logical fallback and only Build exposes repair", async () => {
  const result = await page.evaluate(async () => {
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { createRoot } = ReactDOMClient;
    const { default: QmdMediaView } = await import("/src/components/charts/QmdMediaView.jsx");
    const target = document.querySelector("#target");
    const root = createRoot(target);
    let repairs = 0;
    root.render(React.createElement(QmdMediaView, {
      mediaItem: {
        mediaId: "missing-map",
        revision: 3,
        current: { kind: "asset", assetId: "missing-asset" },
        health: "missing",
        displayName: "Missing response map",
        defaultDescription: "Response map",
        origin: "uploaded",
      },
      attributes: { width: "100%", align: "center", flow: "block", frame: "none", caption: "", decorative: false },
      assets: {},
      resolveAsset: async () => { throw new Error("must not resolve unhealthy media"); },
      onRepair: () => { repairs += 1; },
    }));
    for (let index = 0; index < 50 && !target.querySelector("button"); index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    target.querySelector("button")?.click();
    const value = {
      mediaId: target.querySelector(".qmd-media-view")?.dataset.qmdMediaId,
      health: target.querySelector(".qmd-media-view")?.dataset.qmdMediaHealth,
      text: target.textContent,
      images: target.querySelectorAll("img").length,
      repairs,
    };
    root.unmount();
    return value;
  });

  assert.equal(result.mediaId, "missing-map");
  assert.equal(result.health, "missing");
  assert.match(result.text, /Missing response map.*unavailable/i);
  assert.equal(result.images, 0);
  assert.equal(result.repairs, 1);
});

test("a rejected non-blob resolver result transfers release ownership exactly once", async () => {
  const result = await page.evaluate(async () => {
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: QmdMediaView } = await import("/src/components/charts/QmdMediaView.jsx");
    const target = document.querySelector("#target");
    const root = ReactDOMClient.createRoot(target);
    let releases = 0;
    root.render(React.createElement(QmdMediaView, {
      mediaItem: {
        mediaId: "invalid-lease",
        revision: 1,
        current: { kind: "asset", assetId: "asset-invalid" },
        health: "ready",
        displayName: "Invalid lease",
        defaultDescription: "Invalid lease",
        origin: "uploaded",
        dimensions: { width: 800, height: 400 },
        byteLength: 100,
        mediaType: "image/png",
      },
      attributes: { width: "100%", align: "center", flow: "block", frame: "none", caption: "", decorative: false },
      assets: { "asset-invalid": { assetId: "asset-invalid" } },
      resolveAsset: async () => ({
        url: "https://example.test/not-an-object-url.png",
        release() {
          releases += 1;
          return true;
        },
      }),
    }));
    for (let index = 0; index < 50 && !target.textContent.includes("unavailable"); index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const releasesAfterRejection = releases;
    root.unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { releasesAfterRejection, releasesAfterUnmount: releases };
  });

  assert.deepEqual(result, { releasesAfterRejection: 1, releasesAfterUnmount: 1 });
});

test("allowlisted percentages are content-relative without inline style or horizontal overflow", async () => {
  const result = await page.evaluate(async () => {
    await import("/src/styles/source-content.css");
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: QmdMediaView } = await import("/src/components/charts/QmdMediaView.jsx");
    const target = document.querySelector("#target");
    target.style.inlineSize = "600px";
    const root = ReactDOMClient.createRoot(target);
    const widths = ["25%", "33%", "50%", "66%", "75%", "100%", "37%"];
    root.render(React.createElement("div", { id: "content-column" }, widths.map((width) => React.createElement(QmdMediaView, {
      key: width,
      mediaItem: {
        mediaId: `media-${width}`, revision: 1, current: { kind: "asset", assetId: `asset-${width}` },
        health: "missing", displayName: width, dimensions: { width: 800, height: 400 },
      },
      attributes: { width, align: "start", flow: "block", frame: "none", caption: "", alt: width, decorative: false },
      assets: {},
    }))));
    for (let index = 0; index < 50 && target.querySelectorAll(".qmd-media-view").length !== widths.length; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const column = target.querySelector("#content-column");
    const columnWidth = column.getBoundingClientRect().width;
    const measured = [...target.querySelectorAll(".qmd-media-view")].map((node) => ({
      token: node.dataset.qmdMediaWidth,
      ratio: Number((node.getBoundingClientRect().width / columnWidth).toFixed(2)),
      inlineStyle: node.hasAttribute("style"),
      overflow: node.scrollWidth > node.clientWidth,
    }));
    root.unmount();
    return { measured, documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });

  assert.deepEqual(result, {
    measured: [
      { token: "25%", ratio: 0.25, inlineStyle: false, overflow: false },
      { token: "33%", ratio: 0.33, inlineStyle: false, overflow: false },
      { token: "50%", ratio: 0.5, inlineStyle: false, overflow: false },
      { token: "66%", ratio: 0.66, inlineStyle: false, overflow: false },
      { token: "75%", ratio: 0.75, inlineStyle: false, overflow: false },
      { token: "100%", ratio: 1, inlineStyle: false, overflow: false },
      { token: "37%", ratio: 0.37, inlineStyle: false, overflow: false },
    ],
    documentOverflow: false,
  });
});

test("custom frame variables apply only to framed modes and Card remains visually distinct", async () => {
  const result = await page.evaluate(async () => {
    await import("/src/styles/source-content.css");
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: QmdMediaView } = await import("/src/components/charts/QmdMediaView.jsx");
    const target = document.querySelector("#target");
    const root = ReactDOMClient.createRoot(target);
    const item = {
      mediaId: "framed", revision: 1, current: { kind: "asset", assetId: "asset-framed" },
      health: "missing", displayName: "Framed map", dimensions: { width: 800, height: 400 },
    };
    root.render(React.createElement("div", null,
      React.createElement(QmdMediaView, { mediaItem: item, attributes: { frame: "none", frameWeight: 7, frameColor: "#ABCDEF", alt: "Map" }, assets: {} }),
      React.createElement(QmdMediaView, { mediaItem: item, attributes: { frame: "outline", frameWeight: 3, frameColor: "#112233", alt: "Map" }, assets: {} }),
      React.createElement(QmdMediaView, { mediaItem: item, attributes: { frame: "card", frameWeight: 5, frameColor: "#445566", alt: "Map" }, assets: {} }),
    ));
    for (let index = 0; index < 50 && target.querySelectorAll(".qmd-media-view").length !== 3; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const values = [...target.querySelectorAll(".qmd-media-view")].map((node) => {
      const computed = getComputedStyle(node);
      return {
        frame: node.className.match(/frame-(none|outline|card)/)?.[1],
        style: node.getAttribute("style"),
        weight: computed.getPropertyValue("--qmd-frame-weight").trim(),
        color: computed.getPropertyValue("--qmd-frame-color").trim(),
        padding: computed.padding,
        radius: computed.borderRadius,
        shadow: computed.boxShadow,
        background: computed.backgroundColor,
      };
    });
    root.unmount();
    return values;
  });

  assert.equal(result[0].frame, "none");
  assert.equal(result[0].style, null);
  assert.deepEqual({ weight: result[1].weight, color: result[1].color }, { weight: "3px", color: "#112233" });
  assert.deepEqual({ weight: result[2].weight, color: result[2].color }, { weight: "5px", color: "#445566" });
  assert.notEqual(result[1].padding, result[2].padding);
  assert.notEqual(result[1].radius, result[2].radius);
  assert.equal(result[1].shadow, "none");
  assert.notEqual(result[2].shadow, "none");
  assert.notEqual(result[1].background, result[2].background);
});

test("wrap is capped, narrow collapse retains the token, and logical alignment follows RTL", async () => {
  const result = await page.evaluate(async () => {
    await import("/src/styles/source-content.css");
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: QmdMediaView } = await import("/src/components/charts/QmdMediaView.jsx");
    const target = document.querySelector("#target");
    const root = ReactDOMClient.createRoot(target);
    const mediaItem = {
      mediaId: "logical-map", revision: 1, current: { kind: "asset", assetId: "asset-logical" },
      health: "missing", displayName: "Logical map", dimensions: { width: 800, height: 400 },
    };
    const render = (width, align, flow, direction) => {
      target.style.inlineSize = `${width}px`;
      target.dir = direction;
      root.render(React.createElement("div", { className: "free-text-chart-view__content" }, React.createElement(QmdMediaView, {
        mediaItem,
        attributes: { width: "75%", align, flow, frame: "outline", caption: "Caption", alt: "Map", decorative: false },
        assets: {},
      })));
    };
    const measure = async () => {
      for (let index = 0; index < 50 && !target.querySelector(".qmd-media-view"); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const content = target.querySelector(".free-text-chart-view__content").getBoundingClientRect();
      const media = target.querySelector(".qmd-media-view");
      const rect = media.getBoundingClientRect();
      return {
        token: media.dataset.qmdMediaFlow,
        widthRatio: Number((rect.width / content.width).toFixed(2)),
        startGap: Math.round(rect.left - content.left),
        endGap: Math.round(content.right - rect.right),
        float: getComputedStyle(media).float,
        caption: media.querySelector(".qmd-media-view__caption")?.textContent,
        frame: media.classList.contains("qmd-media-view--frame-outline"),
      };
    };
    render(600, "start", "wrap-start", "rtl");
    const wideRtl = await measure();
    render(400, "end", "wrap-start", "rtl");
    const narrowRtl = await measure();
    root.unmount();
    return { wideRtl, narrowRtl };
  });

  assert.deepEqual(result.wideRtl, {
    token: "wrap-start", widthRatio: 0.5, startGap: 300, endGap: 0, float: "inline-start", caption: "Caption", frame: true,
  });
  assert.deepEqual(result.narrowRtl, {
    token: "wrap-start", widthRatio: 0.75, startGap: 0, endGap: 100, float: "none", caption: "Caption", frame: true,
  });
});
