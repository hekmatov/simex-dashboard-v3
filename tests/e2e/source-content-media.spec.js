import { expect, test } from "@playwright/test";
import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const PNG = Buffer.from(imageFixtureBytes("image/png"));
const JPEG = Buffer.from(imageFixtureBytes("image/jpeg"));
const WEBP = Buffer.from(imageFixtureBytes("image/webp"));
const EXTERNAL_ID = "journey-a-external";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
});

test("Journey A — media create reuse default external import restore dependencies delete", async ({ page }) => {
  test.setTimeout(180_000);
  const externalRequests = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  let directFetchAllowed = false;
  await page.route("https://example.test/journey-a.png", async (route) => {
    externalRequests.push({ url: route.request().url(), type: route.request().resourceType() });
    if (route.request().resourceType() === "fetch" && !directFetchAllowed) {
      await route.abort("failed");
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      body: PNG,
    });
  });

  await openBiomedicalBuild(page, { width: 1440, height: 900 });
  await addExternalFixture(page);
  await page.reload();
  await openBiomedicalBuild(page, { width: 1440, height: 900 });
  await expect(page.getByRole("heading", { name: "HeV-A26 Dashboard: Epidemiological overview" })).toBeVisible();
  let manager = await openManager(page);

  const initial = await mediaInventory(page);
  let intake = await stageManagerFile(manager, "cancelled.png");
  expect(await sessionAssetIds(page)).toHaveLength(1);
  await intake.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect.poll(() => sessionAssetIds(page)).toEqual([]);
  expect(await mediaInventory(page)).toEqual(initial);

  intake = await stageManagerFile(manager, "escape.png");
  await intake.getByLabel("Display name").focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("complementary", { name: "Source content authoring" })).toHaveCount(0);
  await expect.poll(() => sessionAssetIds(page)).toEqual([]);
  expect(await mediaInventory(page)).toEqual(initial);
  await expect(page.getByRole("button", { name: "Source content", exact: true })).toBeFocused();

  manager = await openManager(page);
  await stageManagerFile(manager, "close.png");
  await closeManager(page);
  await expect.poll(() => sessionAssetIds(page)).toEqual([]);
  expect(await mediaInventory(page)).toEqual(initial);

  manager = await openManager(page);
  await stageManagerFile(manager, "mode-departure.png");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await expect.poll(() => sessionAssetIds(page)).toEqual([]);
  expect(await mediaInventory(page)).toEqual(initial);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();

  manager = await openManager(page);
  const invalidIntake = manager.getByRole("region", { name: "Add media to dashboard" });
  await invalidIntake.getByRole("button", { name: "Add media", exact: true }).click();
  await invalidIntake.getByLabel("PNG, JPEG, or WebP file").setInputFiles({
    name: "invalid.png", mimeType: "image/png", buffer: Buffer.from("not a raster image"),
  });
  await expect(invalidIntake.getByRole("alert")).toBeVisible();
  expect(await sessionAssetIds(page)).toEqual([]);
  expect(await mediaInventory(page)).toEqual(initial);
  await invalidIntake.getByRole("button", { name: "Cancel", exact: true }).click();

  intake = await stageManagerFile(manager, "journey-a.png");
  await intake.getByLabel("Display name").fill("Journey A map");
  await intake.getByLabel("Default description").fill("Default journey map description");
  await intake.getByRole("button", { name: "Add to dashboard" }).click();
  await expect(manager.getByText("Journey A map", { exact: true })).toBeVisible();
  const afterFirstAdd = await mediaInventory(page);
  expect(afterFirstAdd.logicalIds).toHaveLength(initial.logicalIds.length + 1);
  expect(afterFirstAdd.assetIds).toHaveLength(initial.assetIds.length + 1);
  expect(await sessionAssetIds(page)).toEqual([]);

  intake = await stageManagerFile(manager, "journey-a-reuse.png");
  await intake.getByLabel("Reuse existing").check();
  await intake.getByRole("button", { name: "Add to dashboard" }).click();
  expect(await mediaInventory(page)).toEqual(afterFirstAdd);

  intake = await stageManagerFile(manager, "journey-a-separate.png");
  await intake.getByLabel("Display name").fill("Journey A separate item");
  await intake.getByLabel("Create separate item").check();
  await intake.getByRole("button", { name: "Add to dashboard" }).click();
  const afterSeparate = await mediaInventory(page);
  expect(afterSeparate.logicalIds).toHaveLength(afterFirstAdd.logicalIds.length + 1);
  expect(afterSeparate.assetIds).toEqual(afterFirstAdd.assetIds);
  expect(await sharedMediaCorrespondence(page, ["Journey A map", "Journey A separate item"])).toEqual({
    logicalIdsDistinct: true,
    sameAsset: true,
    assetMatchesHash: true,
    manifestMatchesMedia: true,
  });

  await closeManager(page);
  await expect(page.getByRole("heading", { name: "HeV-A26 Dashboard: Epidemiological overview" })).toBeVisible();
  const beforeQmdDraft = await mediaInventory(page);
  let qmdDraft = await openFreeTextContentStage(page, "Cancelled QMD local upload");
  await qmdDraft.getByRole("button", { name: "Insert image" }).click();
  await qmdDraft.getByRole("region", { name: "Media picker" }).getByLabel("PNG, JPEG, or WebP file").setInputFiles({
    name: "qmd-cancelled-local.jpg", mimeType: "image/jpeg", buffer: JPEG,
  });
  await expect(qmdDraft.locator('[data-qmd-media-host] img')).toBeVisible();
  await expect(qmdDraft.getByLabel("QMD-style source")).toContainText("simex-media:media-");
  expect(await sessionAssetIds(page)).toHaveLength(1);
  expect(await mediaInventory(page)).toEqual(beforeQmdDraft);
  await discardStaticWizard(page, qmdDraft);
  await expect.poll(() => sessionAssetIds(page)).toEqual([]);
  expect(await mediaInventory(page)).toEqual(beforeQmdDraft);
  await expect(page.getByRole("button", { name: "Add static content", exact: true })).toBeFocused();

  qmdDraft = await openFreeTextContentStage(page, "Journey A imported QMD");
  await qmdDraft.getByRole("button", { name: "Insert image" }).click();
  const qmdPicker = qmdDraft.getByRole("region", { name: "Media picker" });
  await qmdPicker.getByRole("button", { name: "Import as local media" }).click();
  await qmdPicker.getByRole("button", { name: "Try direct HTTPS import" }).click();
  await expect(qmdPicker.getByRole("alert")).toContainText("Choose a local file upload instead");
  expect(await sessionAssetIds(page)).toEqual([]);
  expect(await mediaInventory(page)).toEqual(beforeQmdDraft);
  await qmdPicker.getByLabel("Or choose a local copy").setInputFiles({
    name: "qmd-imported-local.webp", mimeType: "image/webp", buffer: WEBP,
  });
  await expect(qmdDraft.locator('[data-qmd-media-host] img')).toBeVisible();
  await expect(qmdDraft.getByLabel("QMD-style source")).toContainText("![External journey description](simex-media:media-");
  expect(await mediaInventory(page)).toEqual(beforeQmdDraft);
  await qmdDraft.getByRole("button", { name: "Continue" }).click();
  await qmdDraft.getByRole("button", { name: "Add", exact: true }).click();
  await expect(qmdDraft).toHaveCount(0);
  await expect.poll(() => sessionAssetIds(page)).toEqual([]);
  const afterQmdImport = await mediaInventory(page);
  expect(afterQmdImport.logicalIds).toHaveLength(beforeQmdDraft.logicalIds.length + 1);
  expect(afterQmdImport.assetIds).toHaveLength(beforeQmdDraft.assetIds.length + 1);

  const externalPanelId = await createImageFromPicker(page, {
    title: "Journey A external image",
    mediaName: "Journey A external map",
    expectedAlt: "External journey description",
  });
  const qmdPanelId = await createQmdFromPicker(page, {
    title: "Journey A QMD",
    mediaName: "Journey A map",
    expectedAlt: "Default journey map description",
  });

  manager = await openManager(page);
  await selectMediaRow(manager, "Journey A map");
  await manager.getByLabel("Default description").fill("Changed default for future placements");
  await manager.getByRole("button", { name: "Save metadata" }).click();
  await closeManager(page);
  const futureDefaultPanelId = await createImageFromPicker(page, {
    title: "Journey A future default image",
    mediaName: "Journey A map",
    expectedAlt: "Changed default for future placements",
  });
  expect(await persistedStaticQmd(page, qmdPanelId)).toContain("![Default journey map description](simex-media:");
  expect(await persistedStaticQmd(page, qmdPanelId)).not.toContain("Changed default for future placements");
  expect(await persistedStaticAlt(page, futureDefaultPanelId)).toBe("Changed default for future placements");

  const imagePanel = page.locator(`[data-panel-id="${externalPanelId}"]`);
  await imagePanel.scrollIntoViewIfNeeded();
  await imagePanel.getByLabel("Journey A external image actions").getByRole("button", { name: "Edit chart" }).click();
  const editor = page.getByRole("dialog", { name: "Edit static content" });
  await editor.getByRole("button", { name: "Choose from media" }).click();
  await editor.getByLabel(/Journey A separate item/).evaluate((node) => node.click());
  await expect(editor.getByText("Replacement selected. Save, discard, or restore the previous image.")).toBeVisible();
  const restore = editor.getByRole("button", { name: "Restore previous image" });
  await expect(restore).toBeVisible();
  await restore.click();
  await expect(restore).toHaveCount(0);
  await expect(editor.getByLabel("Alternative text")).toHaveValue("External journey description");
  await editor.getByRole("button", { name: "Choose from media" }).click();
  await editor.getByLabel(/Journey A separate item/).evaluate((node) => node.click());
  await editor.getByRole("button", { name: "Continue" }).click();
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const savedReplacementMediaId = await persistedStaticMediaId(page, externalPanelId);
  expect(savedReplacementMediaId).not.toBe(EXTERNAL_ID);

  await imagePanel.getByLabel("Journey A external image actions").getByRole("button", { name: "Edit chart" }).click();
  await expect(editor.getByRole("button", { name: "Restore previous image" })).toHaveCount(0);
  await editor.getByRole("button", { name: "Choose from media" }).click();
  await editor.getByLabel(/Journey A external map/).evaluate((node) => node.click());
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  const discardDialog = page.getByRole("dialog", { name: "Discard static content changes?" });
  await discardDialog.getByRole("button", { name: "Discard" }).click();
  await expect(editor).toHaveCount(0);
  expect(await persistedStaticMediaId(page, externalPanelId)).toBe(savedReplacementMediaId);

  await imagePanel.getByLabel("Journey A external image actions").getByRole("button", { name: "Edit chart" }).click();
  await editor.getByRole("button", { name: "Choose from media" }).click();
  await editor.getByLabel(/Journey A external map/).evaluate((node) => node.click());
  await editor.getByRole("button", { name: "Continue" }).click();
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect(await persistedStaticMediaId(page, externalPanelId)).toBe(EXTERNAL_ID);

  manager = await openManager(page);
  await selectMediaRow(manager, "Journey A external map");
  await expect(manager).toContainText("1 use");
  await expect(manager.getByRole("button", { name: "Delete", exact: true })).toBeDisabled();
  await expect(manager).toContainText("Journey A external image");
  await expect(page.getByRole("dialog", { name: /Delete/ })).toHaveCount(0);

  const importCard = manager.getByRole("region", { name: "Import Journey A external map as local media" });
  await importCard.getByRole("button", { name: "Import as local media" }).click();
  directFetchAllowed = true;
  await importCard.getByRole("button", { name: "Try direct HTTPS import" }).click();
  await expect(importCard.getByLabel("Display name")).toBeVisible();
  await importCard.getByLabel("Display name").fill("Journey A imported local");
  await importCard.getByLabel("Create separate item").check();
  const importAdd = importCard.getByRole("button", { name: "Add to dashboard" });
  await expect(importAdd).toBeEnabled();
  await importAdd.click();
  expect(externalRequests.filter(({ type }) => type === "fetch")).toEqual([
    { url: "https://example.test/journey-a.png", type: "fetch" },
    { url: "https://example.test/journey-a.png", type: "fetch" },
  ]);
  expect(new Set(externalRequests.map(({ url }) => url))).toEqual(new Set(["https://example.test/journey-a.png"]));
  const continuity = await externalContinuity(page, externalPanelId);
  expect(continuity).toEqual({ mediaId: EXTERNAL_ID, externalRevision: 1, externalCurrentKind: "url" });

  if ((await manager.getByRole("button", { name: "Back", exact: true }).count()) > 0) {
    await manager.getByRole("button", { name: "Back", exact: true }).click();
  }
  await selectMediaRow(manager, "Journey A imported local");
  const eligibleDelete = manager.getByRole("button", { name: "Delete", exact: true });
  await expect(eligibleDelete).toBeEnabled();
  await eligibleDelete.click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete Journey A imported local?" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(manager.getByText("Journey A imported local", { exact: true })).toHaveCount(0);

  await closeManager(page);
  await page.reload();
  await openBiomedicalBuild(page, { width: 1024, height: 768 });
  manager = await openManager(page);
  await expect(manager).toHaveAttribute("data-manager-layout", "tablet");
  await selectMediaRow(manager, "Journey A map");
  await expect(manager.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await closeManager(page);

  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const qmdPanel = page.locator(`[data-panel-id="${qmdPanelId}"]`);
  await qmdPanel.scrollIntoViewIfNeeded();
  await expect(qmdPanel.locator('img[alt="Default journey map description"]')).toBeVisible();
  await expect(qmdPanel).toHaveAttribute("data-footprint");
  expect(pageErrors).toEqual([]);
});

async function openBiomedicalBuild(page, viewport) {
  await page.setViewportSize(viewport);
  if (page.url() === "about:blank") await page.goto("http://127.0.0.1:4175/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  const biomedical = page.locator(".dashboard-command-page-scroller").getByRole("button", { name: "Biomedical", exact: true });
  if (await biomedical.count()) await biomedical.click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
}

async function openManager(page) {
  await page.getByRole("button", { name: "Source content", exact: true }).click();
  const manager = page.locator(".source-content-workspace");
  await expect(manager).toBeVisible();
  return manager;
}

async function closeManager(page) {
  const host = page.getByRole("complementary", { name: "Source content authoring" });
  await host.getByRole("button", { name: "Close", exact: true }).click();
  await expect(host).toHaveCount(0);
}

async function stageManagerFile(manager, name) {
  const intake = manager.getByRole("region", { name: "Add media to dashboard" });
  await intake.getByRole("button", { name: "Add media", exact: true }).click();
  await intake.getByLabel("PNG, JPEG, or WebP file").setInputFiles({ name, mimeType: "image/png", buffer: PNG });
  await expect(intake.getByLabel("Display name")).toBeVisible();
  return intake;
}

async function selectMediaRow(manager, name) {
  const row = manager.locator(".source-content-row").filter({ hasText: name }).first();
  await expect(row).toBeVisible();
  await row.click();
}

async function createImageFromPicker(page, { title, mediaName, expectedAlt }) {
  await page.getByRole("button", { name: "Add static content", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add static content" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Image").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(title);
  await wizard.getByRole("button", { name: "Choose from media" }).click();
  await wizard.getByLabel(new RegExp(mediaName)).evaluate((node) => node.click());
  await expect(wizard.getByLabel("Alternative text")).toHaveValue(expectedAlt);
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  const panelId = await findPersistedPanelId(page, title);
  expect(panelId).not.toBeNull();
  await expect(page.getByLabel(`${title} actions`)).toBeVisible();
  return panelId;
}

async function openFreeTextContentStage(page, title) {
  await page.getByRole("button", { name: "Add static content", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add static content" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(title);
  return wizard;
}

async function discardStaticWizard(page, wizard) {
  await wizard.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard static content changes?" }).getByRole("button", { name: "Discard" }).click();
  await expect(wizard).toHaveCount(0);
}

async function createQmdFromPicker(page, { title, mediaName, expectedAlt }) {
  await page.getByRole("button", { name: "Add static content", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add static content" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(title);
  await wizard.getByRole("button", { name: "Insert image" }).click();
  await wizard.getByLabel(new RegExp(mediaName)).evaluate((node) => node.click());
  await expect(wizard.getByLabel("QMD-style source")).toContainText(`![${expectedAlt}](simex-media:`);
  await expect(wizard.getByText("Preview is up to date.")).toBeVisible();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  const panelId = await findPersistedPanelId(page, title);
  expect(panelId).not.toBeNull();
  await expect(page.getByLabel(`${title} actions`)).toBeVisible();
  return panelId;
}

async function findPersistedPanelId(page, title) {
  return page.evaluate(({ key, expectedTitle }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    for (const pageItem of dashboard.pages ?? []) {
      for (const section of pageItem.sections ?? []) {
        for (const placement of section.panels ?? []) {
          const panel = placement.chart ?? placement;
          if (panel.title === expectedTitle) return panel.id;
        }
      }
    }
    return null;
  }, { key: STORAGE_KEY, expectedTitle: title });
}

async function persistedStaticAlt(page, panelId) {
  return persistedStaticSourceField(page, panelId, "alt");
}

async function persistedStaticQmd(page, panelId) {
  return persistedStaticSourceField(page, panelId, "qmd");
}

async function persistedStaticMediaId(page, panelId) {
  return persistedStaticSourceField(page, panelId, "mediaId");
}

async function persistedStaticSourceField(page, panelId, field) {
  return page.evaluate(({ key, expectedPanelId, expectedField }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const placements = dashboard.pages.flatMap((item) => item.sections.flatMap((section) => section.panels));
    const placement = placements.find((entry) => (entry.chart ?? entry).id === expectedPanelId);
    const panel = placement.chart ?? placement;
    return dashboard.dataSources[panel.sourceId]?.[expectedField] ?? null;
  }, { key: STORAGE_KEY, expectedPanelId: panelId, expectedField: field });
}

async function addExternalFixture(page) {
  await page.evaluate(async ({ key, mediaId }) => {
    const stored = localStorage.getItem(key);
    const input = stored === null
      ? await fetch("/config/dashboard.json").then((response) => response.json())
      : JSON.parse(stored);
    const profiles = await fetch("/config/dataset-profiles.json").then((response) => response.json());
    const { normalizeDashboardSource } = await import("/src/lib/loadDashboard.js");
    const dashboard = normalizeDashboardSource(input, profiles);
    dashboard.contentLibrary.mediaItems[mediaId] = {
      mediaId,
      revision: 1,
      current: { kind: "url", url: "https://example.test/journey-a.png" },
      displayName: "Journey A external map",
      defaultDescription: "External journey description",
      origin: "external",
      health: "external",
    };
    const { validateConfigurationForPersistence } = await import("/src/lib/dashboardPersistenceValidation.js");
    validateConfigurationForPersistence(dashboard, profiles);
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, { key: STORAGE_KEY, mediaId: EXTERNAL_ID });
}

async function mediaInventory(page) {
  return page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return {
      logicalIds: Object.keys(dashboard.contentLibrary.mediaItems).sort(),
      assetIds: Object.keys(dashboard.assets ?? {}).sort(),
    };
  }, STORAGE_KEY);
}

async function sharedMediaCorrespondence(page, names) {
  return page.evaluate(({ key, expectedNames }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const items = expectedNames.map((name) => Object.values(dashboard.contentLibrary.mediaItems)
      .find((item) => item.displayName === name));
    const logicalIds = items.map((item) => item?.mediaId);
    const assetIds = items.map((item) => item?.current?.assetId);
    const manifest = dashboard.assets[assetIds[0]];
    return {
      logicalIdsDistinct: new Set(logicalIds).size === expectedNames.length && logicalIds.every(Boolean),
      sameAsset: assetIds.every((id) => id === assetIds[0]),
      assetMatchesHash: assetIds[0] === `asset-${manifest?.sha256}`,
      manifestMatchesMedia: items.every((item) => item?.mediaType === manifest?.mediaType
        && item?.byteLength === manifest?.byteLength
        && item?.dimensions?.width === manifest?.width
        && item?.dimensions?.height === manifest?.height),
    };
  }, { key: STORAGE_KEY, expectedNames: names });
}

async function externalContinuity(page, panelId) {
  return page.evaluate(({ key, expectedPanelId, mediaId }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const placements = dashboard.pages.flatMap((item) => item.sections.flatMap((section) => section.panels));
    const placement = placements.find((entry) => (entry.chart ?? entry).id === expectedPanelId);
    const panel = placement.chart ?? placement;
    const source = dashboard.dataSources[panel.sourceId];
    const external = dashboard.contentLibrary.mediaItems[mediaId];
    return { mediaId: source.mediaId, externalRevision: external.revision, externalCurrentKind: external.current.kind };
  }, { key: STORAGE_KEY, expectedPanelId: panelId, mediaId: EXTERNAL_ID });
}

async function sessionAssetIds(page) {
  return page.evaluate(() => {
    const key = Object.getOwnPropertySymbols(globalThis).find((symbol) => Symbol.keyFor(symbol) === "simex.session-image-assets");
    return key ? [...globalThis[key].keys()].sort() : [];
  });
}
