import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import { serializeDashboardBundle } from "../../src/charting/config/dashboardBundleV3.js";
import {
  encodeAssetBase64,
  sha256HexSync,
} from "../../src/static-content/assets/assetPayloadEnvelope.js";
import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";
import { enterAuthoredDashboard, openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const APP_URL = "http://127.0.0.1:4175/";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const PAGE_LABEL = "Biomedical";
const MEDIA_USED = "journey-g-media-used";
const MEDIA_UNUSED = "journey-g-media-unused";
const CSV_ID = "journey-g-csv";
const GEOJSON_ID = "journey-g-geojson";
const IMAGE_PANEL_ID = "journey-g-image-panel";
const QMD_PANEL_ID = "journey-g-qmd-panel";
const MAP_PANEL_ID = "journey-g-map-panel";
const PNG = imageFixtureBytes("image/png");

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
  await page.goto(APP_URL);
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    localStorage.removeItem("simex-dashboard-mode-v3");
  }, STORAGE_KEY);
  await page.reload();
});

test("Journey G — V6 offline round trip and V4 migration retain library", async ({ browser, page }, testInfo) => {
  test.setTimeout(180_000);
  await openBuild(page, { width: 1440, height: 900 });

  const v4 = await page.evaluate(async () => {
    const [dashboardResponse, profilesResponse] = await Promise.all([
      fetch("/config/dashboard.json"),
      fetch("/config/dataset-profiles.json"),
    ]);
    if (!dashboardResponse.ok || !profilesResponse.ok) {
      throw new Error("Journey G could not load the live dashboard fixture.");
    }
    const config = await dashboardResponse.json();
    config.datasetProfiles = await profilesResponse.json();
    config.configVersion = 4;
    delete config.contentLibrary;
    for (const group of config.chronoGroups ?? []) delete group.temporalReview;
    for (const scene of config.scenes ?? []) {
      delete scene.temporalReview;
      if (scene.present) delete scene.present.temporalReview;
    }
    return config;
  });
  await importPackage(page, {
    name: "journey-g-v4.json",
    value: v4,
  });
  const migrated = await storedSnapshot(page);
  expect(migrated.configVersion).toBe(6);
  expect(migrated.chartVersions).toEqual([3]);
  expect(migrated.sourceEntryIds.length).toBeGreaterThan(0);
  expect(migrated.temporalReviewCount).toBe(0);

  const fixture = await buildJourneyBundle(page);
  await importPackage(page, {
    name: "journey-g-v6.json",
    value: fixture,
  });
  const importedFixture = await journeySnapshot(page);
  expect(importedFixture).toMatchObject({
    configVersion: 6,
    mediaIds: [MEDIA_UNUSED, MEDIA_USED],
    sourceIds: [CSV_ID, GEOJSON_ID],
    usedMediaId: MEDIA_USED,
    unusedMediaUses: 0,
  });
  expect(importedFixture.assetIds).toHaveLength(1);
  expect(importedFixture.chartVersions).toEqual([3]);

  page.once("dialog", (dialog) => dialog.accept("journey-g-roundtrip"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download Dashboard Package", exact: true }).click(),
  ]);
  const bundlePath = testInfo.outputPath("journey-g-roundtrip.json");
  await download.saveAs(bundlePath);
  const exported = JSON.parse(await readFile(bundlePath, "utf8"));
  expect(exported.version).toBe(6);
  expect(exported.config.configVersion).toBe(6);
  expect(exported.config.contentLibrary.mediaItems[MEDIA_USED].revision).toBe(7);
  expect(exported.config.contentLibrary.mediaItems[MEDIA_UNUSED].revision).toBe(2);
  expect(exported.config.contentLibrary.mediaItems[MEDIA_USED].current.assetId)
    .toBe(exported.config.contentLibrary.mediaItems[MEDIA_UNUSED].current.assetId);
  expect(exported.config.contentLibrary.mediaItems[MEDIA_USED].current.assetId)
    .toBe(`asset-${sha256HexSync(PNG)}`);
  expect(Object.keys(exported.assetPayloads)).toHaveLength(1);
  expect(exported.assetPayloads[`asset-${sha256HexSync(PNG)}`].sha256).toBe(sha256HexSync(PNG));
  expect(exported.config.dataSources[CSV_ID].csvText).toContain("MunicipalityCode");
  expect(exported.config.dataSources[GEOJSON_ID].geoJson.features).toHaveLength(2);
  expect(exported.config.datasetProfiles?.[GEOJSON_ID]).toBeUndefined();
  expect(exported.config.dataSources["journey-g-qmd-source"].qmd)
    .toContain(`simex-media:${MEDIA_USED}`);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const importedPage = await context.newPage();
    await importedPage.goto(APP_URL);
    await openBuild(importedPage, { width: 1440, height: 900, navigate: false });
    await packageInput(importedPage).setInputFiles(bundlePath);
    const review = importedPage.getByRole("dialog", { name: "Review package contents" });
    await review.getByRole("button", { name: "Load package", exact: true }).click();
    await expect(review).toHaveCount(0);
    await openBiomedical(importedPage);

    const imagePanel = canonicalPanel(importedPage, IMAGE_PANEL_ID);
    const qmdPanel = canonicalPanel(importedPage, QMD_PANEL_ID);
    const mapPanel = canonicalPanel(importedPage, MAP_PANEL_ID);
    await scrollIntoView(imagePanel);
    await expect(imagePanel.locator('img[alt="Journey G image"]')).toBeVisible();
    await scrollIntoView(qmdPanel);
    await expect(qmdPanel.locator('img[alt="Journey G QMD image"]')).toBeVisible();
    await scrollIntoView(mapPanel);
    await expect(mapPanel.locator("canvas").first()).toBeVisible();
    expect(await journeySnapshot(importedPage)).toEqual(importedFixture);

    const offlineRequests = [];
    importedPage.on("request", (request) => {
      if (/^https?:/i.test(request.url())) offlineRequests.push(request.url());
    });
    await importedPage.getByLabel("Dashboard mode")
      .getByRole("button", { name: "View", exact: true }).click();
    await importedPage.setViewportSize({ width: 390, height: 844 });
    await context.setOffline(true);
    expect(await importedPage.evaluate(() => navigator.onLine)).toBe(false);
    const offlineQmd = canonicalPanel(importedPage, QMD_PANEL_ID);
    const offlineImage = canonicalPanel(importedPage, IMAGE_PANEL_ID);
    const offlineMap = canonicalPanel(importedPage, MAP_PANEL_ID);
    await scrollIntoView(offlineImage);
    await expect(offlineImage.locator('img[alt="Journey G image"]')).toBeVisible();
    await scrollIntoView(offlineQmd);
    await expect(offlineQmd.locator('img[alt="Journey G QMD image"]')).toBeVisible();
    await scrollIntoView(offlineMap);
    await expect(offlineMap.locator("canvas").first()).toBeVisible();
    const overflow = await importedPage.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    ));
    expect(overflow).toBe(false);
    await offlineQmd.getByRole("button", { name: "Focus chart" }).click();
    const fullscreen = importedPage.getByRole("dialog", { name: "Focused chart" });
    await expect(fullscreen.locator('img[alt="Journey G QMD image"]')).toBeVisible();
    expect(offlineRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

async function buildJourneyBundle(page) {
  const config = await page.evaluate(async (key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    const profilesResponse = await fetch("/config/dataset-profiles.json");
    if (!profilesResponse.ok) throw new Error("Journey G could not load the live dataset profiles.");
    stored.datasetProfiles = await profilesResponse.json();
    return stored;
  }, STORAGE_KEY);
  const pageConfig = config.pages.find((entry) => (entry.label ?? entry.title) === PAGE_LABEL);
  const section = pageConfig.sections.find((entry) => entry.id === "outbreak_dynamics") ?? pageConfig.sections[0];
  const charts = config.pages.flatMap(({ sections }) => sections).flatMap(({ panels }) => panels)
    .map((placement) => placement.chart ?? placement);
  const mapTemplate = charts.find(({ id }) => id === "bio_municipality_choropleth_animation")
    ?? charts.find((chart) => chart.presentation?.map?.geoSource);
  if (!mapTemplate) throw new Error("Journey G requires the accepted live map fixture.");

  const sha256 = sha256HexSync(PNG);
  const assetId = `asset-${sha256}`;
  config.assets ??= {};
  config.assets[assetId] = {
    mediaType: "image/png",
    byteLength: PNG.byteLength,
    width: 2,
    height: 3,
    sha256,
    storageState: "durable",
  };
  config.contentLibrary ??= { mediaItems: {}, sourceEntries: {} };
  config.contentLibrary.mediaItems[MEDIA_USED] = mediaItem(MEDIA_USED, assetId, 7, "Journey G used image");
  config.contentLibrary.mediaItems[MEDIA_UNUSED] = mediaItem(MEDIA_UNUSED, assetId, 2, "Journey G unused image");
  config.dataSources["journey-g-image-source"] = imageSource(MEDIA_USED, "Journey G image");
  config.dataSources["journey-g-qmd-source"] = {
    kind: "staticText",
    sourceVersion: 1,
    revision: 1,
    renderingPolicy: "portable-qmd-v1",
    qmd: `# Journey G\n\n![Journey G QMD image](simex-media:${MEDIA_USED}){width=50% align=center flow=block frame=outline caption="Portable image" decorative=false}`,
  };
  config.dataSources[CSV_ID] = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "journey-g.csv",
    csvText: "Datum,MunicipalityCode,infectionsPer10000\n2026-01-01,A,10\n2026-01-01,B,20\n",
    parsingMetadata: {
      Datum: { interpretation: "temporal", format: "YYYY-MM-DD", timezone: "date-only" },
      MunicipalityCode: { interpretation: "geographic" },
      infectionsPer10000: { interpretation: "numeric" },
    },
    provenance: { label: "Journey G CSV" },
  };
  config.dataSources[GEOJSON_ID] = {
    kind: "dataset",
    type: "uploadedGeoJson",
    fileName: "journey-g.geojson",
    geoJson: journeyGeoJson(),
    provenance: { label: "Journey G GeoJSON" },
  };
  config.contentLibrary.sourceEntries[CSV_ID] = sourceEntry(CSV_ID, "Journey G CSV", "journey-g.csv");
  config.contentLibrary.sourceEntries[GEOJSON_ID] = sourceEntry(GEOJSON_ID, "Journey G GeoJSON", "journey-g.geojson");
  delete config.datasetProfiles?.[GEOJSON_ID];

  section.panels.push(
    chartPlacement(IMAGE_PANEL_ID, "image", "Journey G Image", "journey-g-image-source"),
    chartPlacement(QMD_PANEL_ID, "freeText", "Journey G QMD", "journey-g-qmd-source"),
    {
      ...structuredClone(mapTemplate),
      id: MAP_PANEL_ID,
      title: "Journey G managed map",
      sourceId: CSV_ID,
      roles: {
        geography: { field: "MunicipalityCode" },
        value: { field: "infectionsPer10000" },
        time: { field: "Datum", interpretation: "temporal" },
      },
      presentation: {
        ...structuredClone(mapTemplate.presentation),
        map: {
          ...structuredClone(mapTemplate.presentation.map),
          geoSource: GEOJSON_ID,
          joinField: "statcode",
        },
      },
      layout: { size: "wide" },
    },
  );
  return serializeDashboardBundle(config, {
    now: "2026-08-26T12:00:00.000Z",
    assetPayloads: {
      [assetId]: {
        base64: encodeAssetBase64(PNG),
        byteLength: PNG.byteLength,
        mediaType: "image/png",
        sha256,
      },
    },
  });
}

async function importPackage(page, { name, value }) {
  await packageInput(page).setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value)),
  });
  const review = page.getByRole("dialog", { name: "Review package contents" });
  await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Load package", exact: true }).click();
  await expect(review).toHaveCount(0);
}

async function openBuild(page, { width, height, navigate = true }) {
  await page.setViewportSize({ width, height });
  if (navigate) await page.goto(APP_URL);
  await enterAuthoredDashboard(page);
  await openBiomedical(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
}

async function openBiomedical(page) {
  await openDashboardPage(page, "biomedical");
}

function packageInput(page) {
  return page.locator('input[type="file"][accept*="application/json"]').first();
}

function canonicalPanel(page, panelId) {
  return page.locator(`[data-panel-id="${panelId}"][data-canonical-panel-id]`);
}

async function scrollIntoView(locator) {
  await locator.evaluate((node) => node.scrollIntoView({ block: "center" }));
}

async function storedSnapshot(page) {
  return page.evaluate((key) => {
    const config = JSON.parse(localStorage.getItem(key));
    const charts = config.pages.flatMap(({ sections }) => sections).flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement);
    return {
      configVersion: config.configVersion,
      chartVersions: [...new Set(charts.map(({ configVersion }) => configVersion))].sort(),
      sourceEntryIds: Object.keys(config.contentLibrary?.sourceEntries ?? {}).sort(),
      temporalReviewCount: JSON.stringify(config).match(/"temporalReview"/g)?.length ?? 0,
    };
  }, STORAGE_KEY);
}

async function journeySnapshot(page) {
  return page.evaluate(({ key, ids }) => {
    const config = JSON.parse(localStorage.getItem(key));
    const qmd = config.dataSources["journey-g-qmd-source"]?.qmd ?? "";
    const charts = config.pages.flatMap(({ sections }) => sections).flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement);
    const uses = charts.filter(({ sourceId }) => (
      config.dataSources[sourceId]?.mediaId === ids.mediaUnused
    )).length + (qmd.match(new RegExp(`simex-media:${ids.mediaUnused}`, "g"))?.length ?? 0);
    return {
      configVersion: config.configVersion,
      mediaIds: [ids.mediaUnused, ids.mediaUsed].filter((id) => config.contentLibrary.mediaItems[id]).sort(),
      sourceIds: [ids.csv, ids.geo].filter((id) => config.contentLibrary.sourceEntries[id]).sort(),
      assetIds: [...new Set([ids.mediaUsed, ids.mediaUnused].map((id) => (
        config.contentLibrary.mediaItems[id].current.assetId
      )))],
      usedMediaId: config.dataSources["journey-g-image-source"].mediaId,
      unusedMediaUses: uses,
      chartVersions: [...new Set(charts.filter(({ id }) => [ids.imagePanel, ids.qmdPanel, ids.mapPanel].includes(id))
        .map(({ configVersion }) => configVersion))].sort(),
    };
  }, {
    key: STORAGE_KEY,
    ids: {
      mediaUsed: MEDIA_USED,
      mediaUnused: MEDIA_UNUSED,
      csv: CSV_ID,
      geo: GEOJSON_ID,
      imagePanel: IMAGE_PANEL_ID,
      qmdPanel: QMD_PANEL_ID,
      mapPanel: MAP_PANEL_ID,
    },
  });
}

function mediaItem(mediaId, assetId, revision, displayName) {
  return {
    mediaId,
    revision,
    current: { kind: "asset", assetId },
    displayName,
    defaultDescription: displayName,
    origin: "uploaded",
    health: "ready",
    dimensions: { width: 2, height: 3 },
    byteLength: PNG.byteLength,
    mediaType: "image/png",
  };
}

function imageSource(mediaId, alt) {
  return {
    kind: "staticImage",
    sourceVersion: 2,
    mediaId,
    alt,
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
}

function sourceEntry(sourceId, displayName, fileName) {
  return {
    sourceId,
    origin: "uploaded",
    ownership: "builder",
    displayName,
    provenance: { fileName },
    health: "ready",
  };
}

function chartPlacement(id, typeId, title, sourceId) {
  return {
    configVersion: 3,
    id,
    typeId,
    title,
    description: "",
    sourceId,
    roles: {},
    transformations: {
      filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap",
    },
    presentation: { title: { align: "left" }, collection: null },
    interaction: { zoom: { enabled: typeId === "image" }, timeSync: null },
    layout: { size: "wide" },
  };
}

function journeyGeoJson() {
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { statcode: "A" },
      geometry: { type: "Polygon", coordinates: [[[4, 51], [5, 51], [5, 52], [4, 51]]] },
    }, {
      type: "Feature",
      properties: { statcode: "B" },
      geometry: { type: "Polygon", coordinates: [[[5, 51], [6, 51], [6, 52], [5, 51]]] },
    }],
  };
}
