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
      width: target.querySelector(".qmd-media-view")?.style.getPropertyValue("--qmd-media-width"),
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
