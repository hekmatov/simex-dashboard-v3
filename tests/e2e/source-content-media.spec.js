import { expect, test } from "@playwright/test";
import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const PNG = Buffer.from(imageFixtureBytes("image/png"));
const EXTERNAL_ID = "journey-a-external";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
});

test("Journey A — media create reuse default external import restore dependencies delete", async ({ page }) => {
  test.setTimeout(180_000);
  const externalRequests = [];
  await page.route("https://example.test/journey-a.png", async (route) => {
    externalRequests.push({ url: route.request().url(), type: route.request().resourceType() });
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

  await closeManager(page);
  await expect(page.getByRole("heading", { name: "HeV-A26 Dashboard: Epidemiological overview" })).toBeVisible();
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
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  const discardDialog = page.getByRole("dialog", { name: "Discard static content changes?" });
  if (await discardDialog.count()) await discardDialog.getByRole("button", { name: "Discard" }).click();
  await expect(editor).toHaveCount(0);

  manager = await openManager(page);
  await selectMediaRow(manager, "Journey A external map");
  await expect(manager).toContainText("1 use");
  await expect(manager.getByRole("button", { name: "Delete", exact: true })).toBeDisabled();
  await expect(manager).toContainText("Journey A external image");
  await expect(page.getByRole("dialog", { name: /Delete/ })).toHaveCount(0);

  const importCard = manager.getByRole("region", { name: "Import Journey A external map as local media" });
  await importCard.getByRole("button", { name: "Import as local media" }).click();
  await importCard.getByRole("button", { name: "Try direct HTTPS import" }).click();
  await expect(importCard.getByLabel("Display name")).toBeVisible();
  await importCard.getByLabel("Display name").fill("Journey A imported local");
  await importCard.getByLabel("Create separate item").check();
  const importAdd = importCard.getByRole("button", { name: "Add to dashboard" });
  await expect(importAdd).toBeEnabled();
  await importAdd.click();
  expect(externalRequests.filter(({ type }) => type === "fetch")).toEqual([
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
