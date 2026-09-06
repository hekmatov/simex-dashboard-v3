import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const PNG = Buffer.from(imageFixtureBytes("image/png"));
const JPEG = Buffer.from(imageFixtureBytes("image/jpeg"));
const JPEG_SHA256 = createHash("sha256").update(JPEG).digest("hex");
const WEBP = Buffer.from(imageFixtureBytes("image/webp"));
const EXTERNAL_ID = "journey-a-external";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
});

test("retry and resume Source Content under one stable owner", async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript((storageKey) => {
    globalThis.__SOURCE_CONTENT_UNHANDLED__ = [];
    addEventListener("unhandledrejection", (event) => {
      globalThis.__SOURCE_CONTENT_UNHANDLED__.push(String(event.reason?.message ?? event.reason));
    });
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function sourceContentSetItem(key, value) {
      if (key === storageKey && globalThis.__SOURCE_CONTENT_FAIL_ONCE__ === true) {
        globalThis.__SOURCE_CONTENT_FAIL_ONCE__ = false;
        throw new DOMException("Injected Source Content persistence failure", "QuotaExceededError");
      }
      return original.call(this, key, value);
    };
  }, STORAGE_KEY);

  await openBiomedicalBuild(page, { width: 1440, height: 900 });
  await persistDefaultDashboard(page);
  await page.reload();
  await openBiomedicalBuild(page, { width: 1440, height: 900 });
  const initial = await mediaInventory(page);
  let manager = await openManager(page);
  const intake = await stageManagerFile(manager, "recoverable-source-content.png");
  const displayName = intake.getByLabel("Display name");
  await displayName.fill("Recoverable Source Content map");
  const sourceSurface = page.locator('aside[data-authoring-surface="source-content"]');
  await closeManager(page);
  expect(pageErrors).toEqual([]);
  await expect(sourceSurface).toHaveAttribute("hidden", "");
  await expect(sourceSurface).toBeHidden();
  await expect(page.getByRole("complementary", { name: "Source content authoring" })).toHaveCount(0);
  expect(await sessionAssetIds(page)).toHaveLength(1);

  const owner = page.locator('[data-pending-work-kind="source-content-create"]');
  await expect(owner).toHaveCount(1);
  const ownerId = await owner.getAttribute("data-pending-work-id");
  await expect(owner).toHaveAttribute("data-pending-work-state", "dirty");
  await expect(owner).toHaveAttribute("data-pending-work-activity", "suspended");
  await owner.getByRole("button", { name: "Resume New Source Content draft" }).click();
  manager = page.locator(".source-content-workspace");
  await expect(manager).toBeVisible();

  await page.evaluate(() => { globalThis.__SOURCE_CONTENT_FAIL_ONCE__ = true; });
  await intake.getByRole("button", { name: "Add to dashboard" }).click();
  await expect(intake.getByRole("alert")).toBeVisible();
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute("data-pending-work-id", ownerId);
  await expect(owner).toHaveAttribute("data-pending-work-state", "error");
  expect(await mediaInventory(page)).toEqual(initial);
  expect(await sessionAssetIds(page)).toHaveLength(1);

  const description = intake.getByLabel("Default description");
  await description.fill("Retained retry description");
  const catalogue = manager.locator(".source-content-catalogue");
  const catalogueScroll = await catalogue.evaluate((node) => {
    node.style.height = "120px";
    node.style.minHeight = "0";
    node.style.maxHeight = "120px";
    node.style.overflowY = "auto";
    node.scrollTop = Math.min(140, node.scrollHeight - node.clientHeight);
    return { maximum: node.scrollHeight - node.clientHeight, position: node.scrollTop };
  });
  expect(catalogueScroll.maximum).toBeGreaterThan(0);
  expect(catalogueScroll.position).toBeGreaterThan(0);
  await closeManager(page);
  await expect(owner).toHaveAttribute("data-pending-work-id", ownerId);
  await expect(owner).toHaveAttribute("data-pending-work-state", "error");
  await expect(owner).toHaveAttribute("data-pending-work-activity", "suspended");
  await owner.getByRole("button", { name: "Resume New Source Content draft" }).click();
  await expect.poll(() => catalogue.evaluate((node) => node.scrollTop))
    .toBe(catalogueScroll.position);
  await intake.getByRole("button", { name: "Add to dashboard" }).click();
  await expect(owner).toHaveCount(0);
  await expect(manager.getByRole("region", { name: "Media catalogue" })
    .getByText("Recoverable Source Content map", { exact: true })).toBeVisible();
  await expect.poll(() => sessionAssetIds(page)).toEqual([]);
  expect((await mediaInventory(page)).logicalIds).toHaveLength(initial.logicalIds.length + 1);
  expect(pageErrors).toEqual([]);
  expect(await page.evaluate(() => globalThis.__SOURCE_CONTENT_UNHANDLED__)).toEqual([]);
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

  manager = await openManager(page);
  intake = await stageManagerFile(manager, "close.png");
  await closeManager(page);
  expect(await sessionAssetIds(page)).toHaveLength(1);
  const suspendedOwner = page.locator('[data-pending-work-kind="source-content-create"]');
  await expect(suspendedOwner).toHaveCount(1);
  await suspendedOwner.getByRole("button", { name: "Resume New Source Content draft" }).click();
  await intake.getByRole("button", { name: "Cancel", exact: true }).click();
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
  await commitManagerIntake(page, intake);
  await expect(manager.getByText("Journey A map", { exact: true })).toBeVisible();
  const afterFirstAdd = await mediaInventory(page);
  expect(afterFirstAdd.logicalIds).toHaveLength(initial.logicalIds.length + 1);
  expect(afterFirstAdd.assetIds).toHaveLength(initial.assetIds.length + 1);
  expect(await sessionAssetIds(page)).toEqual([]);

  intake = await stageManagerFile(manager, "journey-a-reuse.png");
  const reuseChoice = intake.getByLabel("Reuse existing");
  await reuseChoice.check();
  await expect(reuseChoice).toBeChecked();
  await commitManagerIntake(page, intake);
  expect(await mediaInventory(page)).toEqual(afterFirstAdd);

  intake = await stageManagerFile(manager, "journey-a-separate.png");
  await intake.getByLabel("Display name").fill("Journey A separate item");
  const separateChoice = intake.getByLabel("Create separate item");
  await separateChoice.check();
  await expect(separateChoice).toBeChecked();
  await commitManagerIntake(page, intake);
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
  expect(await (await rawQmdSource(qmdDraft)).inputValue()).toContain("simex-media:media-");
  expect(await sessionAssetIds(page)).toHaveLength(1);
  expect(await mediaInventory(page)).toEqual(beforeQmdDraft);
  await discardStaticWizard(page, qmdDraft);
  await expect.poll(() => sessionAssetIds(page)).toEqual([]);
  expect(await mediaInventory(page)).toEqual(beforeQmdDraft);

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
  expect(await (await rawQmdSource(qmdDraft)).inputValue())
    .toContain("![External journey description](simex-media:media-");
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
  const editor = await openTextImageEditor(page, imagePanel, "Journey A external image");
  await editor.getByRole("radio", { name: /Journey A separate item/ }).click();
  await expect(editor.getByText("Replacement selected. Save, discard, or restore the previous image.")).toBeVisible();
  const restore = editor.getByRole("button", { name: "Restore previous image" });
  await expect(restore).toBeVisible();
  await restore.click();
  await expect(restore).toHaveCount(0);
  await expect(editor.getByLabel("Alternative text")).toHaveValue("External journey description");
  await editor.getByRole("radio", { name: /Journey A separate item/ }).click();
  await editor.getByRole("button", { name: "Continue" }).click();
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const savedReplacementMediaId = await persistedStaticMediaId(page, externalPanelId);
  expect(savedReplacementMediaId).not.toBe(EXTERNAL_ID);

  await openTextImageEditor(page, imagePanel, "Journey A external image");
  await expect(editor.getByRole("button", { name: "Restore previous image" })).toHaveCount(0);
  await editor.getByRole("radio", { name: /Journey A external map/ }).click();
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  const discardDialog = page.getByRole("dialog", { name: "Discard Text/Image changes?" });
  await discardDialog.getByRole("button", { name: "Discard" }).click();
  await expect(editor).toHaveCount(0);
  expect(await persistedStaticMediaId(page, externalPanelId)).toBe(savedReplacementMediaId);

  await openTextImageEditor(page, imagePanel, "Journey A external image");
  await editor.getByRole("radio", { name: /Journey A external map/ }).click();
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
  await commitManagerIntake(page, importCard);
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

test("Journey B — global media replacement preserves placement state", async ({ page }) => {
  test.setTimeout(180_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openBiomedicalBuild(page, { width: 1440, height: 900 });

  let manager = await openManager(page);
  const intake = await stageManagerFile(manager, "journey-b-original.png");
  await intake.getByLabel("Display name").fill("Journey B shared media");
  await intake.getByLabel("Default description").fill("Journey B default alt");
  await commitManagerIntake(page, intake);
  await closeManager(page);

  const imagePanelId = await createImageFromPicker(page, {
    title: "Journey B image",
    mediaName: "Journey B shared media",
    expectedAlt: "Journey B default alt",
  });
  const qmdPanelId = await createQmdFromPicker(page, {
    title: "Journey B QMD",
    mediaName: "Journey B shared media",
    expectedAlt: "Journey B default alt",
  });
  await configureJourneyBPlacements(page, { imagePanelId, qmdPanelId });
  await page.reload();
  await openBiomedicalBuild(page, { width: 1440, height: 900 });

  const before = await journeyBState(page, { imagePanelId, qmdPanelId });
  const imagePanel = page.locator(`[data-panel-id="${imagePanelId}"]`);
  await imagePanel.scrollIntoViewIfNeeded();
  const imageView = imagePanel.locator(".chart-image-view");
  await expect(imageView.locator('img[alt="Journey B contextual image alt"]')).toBeVisible();
  await imageView.getByRole("button", { name: "Zoom in" }).click();
  await imageView.getByRole("button", { name: "Zoom in" }).click();
  await expect(imageView).toHaveAttribute("data-image-zoom-scale", "1.5");

  manager = await openManager(page);
  await selectMediaRow(manager, "Journey B shared media");
  const replaceTrigger = manager.getByRole("button", { name: "Replace library file everywhere" });
  const replacementBaseline = await replacementInventory(page, `asset-${JPEG_SHA256}`);

  await replaceTrigger.click();
  let dialog = page.getByRole("dialog", { name: "Replace Journey B shared media everywhere?" });
  await dialog.getByLabel("Replacement image").setInputFiles({
    name: "journey-b-replacement.jpg", mimeType: "image/jpeg", buffer: JPEG,
  });
  await expect(dialog.getByText("Ready: journey-b-replacement.jpg")).toBeVisible();
  await expect(manager.getByText("Active work retains this item: media-replacement.")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(manager.getByText("Active work retains this item: media-replacement.")).toHaveCount(0);
  expect(await replacementInventory(page, `asset-${JPEG_SHA256}`)).toEqual(replacementBaseline);

  await replaceTrigger.click();
  dialog = page.getByRole("dialog", { name: "Replace Journey B shared media everywhere?" });

  await dialog.getByLabel("Replacement image").setInputFiles({
    name: "invalid.png", mimeType: "image/png", buffer: Buffer.from("not a raster"),
  });
  await expect(dialog.getByRole("alert")).toBeVisible();
  expect(await journeyBState(page, { imagePanelId, qmdPanelId })).toEqual(before);

  await dialog.getByLabel("Replacement image").setInputFiles({
    name: "journey-b-replacement.jpg", mimeType: "image/jpeg", buffer: JPEG,
  });
  await expect(dialog.getByText("Ready: journey-b-replacement.jpg")).toBeVisible();
  await dialog.getByRole("button", { name: "Replace everywhere" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(manager.getByRole("status")).toContainText("revision 2");

  const after = await journeyBState(page, { imagePanelId, qmdPanelId });
  expect(after.mediaId).toBe(before.mediaId);
  expect(after.revision).toBe(before.revision + 1);
  expect(after.assetId).not.toBe(before.assetId);
  expect(after.hash).not.toBe(before.hash);
  expect(after.hash).toBe(JPEG_SHA256);
  expect(after.imagePlacement).toEqual(before.imagePlacement);
  expect(after.qmd).toBe(before.qmd);
  await expect(imageView).toHaveAttribute("data-image-media-id", before.mediaId);
  await expect(imageView).toHaveAttribute("data-image-media-revision", "2");
  await expect(imageView).toHaveAttribute("data-image-zoom-scale", "1.5");
  const qmdPanel = page.locator(`[data-panel-id="${qmdPanelId}"]`);
  await expect(qmdPanel.locator(`[data-qmd-media-id="${before.mediaId}"][data-qmd-media-revision]`)).toHaveAttribute("data-qmd-media-revision", "2");
  const qmdImage = qmdPanel.locator('img[alt="Journey B contextual QMD alt"]');
  await expect(qmdImage).toBeVisible();
  expect(await renderedImageHash(qmdImage)).toBe(JPEG_SHA256);
  expect(await renderedImageHash(imageView.locator('img[alt="Journey B contextual image alt"]'))).toBe(JPEG_SHA256);

  await closeManager(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  const viewImage = page.locator(`[data-panel-id="${imagePanelId}"] img[alt="Journey B contextual image alt"]`);
  const viewQmd = page.locator(`[data-panel-id="${qmdPanelId}"] img[alt="Journey B contextual QMD alt"]`);
  await expect(viewImage).toBeVisible();
  await expect(viewQmd).toBeVisible();
  expect(await renderedImageHash(viewImage)).toBe(JPEG_SHA256);
  await expect(page.locator(`[data-panel-id="${qmdPanelId}"] [data-qmd-media-id="${before.mediaId}"][data-qmd-media-revision]`)).toHaveAttribute("data-qmd-media-revision", "2");
  await page.locator(`[data-panel-id="${imagePanelId}"]`).getByRole("button", { name: "Focus chart" }).click();
  const fullscreen = page.getByRole("dialog", { name: "Focused chart" });
  const fullscreenImage = fullscreen.locator('img[alt="Journey B contextual image alt"]');
  await expect(fullscreenImage).toBeVisible();
  expect(await renderedImageHash(fullscreenImage)).toBe(JPEG_SHA256);
  await expect(fullscreen.locator(".chart-image-view")).toHaveAttribute("data-image-media-revision", "2");
  await fullscreen.getByRole("button", { name: "Exit fullscreen" }).click();
  await page.locator(`[data-panel-id="${qmdPanelId}"]`).getByRole("button", { name: "Focus chart" }).click();
  const qmdFullscreen = page.getByRole("dialog", { name: "Focused chart" });
  const fullscreenQmd = qmdFullscreen.locator('img[alt="Journey B contextual QMD alt"]');
  await expect(fullscreenQmd).toBeVisible();
  expect(await renderedImageHash(fullscreenQmd)).toBe(JPEG_SHA256);
  await expect(qmdFullscreen.locator(`[data-qmd-media-id="${before.mediaId}"][data-qmd-media-revision]`)).toHaveAttribute("data-qmd-media-revision", "2");
  await qmdFullscreen.getByRole("button", { name: "Exit fullscreen" }).click();
  expect(pageErrors).toEqual([]);
});

async function openBiomedicalBuild(page, viewport) {
  await page.setViewportSize(viewport);
  if (page.url() === "about:blank") await page.goto("http://127.0.0.1:4175/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
}

async function configureJourneyBPlacements(page, { imagePanelId, qmdPanelId }) {
  await page.evaluate(({ key, expectedImagePanelId, expectedQmdPanelId }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const panels = dashboard.pages.flatMap((item) => item.sections.flatMap((section) => section.panels));
    const imagePanel = panels.find((entry) => (entry.chart ?? entry).id === expectedImagePanelId);
    const qmdPanel = panels.find((entry) => (entry.chart ?? entry).id === expectedQmdPanelId);
    const imageSource = dashboard.dataSources[(imagePanel.chart ?? imagePanel).sourceId];
    const qmdSource = dashboard.dataSources[(qmdPanel.chart ?? qmdPanel).sourceId];
    imageSource.alt = "Journey B contextual image alt";
    imageSource.decorative = false;
    imageSource.fit = "cover";
    imageSource.crop = { x: 125, y: 250, width: 650, height: 500 };
    imageSource.rotation = 90;
    qmdSource.qmd = `![Journey B contextual QMD alt](simex-media:${imageSource.mediaId}){width=45% align=end flow=wrap-start frame=card caption="Journey B caption"}`;
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, { key: STORAGE_KEY, expectedImagePanelId: imagePanelId, expectedQmdPanelId: qmdPanelId });
}

async function journeyBState(page, { imagePanelId, qmdPanelId }) {
  return page.evaluate(({ key, expectedImagePanelId, expectedQmdPanelId }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const panels = dashboard.pages.flatMap((item) => item.sections.flatMap((section) => section.panels));
    const imagePanel = panels.find((entry) => (entry.chart ?? entry).id === expectedImagePanelId);
    const qmdPanel = panels.find((entry) => (entry.chart ?? entry).id === expectedQmdPanelId);
    const imageSource = dashboard.dataSources[(imagePanel.chart ?? imagePanel).sourceId];
    const qmdSource = dashboard.dataSources[(qmdPanel.chart ?? qmdPanel).sourceId];
    const media = dashboard.contentLibrary.mediaItems[imageSource.mediaId];
    const manifest = dashboard.assets[media.current.assetId];
    return {
      mediaId: media.mediaId,
      revision: media.revision,
      assetId: media.current.assetId,
      hash: manifest.sha256,
      imagePlacement: imageSource,
      qmd: qmdSource.qmd,
    };
  }, { key: STORAGE_KEY, expectedImagePanelId: imagePanelId, expectedQmdPanelId: qmdPanelId });
}

async function replacementInventory(page, candidateAssetId) {
  return page.evaluate(async ({ key, expectedCandidateAssetId }) => {
    const { browserAuthoredAssetStore } = await import("/src/static-content/assets/browserAuthoredAssetRuntime.js");
    const { readSessionImageAssetBytes } = await import("/src/static-content/image/imageAssetValidation.js");
    const records = await browserAuthoredAssetStore.list();
    const normalizedRecords = records
      .map((record) => ({
        ...record,
        bytes: record.bytes ? Array.from(record.bytes) : null,
        transactionIds: [...(record.transactionIds ?? [])].sort(),
      }))
      .sort((left, right) => String(left.assetId).localeCompare(String(right.assetId)));
    const sessionBytes = readSessionImageAssetBytes(expectedCandidateAssetId);
    return {
      dashboard: localStorage.getItem(key),
      store: JSON.stringify(normalizedRecords),
      session: sessionBytes ? Array.from(sessionBytes) : null,
    };
  }, { key: STORAGE_KEY, expectedCandidateAssetId: candidateAssetId });
}

async function renderedImageHash(image) {
  return image.evaluate(async (node) => {
    const response = await fetch(node.currentSrc || node.src);
    const digest = await crypto.subtle.digest("SHA-256", await response.arrayBuffer());
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  });
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

async function commitManagerIntake(page, intake) {
  const pendingDraft = page.locator('[data-pending-work-kind="source-content-create"]');
  await expect(pendingDraft).toHaveCount(1);
  await intake.getByRole("button", { name: "Add to dashboard" }).click();
  await expect(pendingDraft).toHaveCount(0);
}

async function selectMediaRow(manager, name) {
  const row = manager.locator(".source-content-row").filter({ hasText: name }).first();
  await expect(row).toBeVisible();
  await row.click();
}

async function createImageFromPicker(page, { title, mediaName, expectedAlt }) {
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("radio", { name: /^Image / }).check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(title);
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

async function openTextImageEditor(page, panel, title) {
  await panel.hover();
  await panel.getByLabel(`${title} actions`)
    .getByRole("button", { name: "Edit chart", exact: true })
    .click();
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Text/Image editor" });
  await expect(editor).toBeVisible();
  return editor;
}

async function openFreeTextContentStage(page, title) {
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(title);
  return wizard;
}

async function discardStaticWizard(page, wizard) {
  await wizard.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard Text/Image changes?" }).getByRole("button", { name: "Discard" }).click();
  await expect(wizard).toHaveCount(0);
}

async function createQmdFromPicker(page, { title, mediaName, expectedAlt }) {
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(title);
  await wizard.getByRole("button", { name: "Insert image" }).click();
  await wizard.getByLabel(new RegExp(mediaName)).evaluate((node) => node.click());
  expect(await (await rawQmdSource(wizard)).inputValue())
    .toContain(`![${expectedAlt}](simex-media:`);
  await expect(wizard.getByRole("region", { name: "Rendered preview" })
    .locator(`img[alt="${expectedAlt}"]`)).toBeVisible();
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

async function persistDefaultDashboard(page) {
  await page.evaluate(async (key) => {
    if (localStorage.getItem(key) !== null) return;
    const input = await fetch("/config/dashboard.json").then((response) => response.json());
    const profiles = await fetch("/config/dataset-profiles.json").then((response) => response.json());
    const { normalizeDashboardSource } = await import("/src/lib/loadDashboard.js");
    const dashboard = normalizeDashboardSource(input, profiles);
    const { validateConfigurationForPersistence } = await import("/src/lib/dashboardPersistenceValidation.js");
    validateConfigurationForPersistence(dashboard, profiles);
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, STORAGE_KEY);
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

async function rawQmdSource(surface) {
  const preview = surface.getByRole("region", { name: "Rendered preview" });
  await expect(preview).toBeVisible();
  const source = surface.getByLabel("Portable QMD raw source");
  if (!(await source.isVisible())) {
    await surface.getByRole("button", { name: "Raw text", exact: true }).click();
  }
  await expect(source).toBeVisible();
  await expect(preview).toBeVisible();
  return source;
}
