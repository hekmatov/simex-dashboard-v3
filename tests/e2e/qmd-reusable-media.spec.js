import { expect, test } from "@playwright/test";

const HARNESS_URL = "http://127.0.0.1:4175/tests/fixtures/portable-qmd-browser.html";

test("Flow Frame Decorative local image inspector keeps responsive geometry and request authority", async ({ page }) => {
  test.setTimeout(90_000);
  const requests = [];
  const pageErrors = [];
  page.on("request", (request) => {
    if (!["document", "script", "stylesheet"].includes(request.resourceType())) requests.push(request.url());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(HARNESS_URL);
  await mountJourney(page, "build", 1280);
  const editor = page.locator(".free-text-source-editor");
  const storedQmd = editor
    .getByRole("region", { name: "Portable Markdown" })
    .locator("pre");
  await page.getByRole("button", { name: "Insert image" }).first().click();
  const insertPicker = page.getByRole("region", { name: "Media picker" });
  await expect(insertPicker.getByRole("heading", { name: "Insert image" })).toBeVisible();
  const insertedAlternate = insertPicker.getByLabel(/Alternate map/);
  await expect(insertedAlternate).toBeVisible();
  await insertedAlternate.click();
  await expect(storedQmd).toContainText(/simex-media:alternate/);
  await page.getByRole("button", { name: "Edit placement for Alternate map" }).click();
  await expect(page.getByRole("region", { name: "Image placement" })).toBeVisible();
  await page.getByRole("button", { name: "Edit placement for Alternate map" }).click();
  const responsePlacement = page.getByRole("button", { name: "Edit placement for Response map" });
  await responsePlacement.click();
  const inspector = page.getByRole("region", { name: "Image placement" });
  await expect(inspector).toBeVisible();
  for (const label of ["25%", "33%", "50%", "66%", "75%", "100%"] ) {
    await inspector.getByLabel(label).check();
    await expect(storedQmd).toContainText(new RegExp(`width=${label.replace("%", "\\%")}`));
    await expect.poll(() => editor.evaluate((node) => (
      node.dataset.sourceRevision === node.dataset.previewRevision
    ))).toBe(true);
    if (label === "75%") expect(await geometry(page)).toMatchObject({
      surface: "build", authoredFlow: "wrap-start", computedFloat: "none", widthRatio: 0.75, horizontalOverflow: false,
    });
  }
  await inspector.getByLabel("Custom width percentage").fill("37");
  await inspector.getByLabel("Custom width percentage").blur();
  await expect(storedQmd).toContainText(/width=37%/);
  await inspector.getByLabel("End", { exact: true }).check();
  await inspector.getByLabel("Wrap start", { exact: true }).check();
  const moreOptions = inspector.getByRole("button", { name: "More image options" });
  await moreOptions.click();
  await inspector.getByLabel("Card", { exact: true }).check();
  await inspector.getByLabel("Visible caption").fill("Journey C caption");
  await inspector.getByLabel("Alternative text").fill("Journey C alternative");
  const changeImage = inspector.getByRole("button", { name: "Change image" });
  await changeImage.click();
  const picker = page.getByRole("region", { name: "Media picker" });
  const changedAlternate = picker.getByLabel(/Alternate map/);
  await expect(changedAlternate).toBeVisible();
  await changedAlternate.click();
  await expect(inspector).toContainText("Alternate map");
  await expect(storedQmd).toContainText(/simex-media:alternate/);
  const alternateMore = inspector.getByRole("button", { name: "More image options" });
  if (await alternateMore.getAttribute("aria-expanded") === "false") await alternateMore.click();
  const openMedia = inspector.getByRole("button", { name: "Open media item" });
  await openMedia.click();
  expect(await page.evaluate(() => window.__journeyOpenMedia)).toEqual(["alternate"]);
  expect(await page.evaluate(() => window.__journeyLibrarySnapshot === JSON.stringify(window.__journeyMediaItems))).toBe(true);

  await page.setViewportSize({ width: 1024, height: 768 });
  expect(await geometry(page)).toMatchObject({
    widthRatio: 0.37,
    caption: "Journey C caption",
    frame: "card",
    reservedAspect: 2,
    horizontalOverflow: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await mountJourney(page, "view", 350);
  const viewGeometry = await geometry(page);
  expect(viewGeometry).toMatchObject({
    authoredFlow: "wrap-start",
    computedFloat: "none",
    widthRatio: 0.37,
    horizontalOverflow: false,
    repairButtons: 0,
  });

  await mountJourney(page, "fullscreen", 350, { missing: true, direction: "rtl" });
  const fullscreenGeometry = await geometry(page);
  expect(fullscreenGeometry).toMatchObject({
    direction: "rtl",
    authoredAlign: "end",
    authoredFlow: "wrap-start",
    computedFloat: "none",
    horizontalOverflow: false,
    images: 0,
    repairButtons: 0,
  });
  await expect(page.getByRole("status")).toContainText("unavailable");

  expect(requests.filter((url) => /example\.test|data:|file:/.test(url))).toEqual([]);
  expect(pageErrors).toEqual([]);
});

async function mountJourney(page, surface, contentWidth, options = {}) {
  await page.evaluate(async ({ surface, contentWidth, options }) => {
    await import("/src/styles/tokens.css");
    await import("/src/styles/source-content.css");
    const { default: React } = await import("/@id/react");
    const ReactDOMModule = await import("/@id/react-dom/client");
    const ReactDOMClient = ReactDOMModule.default ?? ReactDOMModule;
    const { default: FreeTextSourceEditor } = await import("/src/components/static-content/FreeTextSourceEditor.jsx");
    const { default: FreeTextChartView } = await import("/src/components/charts/FreeTextChartView.jsx");
    const { serializePortableMediaReference } = await import("/src/static-content/qmd/portableQmdMedia.js");
    window.__journeyRoot?.unmount();
    document.querySelector("#target").replaceChildren();
    const target = document.querySelector("#target");
    target.dir = options.direction ?? "ltr";
    target.style.inlineSize = `${contentWidth}px`;
    target.style.maxInlineSize = "100%";
    target.dataset.surface = surface;
    const ready = !options.missing;
    const mediaItems = {
      response: {
        mediaId: "response", revision: 3, current: { kind: "asset", assetId: "asset-response" },
        displayName: "Response map", defaultDescription: "Response map", origin: "uploaded",
        health: ready ? "ready" : "missing", dimensions: { width: 800, height: 400 }, byteLength: 100, mediaType: "image/png",
      },
      alternate: {
        mediaId: "alternate", revision: 5, current: { kind: "asset", assetId: "asset-alternate" },
        displayName: "Alternate map", defaultDescription: "Alternate map", origin: "uploaded",
        health: "ready", dimensions: { width: 800, height: 400 }, byteLength: 100, mediaType: "image/png",
      },
    };
    window.__journeyMediaItems = mediaItems;
    window.__journeyLibrarySnapshot = JSON.stringify(mediaItems);
    window.__journeyOpenMedia = [];
    const assets = {
      "asset-response": { assetId: "asset-response" },
      "asset-alternate": { assetId: "asset-alternate" },
    };
    const resolveAsset = async () => {
      const url = URL.createObjectURL(new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#667853"/></svg>'], { type: "image/svg+xml" }));
      return { url, release: () => URL.revokeObjectURL(url) };
    };
    const qmd = '![Response map](simex-media:response){width=37% align=end flow=wrap-start frame=card caption="Journey C caption" decorative=false}';
    function BuildHarness() {
      const [source, setSource] = React.useState(qmd);
      return React.createElement(FreeTextSourceEditor, {
        id: "journey-qmd-source", value: source, panelId: "journey-panel", mediaItems, assets,
        contentRenderContext: { resolveAsset }, onChange: setSource,
        onMediaSelect: (item, { intent } = {}) => {
          if (intent !== "change") {
            setSource((current) => `${current}\n\n${serializePortableMediaReference({ mediaId: item.mediaId, alt: item.defaultDescription })}`);
          }
        },
        onOpenMediaItem: (mediaId) => window.__journeyOpenMedia.push(mediaId),
      });
    }
    const model = { sourceId: "journey-source", revision: 1, qmd };
    const chart = { id: "journey-panel", title: `Journey C ${surface}` };
    window.__journeyRoot = ReactDOMClient.createRoot(target);
    window.__journeyRoot.render(surface === "build"
      ? React.createElement(BuildHarness)
      : React.createElement(FreeTextChartView, {
          model, chart, surface,
          contentRenderContext: { mediaItems, assets, resolveAsset },
        }));
    for (let index = 0; index < 100 && !target.querySelector(".qmd-media-view"); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    for (let index = 0; index < 100 && ready && !target.querySelector("img"); index += 1) await new Promise((resolve) => setTimeout(resolve, 10));
  }, { surface, contentWidth, options });
}

async function geometry(page) {
  return page.evaluate(() => {
    const target = document.querySelector("#target");
    const content = target.querySelector(".free-text-chart-view__content") ?? target;
    const media = target.querySelector(".qmd-media-view");
    const image = media?.querySelector("img");
    const contentRect = content.getBoundingClientRect();
    const mediaRect = media.getBoundingClientRect();
    return {
      surface: target.dataset.surface,
      direction: getComputedStyle(target).direction,
      authoredAlign: media.className.match(/align-(start|center|end)/)?.[1],
      authoredFlow: media.dataset.qmdMediaFlow,
      computedFloat: getComputedStyle(media).float,
      widthRatio: Number((mediaRect.width / contentRect.width).toFixed(2)),
      frame: media.className.match(/frame-(none|outline|card)/)?.[1],
      caption: media.querySelector(".qmd-media-view__caption")?.textContent,
      reservedAspect: image ? Number(image.getAttribute("width")) / Number(image.getAttribute("height")) : null,
      horizontalOverflow: target.scrollWidth > target.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth,
      images: media.querySelectorAll("img").length,
      repairButtons: media.querySelectorAll("button:not([data-qmd-media-select])").length,
    };
  });
}
