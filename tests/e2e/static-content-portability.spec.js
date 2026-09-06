import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";
import { serializeDashboardBundle } from "../../src/charting/config/dashboardBundleV3.js";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { openAudienceSession } from "./support/present-audience-workflow.js";

const APP_URL = "/";
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
const REPLACEMENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("production StrictMode root keeps the reloaded durable Image URL active", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await openBiomedicalBuild(page);
  const panelId = await createImage(page, {
    title: "StrictMode durable image",
    alt: "StrictMode durable marker",
  });

  await page.reload();
  await openBiomedical(page);
  await scrollPanelIntoView(page, panelId);
  const image = canonicalPanel(page, panelId).locator('img[alt="StrictMode durable marker"]');
  await expect(image).toBeVisible();
  const activeUrl = await image.getAttribute("src");
  expect(activeUrl).toMatch(/^blob:/);
  expect(await page.evaluate(async (url) => {
    try {
      const response = await fetch(url);
      return response.ok && (await response.blob()).size > 0;
    } catch {
      return false;
    }
  }, activeUrl)).toBe(true);
});

test("bundle v6 restores local Image and Free-text in a fresh offline browser context", {
  tag: "@production-static",
}, async ({ browser, page }, testInfo) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBiomedicalBuild(page);
  await createFreeText(page);
  const imagePanelId = await createImage(page);

  const authored = await persistedStaticContent(page);
  expect(authored.configVersion).toBe(6);
  expect(authored.text.source.qmd).toBe(TEXT_QMD);
  expect(authored.text.source.revision).toBe(1);
  expect(authored.image.panel.id).toBe(imagePanelId);
  expect(authored.image.asset).toMatchObject({
    mediaType: "image/png",
    storageState: "durable",
  });
  expect(authored.serialized).not.toContain("data:image/");

  await page.reload();
  await openBiomedicalBuild(page, { navigate: false });
  await expectStaticPanels(page, authored.image.panel.id, authored.text.panel.id);

  const bundlePath = testInfo.outputPath("static-content-bundle-v6.json");
  const downloadButton = await passportPackageDownloadButton(page);
  page.once("dialog", (dialog) => dialog.accept("static-content-bundle-v6"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadButton.click(),
  ]);
  await download.saveAs(bundlePath);
  const exported = JSON.parse(await readFile(bundlePath, "utf8"));
  await writeFile(bundlePath, JSON.stringify(compactStaticBundle(exported)));
  const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
  expect(bundle.version).toBe(6);
  expect(bundle.config.configVersion).toBe(6);
  expect(Object.keys(bundle.assetPayloads)).toEqual([authored.image.mediaItem.current.assetId]);

  const assetId = authored.image.mediaItem.current.assetId;
  const missingPath = testInfo.outputPath("missing-payload.json");
  const missing = structuredClone(bundle);
  delete missing.assetPayloads[assetId];
  await writeFile(missingPath, JSON.stringify(missing));
  const corruptPath = testInfo.outputPath("corrupt-payload.json");
  const corrupt = structuredClone(bundle);
  corrupt.assetPayloads[assetId].base64 = flipBase64Byte(corrupt.assetPayloads[assetId].base64);
  await writeFile(corruptPath, JSON.stringify(corrupt));

  const freshContext = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 1440, height: 900 },
  });
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
    await fullscreen.getByRole("button", { name: "Exit fullscreen" }).click();

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
    const { popup: audience } = await openAudienceSession(importedPage, {
      waitForBaseline: false,
    });
    await importedPage.getByRole("checkbox", { name: IMAGE_TITLE }).check();
    await expect(audience.locator(".audience-display")).toHaveAttribute(
      "data-connection-status",
      "connected",
      { timeout: 45_000 },
    );
    await expect(audience.locator(`img[alt="${IMAGE_ALT}"]`)).toBeVisible();
    await audience.close();
  } finally {
    await freshContext.close();
  }
});

test("package import quota failure preserves the prior dashboard and authored store", async ({
  browser,
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await openBiomedicalBuild(page);
  await createFreeText(page);
  await createImage(page);
  const bundlePath = testInfo.outputPath("quota-import-bundle-v6.json");
  const downloadButton = await passportPackageDownloadButton(page);
  page.once("dialog", (dialog) => dialog.accept("quota-import-bundle-v6"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadButton.click(),
  ]);
  await download.saveAs(bundlePath);
  const exported = JSON.parse(await readFile(bundlePath, "utf8"));
  await writeFile(bundlePath, JSON.stringify(compactStaticBundle(exported)));

  const freshContext = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 1024, height: 768 },
  });
  try {
    const importedPage = await freshContext.newPage();
    await importedPage.goto(APP_URL);
    await openBiomedicalBuild(importedPage, { navigate: false });
    const priorStorage = await importedPage.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    const priorAssets = await authoredStoreRecords(importedPage);
    await importedPage.evaluate((key) => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function setItem(storageKey, value) {
        if (storageKey === key) throw new DOMException("quota injected", "QuotaExceededError");
        return original.call(this, storageKey, value);
      };
    }, STORAGE_KEY);

    await packageInput(importedPage).setInputFiles(bundlePath);
    const review = importedPage.getByRole("dialog", { name: "Review package contents" });
    await review.getByRole("button", { name: "Load package" }).click();

    await expect(review).toBeVisible();
    await expect(review).toContainText(
      /storage is full|could not restore the prior dashboard and authored asset store/i,
      { timeout: 60_000 },
    );
    expect(await importedPage.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))
      .toBe(priorStorage);
    expect(await authoredStoreRecords(importedPage)).toEqual(priorAssets);
    await expect(importedPage.getByText(TEXT_TITLE, { exact: true })).toHaveCount(0);
    await expect(importedPage.getByText(IMAGE_TITLE, { exact: true })).toHaveCount(0);
  } finally {
    await freshContext.close();
  }
});

test("Image replacement and panel removal retain reusable durable media bytes", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await openBiomedicalBuild(page);
  const firstTitle = "Shared asset first panel";
  const siblingTitle = "Shared asset sibling panel";
  const firstId = await createImage(page, {
    title: firstTitle,
    alt: "Shared bytes first rendering",
  });
  const siblingId = await createImage(page, {
    title: siblingTitle,
    alt: "Shared bytes sibling rendering",
  });

  await expect.poll(() => authoredAssetState(page)).toMatchObject({
    manifestCount: 1,
    recordCount: 1,
    manifestBytes: PNG.byteLength,
    statuses: ["durable"],
  });
  const shared = await authoredAssetState(page);
  const [sharedAssetId] = shared.manifestIds;

  const firstPanel = canonicalPanel(page, firstId);
  await scrollPanelIntoView(page, firstId);
  await firstPanel.hover();
  await firstPanel.getByLabel(`${firstTitle} actions`)
    .getByRole("button", { name: "Edit chart" }).click();
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Text/Image editor" });
  await expect(editor).toBeVisible();
  await editor.getByLabel("PNG, JPEG, or WebP file").setInputFiles({
    name: "replacement.png",
    mimeType: "image/png",
    buffer: REPLACEMENT_PNG,
  });
  await expect(editor.getByText(/replacement\.png is ready/)).toBeVisible();
  await editor.getByLabel("Alternative text").fill("Replacement bytes rendering");
  await editor.getByRole("button", { name: "Continue" }).click();
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(editor).toHaveCount(0);

  await expect.poll(() => authoredAssetState(page)).toMatchObject({
    manifestCount: 2,
    recordCount: 2,
    manifestBytes: PNG.byteLength + REPLACEMENT_PNG.byteLength,
    statuses: ["durable", "durable"],
  });
  const replaced = await authoredAssetState(page);
  expect(replaced.manifestIds).toContain(sharedAssetId);
  await expect(canonicalPanel(page, siblingId)
    .locator('img[alt="Shared bytes sibling rendering"]')).toBeVisible();

  await removePanel(page, siblingId, siblingTitle);
  await expect.poll(() => authoredAssetState(page)).toMatchObject({
    manifestCount: 2,
    recordCount: 2,
    manifestBytes: PNG.byteLength + REPLACEMENT_PNG.byteLength,
    statuses: ["durable", "durable"],
  });
  const siblingRemoved = await authoredAssetState(page);
  expect(siblingRemoved.manifestIds).toContain(sharedAssetId);

  await page.reload();
  await openBiomedicalBuild(page, { navigate: false });
  await scrollPanelIntoView(page, firstId);
  await expect(canonicalPanel(page, firstId)
    .locator('img[alt="Replacement bytes rendering"]')).toBeVisible();
  await removePanel(page, firstId, firstTitle);
  await expect.poll(() => authoredAssetState(page)).toMatchObject({
    manifestCount: 2,
    recordCount: 2,
    manifestBytes: PNG.byteLength + REPLACEMENT_PNG.byteLength,
    statuses: ["durable", "durable"],
  });

  await page.reload();
  await openBiomedical(page);
  await expect(canonicalPanel(page, firstId)).toHaveCount(0);
  await expect(canonicalPanel(page, siblingId)).toHaveCount(0);
});

test("asset commit failure restores the prior dashboard and authored store atomically", async ({
  browser,
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await openBiomedicalBuild(page);
  const imagePanelId = await createImage(page);
  const bundlePath = testInfo.outputPath("commit-recovery-bundle-v6.json");
  const downloadButton = await passportPackageDownloadButton(page);
  page.once("dialog", (dialog) => dialog.accept("commit-recovery-bundle-v6"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadButton.click(),
  ]);
  await download.saveAs(bundlePath);
  const exported = JSON.parse(await readFile(bundlePath, "utf8"));
  await writeFile(bundlePath, JSON.stringify(compactStaticBundle(exported)));

  const freshContext = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 1024, height: 768 },
  });
  try {
    const importedPage = await freshContext.newPage();
    await importedPage.goto(APP_URL);
    await openBiomedicalBuild(importedPage, { navigate: false });
    const priorStorage = await importedPage.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    const priorAssets = await authoredStoreRecords(importedPage);
    await importedPage.evaluate(() => {
      const originalPut = IDBObjectStore.prototype.put;
      globalThis.__SIMEX_ORIGINAL_IDB_PUT__ = originalPut;
      IDBObjectStore.prototype.put = function failDurableAuthoredAsset(record, ...args) {
        if (this.name === "assets" && record?.status === "durable") {
          throw new DOMException("injected authored commit failure", "AbortError");
        }
        return originalPut.call(this, record, ...args);
      };
    });

    await packageInput(importedPage).setInputFiles(bundlePath);
    const review = importedPage.getByRole("dialog", { name: "Review package contents" });
    await review.getByRole("button", { name: "Load package" }).click();
    await expect(review).toBeVisible();
    await expect(review).toContainText(/storage is unavailable|could not be loaded/i, {
      timeout: 60_000,
    });
    expect(await authoredStoreRecords(importedPage)).toEqual(priorAssets);
    expect(await importedPage.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))
      .toBe(priorStorage);
    await expect(canonicalPanel(importedPage, imagePanelId)).toHaveCount(0);

    await importedPage.evaluate(() => {
      IDBObjectStore.prototype.put = globalThis.__SIMEX_ORIGINAL_IDB_PUT__;
      delete globalThis.__SIMEX_ORIGINAL_IDB_PUT__;
    });
    await importedPage.reload();
    await openBiomedical(importedPage);
    await expect(importedPage.locator(`img[alt="${IMAGE_ALT}"]`)).toHaveCount(0);
    expect(await authoredStoreRecords(importedPage)).toEqual(priorAssets);
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
  await openDashboardPage(page, "biomedical");
}

async function createFreeText(page) {
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(TEXT_TITLE);
  await wizard.getByRole("button", { name: "Raw text", exact: true }).click();
  const source = wizard.getByLabel("Portable QMD raw source");
  await source.fill(TEXT_QMD);
  await expect(source).toHaveValue(TEXT_QMD);
  await expect(wizard.getByRole("region", { name: "Rendered preview" }))
    .toContainText("Offline priorities");
  await wizard.getByRole("button", { name: "Formatted text", exact: true }).click();
  await expect(wizard.getByLabel("Portable QMD Composer editing area")).toBeVisible();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
}

async function createImage(page, {
  title = IMAGE_TITLE,
  alt = IMAGE_ALT,
  buffer = PNG,
} = {}) {
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("radio", { name: /^Image / }).check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(title);
  await wizard.getByLabel("PNG, JPEG, or WebP file").setInputFiles({
    name: "portable.png",
    mimeType: "image/png",
    buffer,
  });
  await expect(wizard.getByText(/portable\.png is ready/)).toBeVisible();
  await wizard.getByLabel("Alternative text").fill(alt);
  await wizard.getByRole("button", { name: "Continue" }).click();
  await expect(wizard.getByLabel("Text/Image preview")
    .locator(`img[alt="${alt}"]`)).toBeVisible();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  const panel = page.getByLabel(`${title} actions`).locator("..");
  await expect(panel).toBeAttached();
  return panel.getAttribute("data-panel-id");
}

async function removePanel(page, panelId, title) {
  const panel = canonicalPanel(page, panelId);
  await scrollPanelIntoView(page, panelId);
  await panel.hover();
  await panel.getByLabel(`${title} actions`)
    .getByRole("button", { name: "Remove chart" }).click();
  await page.getByRole("dialog", { name: "Remove this chart?" })
    .getByRole("button", { name: "Remove chart" }).click();
  await expect(panel).toHaveCount(0);
}

async function expectRejectedImport(page, path, message) {
  await packageInput(page).setInputFiles(path);
  await expect(page.getByRole("dialog", { name: "Review package contents" })).toHaveCount(0);
  await expect(page.getByLabel("Operation status").getByText(message)).toBeVisible();
}

function packageInput(page) {
  return page.locator('input[type="file"][accept*="application/json"]').first();
}

async function passportPackageDownloadButton(page) {
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  if (!await passport.isVisible().catch(() => false)) {
    await page.locator(".dashboard-scenario-trigger").click();
  }
  await expect(passport).toBeVisible();
  return passport.getByRole("button", {
    name: "Download Dashboard Package",
    exact: true,
  });
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
    const imageMediaItem = dashboard.contentLibrary.mediaItems[imageSource.mediaId];
    return {
      configVersion: dashboard.configVersion,
      serialized,
      text: { panel: textPanel, source: textSource },
      image: {
        panel: imagePanel,
        source: imageSource,
        mediaItem: imageMediaItem,
        asset: dashboard.assets[imageMediaItem.current.assetId],
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

async function authoredStoreRecords(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("simex-authored-assets-v1", 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("assets")) {
        request.result.createObjectStore("assets", { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const transaction = request.result.transaction("assets", "readonly");
      const getAll = transaction.objectStore("assets").getAll();
      getAll.onerror = () => reject(getAll.error);
      getAll.onsuccess = () => resolve(getAll.result.map(({ bytes, ...record }) => ({
        ...record,
        bytes: Array.from(bytes ?? []),
      })));
    };
  }));
}

async function authoredAssetState(page) {
  const records = await authoredStoreRecords(page);
  const manifest = await page.evaluate((key) => (
    JSON.parse(localStorage.getItem(key))?.assets ?? {}
  ), STORAGE_KEY);
  return {
    manifestCount: Object.keys(manifest).length,
    manifestIds: Object.keys(manifest).sort(),
    manifestBytes: Object.values(manifest)
      .reduce((total, entry) => total + entry.byteLength, 0),
    recordCount: records.length,
    recordIds: records.map(({ id }) => id).sort(),
    statuses: records.map(({ status }) => status).sort(),
  };
}

function compactStaticBundle(exported) {
  const staticPanels = exported.config.pages
    .flatMap((page) => page.sections.flatMap((section) => section.panels))
    .filter((placement) => ["freeText", "image"].includes((placement.chart ?? placement).typeId));
  const sourceIds = staticPanels.map((placement) => (placement.chart ?? placement).sourceId);
  const compactConfig = structuredClone(exported.config);
  const biomedical = compactConfig.pages.find(({ id }) => id === "biomedical");
  compactConfig.pages = [{
    ...biomedical,
    sections: [{ ...biomedical.sections[0], panels: staticPanels }],
  }];
  compactConfig.dataSources = Object.fromEntries(sourceIds.map((sourceId) => [
    sourceId,
    compactConfig.dataSources[sourceId],
  ]));
  const mediaIds = Object.values(compactConfig.dataSources)
    .flatMap((source) => source?.kind === "staticImage" && source.mediaId ? [source.mediaId] : []);
  compactConfig.contentLibrary = {
    mediaItems: Object.fromEntries(mediaIds.map((mediaId) => [
      mediaId,
      compactConfig.contentLibrary.mediaItems[mediaId],
    ])),
    sourceEntries: {},
  };
  compactConfig.datasetProfiles = {};
  compactConfig.chronoGroups = [];
  compactConfig.scenes = [];
  const compactAssetIds = Object.values(compactConfig.contentLibrary.mediaItems)
    .flatMap((item) => item?.current?.kind === "asset" ? [item.current.assetId] : []);
  compactConfig.assets = Object.fromEntries(compactAssetIds.map((assetId) => [
    assetId,
    compactConfig.assets[assetId],
  ]));
  const compactPayloads = Object.fromEntries(compactAssetIds.map((assetId) => [
    assetId,
    exported.assetPayloads[assetId],
  ]));
  return serializeDashboardBundle(compactConfig, {
    now: exported.metadata.exportedAt,
    assetPayloads: compactPayloads,
  });
}
