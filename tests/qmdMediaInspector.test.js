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

test("inspector exposes only exact primary placement controls before progressive More controls", async () => {
  const result = await mountInspector(page);
  assert.deepEqual(result.primary, {
    widths: ["25%", "33%", "50%", "66%", "75%", "100%", "Custom"],
    alignments: ["Start", "Centre", "End"],
    flows: ["Block", "Wrap start", "Wrap end"],
    moreExpanded: "false",
    moreControls: 0,
    arbitraryControls: 0,
  });

  await page.getByRole("button", { name: "More image options" }).click();
  assert.deepEqual(await page.evaluate(() => ({
    frames: [...document.querySelectorAll('[data-qmd-media-inspector] input[name="qmd-media-frame"]')]
      .map((input) => input.closest("label")?.textContent.trim()),
    caption: document.querySelector('[data-qmd-media-inspector] input[name="qmd-media-caption"]')?.value,
    alt: document.querySelector('[data-qmd-media-inspector] input[name="qmd-media-alt"]')?.value,
    decorative: document.querySelector('[data-qmd-media-inspector] input[name="qmd-media-decorative"]')?.checked,
    actions: [...document.querySelectorAll('[data-qmd-media-inspector] [data-qmd-media-action]')]
      .map((button) => button.textContent.trim()),
  })), {
    frames: ["None", "Subtle outline", "Card"],
    caption: "Visible caption",
    alt: "Response map",
    decorative: false,
    actions: ["Change image", "Open media item"],
  });
});

test("inspector emits allowlisted placement changes and routes Change separately from Open", async () => {
  await mountInspector(page);
  await page.getByLabel("33%").check();
  await page.getByLabel("End", { exact: true }).check();
  await page.getByLabel("Wrap start", { exact: true }).check();
  await page.getByRole("button", { name: "More image options" }).click();
  await page.getByLabel("Card", { exact: true }).check();
  await page.getByLabel("Visible caption").fill("Operational caption");
  await page.getByLabel("Decorative image").check();
  await page.getByLabel("Decorative image").uncheck();
  await page.getByRole("button", { name: "Change image" }).click();
  await page.getByRole("button", { name: "Open media item" }).click();

  const result = await page.evaluate(() => ({
    changes: window.__inspectorCalls.filter((entry) => entry.type === "change").map((entry) => entry.value),
    actions: window.__inspectorCalls.filter((entry) => entry.type !== "change"),
    sourcePlacement: window.__inspectorPlacement,
    sourceRevision: window.__inspectorMedia.revision,
  }));
  assert.deepEqual(result.changes.map(({ width, align, flow, frame, caption, alt, decorative }) => ({
    width, align, flow, frame, caption, alt, decorative,
  })), [
    { width: "33%", align: "center", flow: "block", frame: "outline", caption: "Visible caption", alt: "Response map", decorative: false },
    { width: "33%", align: "end", flow: "block", frame: "outline", caption: "Visible caption", alt: "Response map", decorative: false },
    { width: "33%", align: "end", flow: "wrap-start", frame: "outline", caption: "Visible caption", alt: "Response map", decorative: false },
    { width: "33%", align: "end", flow: "wrap-start", frame: "card", caption: "Visible caption", alt: "Response map", decorative: false },
    { width: "33%", align: "end", flow: "wrap-start", frame: "card", caption: "Operational caption", alt: "Response map", decorative: false },
    { width: "33%", align: "end", flow: "wrap-start", frame: "card", caption: "Operational caption", alt: "", decorative: true },
    { width: "33%", align: "end", flow: "wrap-start", frame: "card", caption: "Operational caption", alt: "Default response description", decorative: false },
  ]);
  assert.deepEqual(result.actions, [
    { type: "change-image", mediaId: "media-map" },
    { type: "open-media", mediaId: "media-map" },
  ]);
  assert.equal(result.sourcePlacement.mediaId, "media-map");
  assert.equal(result.sourceRevision, 7);
});

test("custom width accepts only integer percentages from 10 through 100", async () => {
  await mountInspector(page);
  const custom = page.getByLabel("Custom width percentage");
  await custom.fill("37");
  await custom.blur();
  await custom.fill("9");
  await custom.blur();
  await custom.fill("20.5");
  await custom.blur();
  await custom.fill("101");
  await custom.blur();
  assert.deepEqual(await page.evaluate(() => window.__inspectorCalls
    .filter((entry) => entry.type === "change")
    .map((entry) => entry.value.width)), ["37%"]);
  assert.match(await page.getByRole("status").textContent(), /whole percentage from 10 through 100/i);
});

async function mountInspector(targetPage) {
  return targetPage.evaluate(async () => {
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: QmdMediaInspector } = await import("/src/components/static-content/QmdMediaInspector.jsx");
    const target = document.querySelector("#target");
    window.__inspectorCalls = [];
    window.__inspectorPlacement = {
      mediaId: "media-map", width: "50%", align: "center", flow: "block", frame: "outline",
      caption: "Visible caption", alt: "Response map", decorative: false,
    };
    window.__inspectorMedia = { mediaId: "media-map", revision: 7, displayName: "Response map", defaultDescription: "Default response description" };
    function Harness() {
      const [placement, setPlacement] = React.useState(window.__inspectorPlacement);
      window.__inspectorPlacement = placement;
      return React.createElement(QmdMediaInspector, {
        placement,
        mediaItem: window.__inspectorMedia,
        onChange: (value) => { window.__inspectorCalls.push({ type: "change", value }); setPlacement(value); },
        onChangeImage: (mediaId) => window.__inspectorCalls.push({ type: "change-image", mediaId }),
        onOpenMediaItem: (mediaId) => window.__inspectorCalls.push({ type: "open-media", mediaId }),
      });
    }
    ReactDOMClient.createRoot(target).render(React.createElement(Harness));
    for (let index = 0; index < 50 && !target.querySelector("[data-qmd-media-inspector]"); index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return {
      primary: {
        widths: [...target.querySelectorAll('input[name="qmd-media-width"]')].map((input) => input.closest("label")?.textContent.trim()),
        alignments: [...target.querySelectorAll('input[name="qmd-media-align"]')].map((input) => input.closest("label")?.textContent.trim()),
        flows: [...target.querySelectorAll('input[name="qmd-media-flow"]')].map((input) => input.closest("label")?.textContent.trim()),
        moreExpanded: target.querySelector('[aria-label="More image options"]')?.getAttribute("aria-expanded"),
        moreControls: target.querySelectorAll("[data-qmd-media-more]").length,
        arbitraryControls: target.querySelectorAll('[name*="pixel"], [name*="style"], [name*="position"], [name*="border"]').length,
      },
    };
  });
}
