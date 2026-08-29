import assert from "node:assert/strict";
import test, { after, afterEach, beforeEach } from "node:test";

import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});
await vite.listen();
const address = vite.httpServer.address();
const baseURL = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch();
let page;

beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(5_000);
  await page.goto(`${baseURL}/tests/fixtures/free-text-harness.html`);
  await page.waitForFunction(() => window.freeTextHarnessReady === true, null, { timeout: 5_000 });
});

afterEach(async () => {
  await page?.close();
  page = null;
});

after(async () => {
  await browser.close();
  await vite.close();
});

async function advancedQmdSource(scope = page) {
  const tab = scope.getByRole("tab", { name: "Advanced QMD" });
  if (await tab.getAttribute("aria-selected") !== "true") await tab.click();
  return scope.getByLabel("Portable QMD source");
}

test("canonical ChartView routes typed Free text without rows or playback projection and preserves semantic structure", async () => {
  const qmd = [
    "# Situation",
    "",
    "A [safe external link](https://example.test).",
    "",
    "| Facility | Ready |",
    "| --- | --- |",
    "| North | Yes |",
    "",
    "```text",
    "a-very-long-display-only-code-token-that-does-not-execute",
    "```",
    "",
    "::: {.callout-important}",
    "Confirm communications.",
    ":::",
  ].join("\n");
  await page.evaluate((source) => window.mountRoutedFreeText(source), qmd);

  const active = page.locator('[data-harness-mode="active"]');
  const passive = page.locator('[data-harness-mode="passive"]');
  await active.locator(".free-text-chart-view").waitFor();
  assert.equal(await active.locator("h2").textContent(), "Operational situation");
  assert.equal(await active.locator("h3").textContent(), "Situation");
  assert.equal(await active.locator("h3").getAttribute("id"), "situation-panel-situation");
  assert.equal(await active.locator("th").first().getAttribute("scope"), "col");
  assert.equal(await active.locator("aside").getAttribute("data-callout-type"), "important");
  assert.equal(await active.locator("a").first().getAttribute("rel"), "noopener noreferrer");
  assert.equal(await active.locator("a").first().getAttribute("target"), "_blank");
  assert.equal(await active.locator(".portable-qmd-table-scroll").getAttribute("tabindex"), "0");
  assert.equal(await active.locator(".portable-qmd-code-scroll").getAttribute("tabindex"), "0");
  assert.equal(await active.locator(".free-text-chart-view__content").getAttribute("data-portable-qmd-sink"), "safe-dom");
  assert.equal(await active.locator(".free-text-chart-view").getAttribute("data-static-source-id"), "situation-source");
  assert.equal(await passive.locator(".free-text-chart-view").getAttribute("data-static-source-id"), "situation-source");
  assert.equal(await active.locator(".free-text-chart-view").getAttribute("data-static-source-revision"), "1");
  assert.equal(await passive.locator(".free-text-chart-view").getAttribute("data-static-source-revision"), "1");
  assert.equal(await active.locator("[data-chart-state]").count(), 0);
  assert.equal(await active.locator('[data-chart-interaction-mode="active"]').count(), 1);
  assert.equal(await passive.locator('[data-chart-interaction-mode="passive"]').count(), 1);
  assert.equal(await active.locator(".free-text-chart-view__content").innerHTML(), await passive.locator(".free-text-chart-view__content").innerHTML());
});

test("Free text portals replace and unmount without orphan media or duplicate leases", async () => {
  await page.evaluate(async () => {
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { createRoot } = ReactDOMClient;
    const { default: FreeTextChartView } = await import("/src/components/charts/FreeTextChartView.jsx");
    const target = document.body.appendChild(document.createElement("div"));
    target.id = "qmd-portal-target";
    window.__qmdPortalRoot = createRoot(target);
    window.__qmdLeaseCalls = [];
    window.__renderQmdMedia = (qmd) => window.__qmdPortalRoot.render(React.createElement(FreeTextChartView, {
      model: { sourceId: "text-source", revision: 1, qmd },
      chart: { id: "portal-panel", title: "Portal panel" },
      contentRenderContext: {
        mediaItems: {
          ready: {
            mediaId: "ready", revision: 1,
            current: { kind: "asset", assetId: "asset-ready" },
            displayName: "Ready map", defaultDescription: "Ready map",
            origin: "uploaded", health: "ready",
            dimensions: { width: 800, height: 400 }, byteLength: 100, mediaType: "image/png",
          },
        },
        assets: { "asset-ready": { assetId: "asset-ready" } },
        resolveAsset: async (assetId) => {
          window.__qmdLeaseCalls.push(`acquire:${assetId}`);
          let released = false;
          return {
            url: `blob:https://simex.test/${assetId}`,
            release() {
              if (released) return false;
              released = true;
              window.__qmdLeaseCalls.push(`release:${assetId}`);
              return true;
            },
          };
        },
        requestRepair: () => {},
      },
    }));
    window.__renderQmdMedia("![Ready](simex-media:ready)");
  });
  await page.locator('#qmd-portal-target [data-qmd-media-host] img').waitFor();
  assert.deepEqual(await page.evaluate(() => window.__qmdLeaseCalls), ["acquire:asset-ready"]);

  await page.evaluate(() => window.__renderQmdMedia("Unsafe ![Remote](https://example.test/map.png)"));
  await page.waitForFunction(() => document.querySelector("#qmd-portal-target")?.textContent.includes("Remote"));
  assert.equal(await page.locator('#qmd-portal-target [data-qmd-media-host]').count(), 0);
  assert.equal(await page.locator('#qmd-portal-target img').count(), 0);
  assert.deepEqual(await page.evaluate(() => window.__qmdLeaseCalls), ["acquire:asset-ready", "release:asset-ready"]);

  await page.evaluate(() => window.__qmdPortalRoot.unmount());
  assert.equal(await page.locator('#qmd-portal-target img').count(), 0);
  assert.deepEqual(await page.evaluate(() => window.__qmdLeaseCalls), ["acquire:asset-ready", "release:asset-ready"]);
});

test("Free-text source preview leases staged simex media through the authored asset resolver and releases on unmount", async () => {
  await page.evaluate(async () => {
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: FreeTextSourceEditor } = await import("/src/components/static-content/FreeTextSourceEditor.jsx");
    const target = document.body.appendChild(document.createElement("div"));
    target.id = "source-editor-draft-preview";
    const mediaItem = {
      mediaId: "draft-local", revision: 1,
      current: { kind: "asset", assetId: "asset-draft-local" },
      displayName: "Draft local map", defaultDescription: "Draft local map", origin: "uploaded", health: "ready",
      dimensions: { width: 8, height: 6 }, byteLength: 32, mediaType: "image/png",
    };
    window.__draftPreviewCalls = [];
    window.__draftPreviewRoot = ReactDOMClient.createRoot(target);
    window.__draftPreviewRoot.render(React.createElement(FreeTextSourceEditor, {
      value: "![Draft local map](simex-media:draft-local)",
      panelId: "draft-preview-panel",
      mediaItems: { "draft-local": mediaItem },
      assets: { "asset-draft-local": { assetId: "asset-draft-local" } },
      contentRenderContext: {
        mediaItems: {}, assets: {},
        resolveAsset: async (assetId) => {
          window.__draftPreviewCalls.push(`acquire:${assetId}`);
          return { url: `blob:https://simex.test/${assetId}`, release: () => window.__draftPreviewCalls.push(`release:${assetId}`) };
        },
        requestRepair: () => window.__draftPreviewCalls.push("repair"),
      },
    }));
  });

  await page.locator("#source-editor-draft-preview [data-qmd-media-host] img").waitFor();
  assert.deepEqual(await page.evaluate(() => window.__draftPreviewCalls), ["acquire:asset-draft-local"]);
  await page.evaluate(() => window.__draftPreviewRoot.unmount());
  assert.deepEqual(await page.evaluate(() => window.__draftPreviewCalls), ["acquire:asset-draft-local", "release:asset-draft-local"]);
});

test("Preview and Add leases pending QMD media through the same authored resolver and releases on close", async () => {
  await page.evaluate(async () => {
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: StaticContentWizard } = await import("/src/components/static-content/StaticContentWizard.jsx");
    const { createStaticContentDraft } = await import("/src/static-content/forms/staticContentDraft.js");
    const target = document.body.appendChild(document.createElement("div"));
    target.id = "wizard-draft-preview";
    const mediaItem = {
      mediaId: "draft-import", revision: 1,
      current: { kind: "asset", assetId: "asset-draft-import" },
      displayName: "Imported draft map", defaultDescription: "Imported draft map", origin: "external-import", health: "ready",
      dimensions: { width: 8, height: 6 }, byteLength: 32, mediaType: "image/png",
    };
    const manifestEntry = {
      assetId: "asset-draft-import", mediaType: "image/png", byteLength: 32,
      width: 8, height: 6, sha256: "a".repeat(64), storageState: "staged",
    };
    const initial = createStaticContentDraft({
      mode: "create",
      destination: { pageId: "overview", sectionId: "response" },
      contentTypeId: "freeText",
      panel: { id: "draft-wizard-panel", typeId: "freeText", title: "Draft preview", sourceId: "draft-wizard-source" },
      source: {
        kind: "staticText", sourceVersion: 1, revision: 1, renderingPolicy: "portable-qmd-v1",
        qmd: "![Imported draft map](simex-media:draft-import)",
      },
      assets: { "asset-draft-import": manifestEntry },
    });
    initial.stage = "preview-and-add";
    initial.pendingMediaItems = { "draft-import": mediaItem };
    window.__wizardPreviewCalls = [];
    window.__wizardPreviewRoot = ReactDOMClient.createRoot(target);
    window.__wizardPreviewRoot.render(React.createElement(StaticContentWizard, {
      open: true,
      dashboard: { pages: [], contentLibrary: { mediaItems: {} }, assets: {} },
      initialDraft: initial,
      contentRenderContext: {
        mediaItems: {}, assets: {},
        resolveAsset: async (assetId) => {
          window.__wizardPreviewCalls.push(`acquire:${assetId}`);
          return { url: `blob:https://simex.test/${assetId}`, release: () => window.__wizardPreviewCalls.push(`release:${assetId}`) };
        },
        requestRepair: () => window.__wizardPreviewCalls.push("repair"),
      },
    }));
  });

  await page.locator("#wizard-draft-preview [data-qmd-media-host] img").waitFor();
  assert.deepEqual(await page.evaluate(() => window.__wizardPreviewCalls), ["acquire:asset-draft-import"]);
  await page.evaluate(() => window.__wizardPreviewRoot.unmount());
  assert.deepEqual(await page.evaluate(() => window.__wizardPreviewCalls), ["acquire:asset-draft-import", "release:asset-draft-import"]);
});

test("mounted Build, View, and fullscreen Free text keep local health authority and unsafe text inert", async () => {
  const remoteRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://example.test/")) remoteRequests.push(request.url());
  });
  await page.evaluate(async () => {
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: ChartView } = await import("/src/components/charts/ChartView.jsx");
    const target = document.body.appendChild(document.createElement("div"));
    target.id = "qmd-surface-checkpoint";
    window.__qmdSurfaceRoot = ReactDOMClient.createRoot(target);
    window.__qmdSurfaceCalls = [];
    const qmd = [
      "![Ready](simex-media:ready)",
      "![Missing](simex-media:missing)",
      "![Corrupt](simex-media:corrupt)",
      "![External](simex-media:external)",
      "![Unsafe](https://example.test/unsafe.png)",
    ].join("\n\n");
    const source = { kind: "staticText", sourceVersion: 1, revision: 1, renderingPolicy: "portable-qmd-v1", qmd };
    const item = (mediaId, health, assetId) => ({
      mediaId, revision: 1, current: { kind: "asset", assetId },
      displayName: `${mediaId} map`, defaultDescription: `${mediaId} map`, origin: "uploaded", health,
      dimensions: { width: 800, height: 400 }, byteLength: 100, mediaType: "image/png",
    });
    const renderContext = {
      sources: { narrative: source },
      mediaItems: {
        ready: item("ready", "ready", "asset-ready"),
        missing: item("missing", "missing", "asset-missing"),
        corrupt: item("corrupt", "corrupt", "asset-corrupt"),
        external: {
          mediaId: "external", revision: 1, current: { kind: "url", url: "https://example.test/external.png" },
          displayName: "external map", defaultDescription: "external map", origin: "external", health: "external",
        },
      },
      assets: { "asset-ready": { assetId: "asset-ready" }, "asset-corrupt": { assetId: "asset-corrupt" } },
      resolveAsset: async (assetId) => {
        window.__qmdSurfaceCalls.push(`acquire:${assetId}`);
        let released = false;
        return { url: `blob:https://simex.test/${assetId}`, release() {
          if (released) return false;
          released = true;
          window.__qmdSurfaceCalls.push(`release:${assetId}`);
          return true;
        } };
      },
      requestRepair: ({ mediaId, surface }) => window.__qmdSurfaceCalls.push(`repair:${surface}:${mediaId}`),
    };
    const chart = {
      id: "qmd-surface-panel", typeId: "freeText", title: "Surface checkpoint", sourceId: "narrative", roles: {},
      transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
      presentation: { title: { align: "left" }, background: { transparent: true } },
      interaction: { zoom: { enabled: false } },
    };
    window.__qmdSurfaceRoot.render(React.createElement("div", null,
      ...["build", "view", "fullscreen"].map((surface) => React.createElement("section", { key: surface, "data-surface": surface },
        React.createElement(ChartView, { chart, renderContext, surface, interactionMode: surface === "build" ? "active" : "passive" }),
      )),
    ));
  });
  await page.waitForFunction(() => document.querySelectorAll("#qmd-surface-checkpoint img").length === 3);
  const checkpoint = await page.evaluate(() => ({
    hosts: document.querySelectorAll("#qmd-surface-checkpoint [data-qmd-media-host]").length,
    images: document.querySelectorAll("#qmd-surface-checkpoint img").length,
    buildRepair: document.querySelectorAll('#qmd-surface-checkpoint [data-surface="build"] button').length,
    passiveRepair: document.querySelectorAll('#qmd-surface-checkpoint [data-surface="view"] button, #qmd-surface-checkpoint [data-surface="fullscreen"] button').length,
    missingFallbacks: document.querySelectorAll('#qmd-surface-checkpoint .qmd-media-view[data-qmd-media-health="missing"]').length,
    corruptFallbacks: document.querySelectorAll('#qmd-surface-checkpoint .qmd-media-view[data-qmd-media-health="corrupt"]').length,
    inertVisible: [...document.querySelectorAll("#qmd-surface-checkpoint section")]
      .every((section) => section.textContent.includes("External") && section.textContent.includes("Unsafe")),
    calls: [...window.__qmdSurfaceCalls],
  }));
  assert.deepEqual(checkpoint, {
    hosts: 9,
    images: 3,
    buildRepair: 2,
    passiveRepair: 0,
    missingFallbacks: 3,
    corruptFallbacks: 3,
    inertVisible: true,
    calls: ["acquire:asset-ready", "acquire:asset-ready", "acquire:asset-ready"],
  });
  assert.deepEqual(remoteRequests, []);

  await page.evaluate(() => window.__qmdSurfaceRoot.unmount());
  assert.equal(await page.locator("#qmd-surface-checkpoint img, #qmd-surface-checkpoint [data-qmd-media-host]").count(), 0);
  assert.deepEqual(await page.evaluate(() => window.__qmdSurfaceCalls), [
    "acquire:asset-ready", "acquire:asset-ready", "acquire:asset-ready",
    "release:asset-ready", "release:asset-ready", "release:asset-ready",
  ]);
});

test("QMD logical start, center, and end alignment place block media at the expected inline positions", async () => {
  const positions = await page.evaluate(async () => {
    await import("/src/styles/source-content.css");
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: FreeTextChartView } = await import("/src/components/charts/FreeTextChartView.jsx");
    const target = document.body.appendChild(document.createElement("div"));
    target.id = "qmd-alignment-contract";
    target.style.width = "600px";
    const root = ReactDOMClient.createRoot(target);
    const mediaItems = Object.fromEntries(["start", "center", "end"].map((align) => [align, {
      mediaId: align, revision: 1, current: { kind: "asset", assetId: `asset-${align}` },
      displayName: align, defaultDescription: align, origin: "uploaded", health: "missing",
    }]));
    root.render(React.createElement(FreeTextChartView, {
      model: {
        sourceId: "alignment", revision: 1,
        qmd: ["start", "center", "end"].map((align) => `![${align}](simex-media:${align}){width=50% align=${align} flow=block frame=none decorative=false}`).join("\n\n"),
      },
      chart: { id: "alignment-panel", title: "Alignment" },
      contentRenderContext: { mediaItems, assets: {} },
    }));
    for (let index = 0; index < 50 && target.querySelectorAll(".qmd-media-view").length !== 3; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const content = target.querySelector(".free-text-chart-view__content").getBoundingClientRect();
    const values = [...target.querySelectorAll(".qmd-media-view")].map((node) => ({
      align: node.className.match(/align-(start|center|end)/)?.[1],
      left: Math.round(node.getBoundingClientRect().left - content.left),
      width: Math.round(node.getBoundingClientRect().width),
    }));
    root.unmount();
    return values;
  });

  assert.deepEqual(positions, [
    { align: "start", left: 0, width: 280 },
    { align: "center", left: 140, width: 280 },
    { align: "end", left: 280, width: 280 },
  ]);
});

test("narrow wrap collapse is owned by the actual Free-text content container", async () => {
  const contract = await page.evaluate(async () => {
    await import("/src/styles/source-content.css");
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: FreeTextChartView } = await import("/src/components/charts/FreeTextChartView.jsx");
    const target = document.body.appendChild(document.createElement("div"));
    target.id = "qmd-container-contract";
    target.style.width = "400px";
    const root = ReactDOMClient.createRoot(target);
    root.render(React.createElement(FreeTextChartView, {
      model: {
        sourceId: "narrow-wrap", revision: 1,
        qmd: "![Wrap](simex-media:wrap){width=75% align=start flow=wrap-start frame=none decorative=false}",
      },
      chart: { id: "narrow-wrap-panel", title: "Narrow wrap" },
      contentRenderContext: {
        mediaItems: {
          wrap: {
            mediaId: "wrap", revision: 1, current: { kind: "asset", assetId: "asset-wrap" },
            displayName: "Wrap", defaultDescription: "Wrap", origin: "uploaded", health: "missing",
          },
        },
        assets: {},
      },
    }));
    for (let index = 0; index < 50 && !target.querySelector(".qmd-media-view"); index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const content = target.querySelector(".free-text-chart-view__content");
    const media = target.querySelector(".qmd-media-view");
    const value = {
      containerType: getComputedStyle(content).containerType,
      authoredFlow: media.dataset.qmdMediaFlow,
      float: getComputedStyle(media).float,
      maxInlineSize: getComputedStyle(media).maxInlineSize,
    };
    root.unmount();
    return value;
  });

  assert.deepEqual(contract, {
    containerType: "inline-size",
    authoredFlow: "wrap-start",
    float: "none",
    maxInlineSize: "100%",
  });
});

test("authoring preview selects one media placement and changes only its serialized media identity", async () => {
  const result = await page.evaluate(async () => {
    await import("/src/styles/source-content.css");
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: FreeTextSourceEditor } = await import("/src/components/static-content/FreeTextSourceEditor.jsx");
    const target = document.body.appendChild(document.createElement("div"));
    target.id = "qmd-inspector-editor-contract";
    const mediaItems = {
      first: {
        mediaId: "first", revision: 4, current: { kind: "asset", assetId: "asset-first" },
        displayName: "First map", defaultDescription: "First map", origin: "uploaded", health: "missing",
        dimensions: { width: 800, height: 400 }, byteLength: 100, mediaType: "image/png",
      },
      second: {
        mediaId: "second", revision: 9, current: { kind: "asset", assetId: "asset-second" },
        displayName: "Second map", defaultDescription: "Second map", origin: "uploaded", health: "ready",
        dimensions: { width: 800, height: 400 }, byteLength: 100, mediaType: "image/png",
      },
    };
    const originalLibrary = structuredClone(mediaItems);
    const actions = [];
    let latestSource = "";
    function Harness() {
      const [source, setSource] = React.useState('![First map](simex-media:first){width=50% align=center flow=block frame=none caption="Original" decorative=false}');
      latestSource = source;
      return React.createElement(FreeTextSourceEditor, {
        id: "inspector-qmd-source",
        value: source,
        panelId: "inspector-panel",
        mediaItems,
        assets: {},
        onChange: setSource,
        onOpenMediaItem: (mediaId) => actions.push(`open:${mediaId}`),
      });
    }
    const root = ReactDOMClient.createRoot(target);
    root.render(React.createElement(Harness));
    for (let index = 0; index < 50 && !target.querySelector("[data-qmd-media-select]"); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    target.querySelector("[data-qmd-media-select]")?.click();
    for (let index = 0; index < 50 && !target.querySelector("[data-qmd-media-inspector]"); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    target.querySelector('input[name="qmd-media-width"][value="33%"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    target.querySelector('[aria-label="More image options"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const changeTrigger = target.querySelector('[data-qmd-media-action="change"]');
    changeTrigger?.click();
    for (let index = 0; index < 50 && !target.querySelector('[aria-label="Media picker"]'); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    const focusOnOpen = document.activeElement?.value;
    target.querySelector('[aria-label="Media picker"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    for (let index = 0; index < 50 && target.querySelector('[aria-label="Media picker"]'); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    const pickerClosedOnEscape = target.querySelector('[aria-label="Media picker"]') === null;
    const focusAfterEscape = document.activeElement === changeTrigger;
    changeTrigger?.click();
    for (let index = 0; index < 50 && !target.querySelector('[aria-label="Media picker"]'); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    target.querySelector('[aria-label="Media picker"] button')?.click();
    for (let index = 0; index < 50 && target.querySelector('[aria-label="Media picker"]'); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const focusAfterClose = document.activeElement === changeTrigger;
    changeTrigger?.click();
    for (let index = 0; index < 50 && !target.querySelector('[aria-label="Media picker"]'); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    const changePickerHasIntake = target.querySelector('[aria-label="Media picker"] input[type="file"], [aria-label="Media picker"] button[data-import-media]') !== null
      || target.querySelector('[aria-label="Media picker"]')?.textContent.includes("Import as local media");
    target.querySelector('input[value="second"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const focusAfterSelection = document.activeElement === changeTrigger;
    target.querySelector("[data-qmd-media-select]")?.click();
    for (let index = 0; index < 50 && !target.querySelector('[data-qmd-media-action="open"]'); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    target.querySelector('[data-qmd-media-action="open"]')?.click();
    const value = {
      source: latestSource,
      actions,
      libraryUnchanged: JSON.stringify(mediaItems) === JSON.stringify(originalLibrary),
      images: target.querySelectorAll("img").length,
      changePickerHasIntake,
      focusOnOpen,
      pickerClosedOnEscape,
      focusAfterEscape,
      focusAfterClose,
      focusAfterSelection,
    };
    root.unmount();
    return value;
  });

  assert.match(result.source, /\(simex-media:second\)/);
  assert.match(result.source, /width=33% align=center flow=block frame=none caption="Original" decorative=false/);
  assert.deepEqual(result.actions, ["open:second"]);
  assert.equal(result.libraryUnchanged, true);
  assert.equal(result.images, 0);
  assert.equal(result.changePickerHasIntake, false);
  assert.equal(result.focusOnOpen, "second");
  assert.equal(result.pickerClosedOnEscape, true);
  assert.equal(result.focusAfterEscape, true);
  assert.equal(result.focusAfterClose, true);
  assert.equal(result.focusAfterSelection, true);
});

test("authoring edits exact parser-owned placements when inert and duplicate literals precede the selection", async () => {
  const result = await page.evaluate(async () => {
    await import("/src/styles/source-content.css");
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: FreeTextSourceEditor } = await import("/src/components/static-content/FreeTextSourceEditor.jsx");
    const target = document.body.appendChild(document.createElement("div"));
    target.id = "qmd-exact-placement-contract";
    const inert = '`![Duplicate](simex-media:first){width=25% align=start flow=block frame=none decorative=false}`';
    const angle = '![Duplicate](<simex-media:first>){width=33% align=center flow=block frame=outline decorative=false}';
    const duplicate = '![Duplicate](simex-media:first){width=66% align=end flow=wrap-start frame=card caption="Second" decorative=false}';
    const mediaItems = {
      first: { mediaId: "first", revision: 1, current: { kind: "asset", assetId: "asset-first" }, displayName: "Duplicate", defaultDescription: "Duplicate", origin: "uploaded", health: "missing" },
      second: { mediaId: "second", revision: 1, current: { kind: "asset", assetId: "asset-second" }, displayName: "Replacement", defaultDescription: "Replacement", origin: "uploaded", health: "ready" },
    };
    let latestSource = "";
    function Harness() {
      const [source, setSource] = React.useState([inert, angle, duplicate].join("\n\n"));
      latestSource = source;
      return React.createElement(FreeTextSourceEditor, { id: "exact-qmd", value: source, panelId: "exact-panel", mediaItems, assets: {}, onChange: setSource });
    }
    const root = ReactDOMClient.createRoot(target);
    root.render(React.createElement(Harness));
    for (let index = 0; index < 50 && target.querySelectorAll("[data-qmd-media-select]").length !== 2; index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    target.querySelectorAll("[data-qmd-media-select]")[0]?.click();
    for (let index = 0; index < 50 && !target.querySelector('[data-qmd-media-inspector]'); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    target.querySelector('input[name="qmd-media-width"][value="50%"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const afterAngleEdit = latestSource;
    target.querySelectorAll("[data-qmd-media-select]")[1]?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    target.querySelector('input[name="qmd-media-width"][value="75%"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const afterDuplicateEdit = latestSource;
    target.querySelector('[aria-label="More image options"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    target.querySelector('[data-qmd-media-action="change"]')?.click();
    for (let index = 0; index < 50 && !target.querySelector('input[value="second"]'); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    target.querySelector('input[value="second"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const afterChange = latestSource;
    root.unmount();
    return { inert, afterAngleEdit, afterDuplicateEdit, afterChange };
  });

  assert.equal(result.afterAngleEdit.startsWith(result.inert), true);
  assert.match(result.afterAngleEdit, /\n\n!\[Duplicate\]\(simex-media:first\)\{width=50% align=center/);
  assert.match(result.afterAngleEdit, /\n\n!\[Duplicate\]\(simex-media:first\)\{width=66% align=end/);
  assert.equal(result.afterDuplicateEdit.startsWith(result.inert), true);
  assert.match(result.afterDuplicateEdit, /\n\n!\[Duplicate\]\(simex-media:first\)\{width=50% align=center/);
  assert.match(result.afterDuplicateEdit, /\n\n!\[Duplicate\]\(simex-media:first\)\{width=75% align=end/);
  assert.equal(result.afterChange.startsWith(result.inert), true);
  assert.match(result.afterChange, /\n\n!\[Duplicate\]\(simex-media:first\)\{width=50% align=center/);
  assert.match(result.afterChange, /\n\n!\[Duplicate\]\(simex-media:second\)\{width=75% align=end/);
});

test("authoring edits reference, inline, and duplicate placements by their canonical token identity", async () => {
  const result = await page.evaluate(async () => {
    await import("/src/styles/source-content.css");
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: FreeTextSourceEditor } = await import("/src/components/static-content/FreeTextSourceEditor.jsx");
    const target = document.body.appendChild(document.createElement("div"));
    const reference = '![Reference][stored]{width=25% align=start flow=block frame=none decorative=false}';
    const inline = '![Inline](simex-media:first){width=33% align=center flow=block frame=outline decorative=false}';
    const duplicate = '![Inline](simex-media:first){width=66% align=end flow=wrap-start frame=card decorative=false}';
    const definition = "[stored]: simex-media:first";
    const mediaItems = {
      first: { mediaId: "first", revision: 1, current: { kind: "asset", assetId: "asset-first" }, displayName: "First", defaultDescription: "First", origin: "uploaded", health: "missing" },
    };
    let latestSource = "";
    function Harness() {
      const [source, setSource] = React.useState([reference, inline, duplicate, definition].join("\n\n"));
      latestSource = source;
      return React.createElement(FreeTextSourceEditor, { id: "reference-qmd", value: source, panelId: "reference-panel", mediaItems, assets: {}, onChange: setSource });
    }
    const root = ReactDOMClient.createRoot(target);
    root.render(React.createElement(Harness));
    for (let index = 0; index < 50 && target.querySelectorAll("[data-qmd-media-select]").length !== 3; index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    target.querySelectorAll("[data-qmd-media-select]")[0]?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    target.querySelector('input[name="qmd-media-width"][value="50%"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const afterReference = latestSource;
    target.querySelectorAll("[data-qmd-media-select]")[1]?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    target.querySelector('input[name="qmd-media-width"][value="75%"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const afterInline = latestSource;
    target.querySelectorAll("[data-qmd-media-select]")[2]?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    target.querySelector('input[name="qmd-media-width"][value="100%"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const afterDuplicate = latestSource;
    root.unmount();
    return { reference, inline, duplicate, definition, afterReference, afterInline, afterDuplicate };
  });

  assert.equal(result.afterReference.includes(result.reference), false);
  assert.match(result.afterReference, /!\[Reference\]\(simex-media:first\)\{width=50% align=start/);
  assert.equal(result.afterReference.includes(result.inline), true);
  assert.equal(result.afterReference.includes(result.duplicate), true);
  assert.equal(result.afterReference.endsWith(result.definition), true);
  assert.match(result.afterInline, /!\[Reference\]\(simex-media:first\)\{width=50% align=start/);
  assert.match(result.afterInline, /!\[Inline\]\(simex-media:first\)\{width=75% align=center/);
  assert.equal(result.afterInline.includes(result.duplicate), true);
  assert.equal(result.afterInline.endsWith(result.definition), true);
  assert.match(result.afterDuplicate, /!\[Reference\]\(simex-media:first\)\{width=50% align=start/);
  assert.match(result.afterDuplicate, /!\[Inline\]\(simex-media:first\)\{width=75% align=center/);
  assert.match(result.afterDuplicate, /!\[Inline\]\(simex-media:first\)\{width=100% align=end/);
  assert.equal(result.afterDuplicate.endsWith(result.definition), true);
});

test("editor debounces parsing, keeps the last valid preview stale on a complexity error, and recovers without losing source", async () => {
  const initial = "## Situation\n\nInitial valid preview.";
  await page.evaluate((source) => window.mountFreeTextEditor(source), initial);
  const preview = page.locator('[data-free-text-pane="preview"]');
  await preview.getByText("Initial valid preview.").waitFor();
  const editor = await advancedQmdSource();
  assert.equal(await page.locator('[data-validation-ok="true"]').textContent(), "0 blocking errors");

  const blocked = `${"> ".repeat(7)}too deeply nested`;
  await editor.fill(blocked);
  assert.match(await page.locator("#harness-qmd-status").textContent(), /Updating preview/i);
  await page.waitForTimeout(240);
  assert.match(await page.locator("#harness-qmd-status").textContent(), /1 blocking error|blocking errors/i);
  assert.equal(await page.locator(".free-text-preview-stale").textContent(), "Preview is stale");
  assert.equal(await preview.getByText("Initial valid preview.").count(), 1);
  assert.equal(await editor.inputValue(), blocked);
  const errorLink = page.locator(".free-text-validation-errors a").first();
  assert.match(await errorLink.textContent(), /line 1/i);
  await errorLink.click();
  assert.equal(await page.evaluate(() => document.activeElement?.id), "harness-qmd");

  await editor.fill("## Situation\n\nRecovered preview.");
  await page.waitForTimeout(240);
  await page.getByRole("tab", { name: "Preview" }).click();
  await preview.getByText("Recovered preview.").waitFor();
  assert.equal(await page.locator(".free-text-preview-stale").count(), 0);
  assert.equal(await page.locator('[data-validation-ok="true"]').textContent(), "0 blocking errors");
});

test("routed controls wait for analysis, accept arbitrary inert text, and still block a complexity breach", async () => {
  const initial = "# Situation\n\nInitial valid preview.";
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.evaluate((source) => window.mountFreeTextWizard(source), initial);
  const wizard = page.getByRole("dialog", { name: "Edit Text/Image" });
  const source = await advancedQmdSource(wizard);
  const continueButton = wizard.getByRole("button", { name: "Continue" });
  const previewRail = wizard.getByRole("button", { name: "Preview & add", exact: true });
  await expect(continueButton).toBeEnabled();
  assert.match(await wizard.locator("#static-qmd-source-advanced-help").textContent(), /preserves exact authored source/i);

  const arbitrary = [
    "# Situation",
    "",
    "<script>window.authoredCodeRan = true</script>",
    "<iframe src=\"https://example.test/embedded\"></iframe>",
  ].join("\n");
  await source.fill(arbitrary);
  assert.equal(await continueButton.isDisabled(), true);
  assert.equal(await previewRail.isDisabled(), true);
  assert.match(await wizard.getByRole("status").textContent(), /Updating preview/i);
  await page.waitForFunction(() => /Preview is up to date/i.test(document.querySelector("#static-qmd-source-status")?.textContent ?? ""));
  assert.equal(await continueButton.isDisabled(), false);
  assert.equal(await previewRail.isDisabled(), false);
  assert.equal(await wizard.locator('[data-free-text-pane="preview"] script, [data-free-text-pane="preview"] iframe').count(), 0);
  assert.equal(await wizard.locator('[data-free-text-pane="preview"]').getByText(/<script>window\.authoredCodeRan/).count(), 1);
  assert.equal(await page.evaluate(() => window.authoredCodeRan), undefined);

  await source.fill(`${"> ".repeat(7)}too deeply nested`);
  assert.equal(await continueButton.isDisabled(), true);
  assert.equal(await previewRail.isDisabled(), true);
  await page.waitForFunction(() => /blocking error/i.test(document.querySelector("#static-qmd-source-status")?.textContent ?? ""));
  assert.equal(await continueButton.isDisabled(), true);
  assert.equal(await previewRail.isDisabled(), true);
  assert.equal(await wizard.locator('[data-static-content-stage="content"]').count(), 1);
  assert.deepEqual(pageErrors, []);
});

test("change then rapid revert restores cached validation and matching source/preview revisions", async () => {
  const initial = "## Situation\n\nInitial valid preview.";
  await page.evaluate((source) => window.mountFreeTextEditor(source), initial);
  const output = page.locator("output[data-validation-ok]");
  await page.locator('[data-free-text-pane="preview"]').getByText("Initial valid preview.").waitFor();
  const editor = await advancedQmdSource();

  await editor.fill("# Changed\n\nValid but not yet evaluated.");
  assert.equal(await output.getAttribute("data-validation-pending"), "true");
  await editor.fill(initial);
  await page.waitForFunction(() => document.querySelector('output[data-validation-ok]')?.getAttribute("data-validation-pending") === "false");

  assert.equal(await output.getAttribute("data-validation-ok"), "true");
  assert.equal(await output.getAttribute("data-validation-source"), initial);
  const sourceRevision = await output.getAttribute("data-source-revision");
  assert.equal(await output.getAttribute("data-preview-revision"), sourceRevision);
  assert.ok(Number(sourceRevision) >= 2);
  assert.match(await page.locator("#harness-qmd-status").textContent(), /Preview is up to date/i);
  assert.equal(await page.locator('[data-free-text-pane="preview"]').getByText("Initial valid preview.").count(), 1);
});

test("responsive Advanced QMD and Preview tabs preserve selected pane and logical focus across layout changes", async () => {
  await page.evaluate(() => window.mountFreeTextEditor("## Situation\n\nResponsive content."));
  const sourcePane = page.locator('[data-free-text-pane="advanced"]');
  const previewPane = page.locator('[data-free-text-pane="preview"]');
  await previewPane.getByText("Responsive content.").waitFor();
  assert.equal(await sourcePane.isVisible(), false);
  assert.equal(await previewPane.isVisible(), true);

  const editor = await advancedQmdSource();
  assert.equal(await sourcePane.isVisible(), true);
  assert.equal(await previewPane.isVisible(), false);
  await editor.focus();
  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForTimeout(50);
  assert.equal(await page.getByRole("tab", { name: "Advanced QMD" }).getAttribute("aria-selected"), "true");
  assert.equal(await sourcePane.isVisible(), true);
  assert.equal(await previewPane.isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "harness-qmd");

  const sourceTab = page.getByRole("tab", { name: "Advanced QMD" });
  const previewTab = page.getByRole("tab", { name: "Preview" });
  await sourceTab.focus();
  await sourceTab.press("ArrowLeft");
  assert.equal(await previewTab.getAttribute("aria-selected"), "true");
  await page.waitForFunction(() => document.activeElement?.textContent === "Preview");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Preview");
  assert.equal(await sourcePane.isVisible(), false);
  assert.equal(await previewPane.isVisible(), true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(50);
  assert.equal(await sourcePane.isVisible(), false);
  assert.equal(await previewPane.isVisible(), true);
  assert.equal(await page.locator('[role="tab"]').filter({ hasText: "Preview" }).getAttribute("aria-selected"), "true");
});

test("panel, table, and code own their bounded overflow without growing the document", async () => {
  const longToken = "X".repeat(240);
  const qmd = `# Overflow\n\n${longToken}\n\n| Very wide heading ${longToken} | Value |\n| --- | --- |\n| Wide | ${longToken} |\n\n\`\`\`text\n${longToken}\n\`\`\``;
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate((source) => window.mountRoutedFreeText(source), qmd);
  await page.locator(".free-text-chart-view__content").first().waitFor();
  const overflow = await page.evaluate(() => {
    const view = document.querySelector(".free-text-chart-view");
    const table = document.querySelector(".portable-qmd-table-scroll");
    const code = document.querySelector(".portable-qmd-code-scroll");
    return {
      documentFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      viewY: getComputedStyle(view).overflowY,
      tableX: getComputedStyle(table).overflowX,
      codeX: getComputedStyle(code).overflowX,
      tableOwnsOverflow: table.scrollWidth > table.clientWidth,
      codeOwnsOverflow: code.scrollWidth > code.clientWidth,
    };
  });
  assert.deepEqual(overflow, {
    documentFits: true,
    viewY: "auto",
    tableX: "auto",
    codeX: "auto",
    tableOwnsOverflow: true,
    codeOwnsOverflow: true,
  });
});

test("canonical renderer and editor reject one-token math expansion before mounting over-budget DOM", async () => {
  const source = `$${"\\frac{x}{x}".repeat(220)}$`;
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.evaluate((qmd) => window.mountRoutedFreeText(qmd), source);

  const failures = page.locator('[data-static-failure="invalid-free-text"]');
  await failures.first().waitFor();
  assert.equal(await failures.count(), 2);
  assert.match(await failures.first().textContent(), /renders \d+ DOM nodes.*limit is 5000/i);
  assert.equal(await page.locator(".free-text-chart-view__content").count(), 0);
  assert.deepEqual(pageErrors, []);

  await page.evaluate((qmd) => window.mountFreeTextEditor(qmd), "## Safe\n\nLast valid preview.");
  await page.locator('[data-free-text-pane="preview"]').getByText("Last valid preview.").waitFor();
  const editor = await advancedQmdSource();
  await editor.fill(source);
  await page.waitForFunction(() => /blocking error/i.test(document.querySelector("#harness-qmd-status")?.textContent ?? ""));
  assert.match(await page.locator("#harness-qmd-status").textContent(), /blocking error/i);
  assert.match(await page.locator(".free-text-validation-errors").textContent(), /DOM nodes.*5000/i);
  assert.equal(await page.locator('[data-free-text-pane="preview"]').getByText("Last valid preview.").count(), 1);
  assert.deepEqual(pageErrors, []);
});
