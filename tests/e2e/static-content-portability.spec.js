import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";

const APP_URL = "http://127.0.0.1:4173/";
const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const IMAGE_TITLE = "Portable local image";
const IMAGE_ALT = "Portable readiness marker";
const TEXT_TITLE = "Portable field guide";
const TEXT_QMD = [
  "# Offline priorities",
  "",
  "Plain comparison x<y remains text.",
  "",
  "<script>window.portabilityCodeRan=true</script>",
  "![remote](https://example.test/blocked.png)",
].join("\n");
const PNG = Buffer.from(imageFixtureBytes("image/png"));

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("bundle v4 restores local Image and Free-text in a fresh offline browser context", async ({
  browser,
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBiomedicalBuild(page);
  await createFreeText(page);
  const imagePanelId = await createImage(page);

  const authored = await persistedStaticContent(page);
  expect(authored.configVersion).toBe(4);
  expect(authored.text.source.qmd).toBe(TEXT_QMD);
  expect(authored.text.source.revision).toBe(1);
  expect(authored.image.panel.id).toBe(imagePanelId);
  expect(authored.image.asset).toMatchObject({
    mediaType: "image/png",
    storageState: "durable",
  });
  expect(authored.serialized).not.toContain("data:image/");

  await page.reload();
  await openBiomedical(page);
  await expectStaticPanels(page, authored.image.panel.id, authored.text.panel.id);

  const bundlePath = testInfo.outputPath("static-content-bundle-v4.json");
  page.once("dialog", (dialog) => dialog.accept("static-content-bundle-v4"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download Dashboard Package" }).click(),
  ]);
  await download.saveAs(bundlePath);
  const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
  expect(bundle.version).toBe(4);
  expect(bundle.config.configVersion).toBe(4);
  expect(Object.keys(bundle.assetPayloads)).toEqual([authored.image.source.origin.assetId]);

  const assetId = authored.image.source.origin.assetId;
  const missingPath = testInfo.outputPath("missing-payload.json");
  const missing = structuredClone(bundle);
  delete missing.assetPayloads[assetId];
  await writeFile(missingPath, JSON.stringify(missing));
  const corruptPath = testInfo.outputPath("corrupt-payload.json");
  const corrupt = structuredClone(bundle);
  corrupt.assetPayloads[assetId].base64 = flipBase64Byte(corrupt.assetPayloads[assetId].base64);
  await writeFile(corruptPath, JSON.stringify(corrupt));

  const freshContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const importedPage = await freshContext.newPage();
    await importedPage.goto(APP_URL);
    await openBiomedicalBuild(importedPage, { navigate: false });
    await expect(importedPage.getByText(TEXT_TITLE, { exact: true })).toHaveCount(0);
    await expectRejectedImport(importedPage, missingPath, /missing authored asset payload/i);
    await expectRejectedImport(importedPage, corruptPath, /hash|corrupt|payload/i);
    await expect(importedPage.getByText(TEXT_TITLE, { exact: true })).toHaveCount(0);

    await packageInput(importedPage).setInputFiles(bundlePath);
    const review = importedPage.getByRole("dialog", { name: "Review package contents" });
    await expect(review).toContainText(TEXT_TITLE);
    await expect(review).toContainText(IMAGE_TITLE);
    await review.getByRole("button", { name: "Load package" }).click();
    await expect(review).toHaveCount(0);

    await importedPage.reload();
    await openBiomedical(importedPage);
    await expectStaticPanels(importedPage, authored.image.panel.id, authored.text.panel.id);

    await expect.poll(
      () => importedPage.evaluate(async () => {
        if (!("serviceWorker" in navigator)) return [];
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.flatMap((registration) => [
          registration.installing?.state,
          registration.waiting?.state,
          registration.active?.state,
        ].filter(Boolean));
      }),
      { timeout: 15_000 },
    ).toContain("activated");
    await importedPage.reload();
    await openBiomedical(importedPage);
    await freshContext.setOffline(true);
    await importedPage.reload({ waitUntil: "domcontentloaded" });
    await openBiomedical(importedPage);
    await expectStaticPanels(importedPage, authored.image.panel.id, authored.text.panel.id);

    await importedPage.getByLabel("Dashboard mode")
      .getByRole("button", { name: "View", exact: true }).click();
    const imagePanel = canonicalPanel(importedPage, authored.image.panel.id);
    await scrollPanelIntoView(importedPage, authored.image.panel.id);
    await imagePanel.getByRole("button", { name: "Focus chart" }).click();
    const fullscreen = importedPage.getByRole("dialog", { name: "Focused chart" });
    await expect(fullscreen.locator(`img[alt="${IMAGE_ALT}"]`)).toBeVisible();
    await fullscreen.getByRole("button", { name: "Exit focus" }).click();

    await importedPage.setViewportSize({ width: 768, height: 900 });
    await scrollPanelIntoView(importedPage, authored.text.panel.id);
    const geometry = await importedPage.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);

    await importedPage.setViewportSize({ width: 1440, height: 900 });
    await importedPage.getByLabel("Dashboard mode")
      .getByRole("button", { name: "Present", exact: true }).click();
    const audiencePromise = freshContext.waitForEvent("page");
    await importedPage.getByRole("button", { name: "Open audience display" }).click();
    const audience = await audiencePromise;
    await audience.waitForLoadState("domcontentloaded");
    await importedPage.getByRole("checkbox", { name: IMAGE_TITLE }).check();
    await expect(audience.locator(`img[alt="${IMAGE_ALT}"]`)).toBeVisible();
    await audience.close();
  } finally {
    await freshContext.close();
  }
});

async function openBiomedicalBuild(page, { navigate = true } = {}) {
  if (navigate) await page.goto(APP_URL);
  await openBiomedical(page);
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
}

async function openBiomedical(page) {
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
}

async function createFreeText(page) {
  await page.getByRole("button", { name: "Add static content", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add static content" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(TEXT_TITLE);
  await wizard.getByLabel("QMD-style source").fill(TEXT_QMD);
  await expect(wizard.getByRole("status")).toContainText("Preview is up to date");
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
}

async function createImage(page) {
  await page.getByRole("button", { name: "Add static content", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add static content" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Image").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(IMAGE_TITLE);
  await wizard.getByLabel("PNG, JPEG, or WebP file").setInputFiles({
    name: "portable.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(wizard.getByText(/portable\.png is ready/)).toBeVisible();
  await wizard.getByLabel("Alternative text").fill(IMAGE_ALT);
  await wizard.getByRole("button", { name: "Continue" }).click();
  await expect(wizard.getByLabel("Canonical static content preview")
    .locator(`img[alt="${IMAGE_ALT}"]`)).toBeVisible();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  const panel = page.getByLabel(`${IMAGE_TITLE} actions`).locator("..");
  await expect(panel).toBeAttached();
  return panel.getAttribute("data-panel-id");
}

async function expectRejectedImport(page, path, message) {
  await packageInput(page).setInputFiles(path);
  await expect(page.getByRole("dialog", { name: "Review package contents" })).toHaveCount(0);
  await expect(page.getByText(message)).toBeVisible();
}

function packageInput(page) {
  return page.locator('input[type="file"][accept*="application/json"]').first();
}

async function persistedStaticContent(page) {
  return page.evaluate(({ key, textTitle, imageTitle }) => {
    const serialized = localStorage.getItem(key);
    const dashboard = JSON.parse(serialized);
    const charts = dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement);
    const textPanel = charts.find(({ title }) => title === textTitle);
    const imagePanel = charts.find(({ title }) => title === imageTitle);
    const textSource = dashboard.dataSources[textPanel.sourceId];
    const imageSource = dashboard.dataSources[imagePanel.sourceId];
    return {
      configVersion: dashboard.configVersion,
      serialized,
      text: { panel: textPanel, source: textSource },
      image: {
        panel: imagePanel,
        source: imageSource,
        asset: dashboard.assets[imageSource.origin.assetId],
      },
    };
  }, { key: STORAGE_KEY, textTitle: TEXT_TITLE, imageTitle: IMAGE_TITLE });
}

async function expectStaticPanels(page, imagePanelId, textPanelId) {
  const image = canonicalPanel(page, imagePanelId);
  await scrollPanelIntoView(page, imagePanelId);
  await expect(image.locator(`img[alt="${IMAGE_ALT}"]`)).toBeVisible();
  const text = canonicalPanel(page, textPanelId);
  await scrollPanelIntoView(page, textPanelId);
  const sink = text.locator('[data-portable-qmd-sink="safe-dom"]');
  await expect(sink).toContainText("Offline priorities");
  await expect(sink).toContainText("<script>window.portabilityCodeRan=true</script>");
  await expect(sink.locator("script,iframe,img,[src],[srcset]")).toHaveCount(0);
}

function canonicalPanel(page, panelId) {
  return page.locator(`[data-panel-id="${panelId}"][data-canonical-panel-id]`);
}

async function scrollPanelIntoView(page, panelId) {
  const found = await page.evaluate((id) => {
    const panel = document.querySelector(
      `[data-panel-id="${CSS.escape(id)}"][data-canonical-panel-id]`,
    );
    panel?.scrollIntoView({ block: "center" });
    return panel !== null;
  }, panelId);
  expect(found).toBe(true);
}

function flipBase64Byte(value) {
  return `${value[0] === "A" ? "B" : "A"}${value.slice(1)}`;
}
