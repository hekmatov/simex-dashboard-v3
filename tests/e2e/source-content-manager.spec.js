import { expect, test } from "@playwright/test";

const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.beforeEach(async ({ page, request }) => {
  await request.post("/__test__/catalogue-mode", { data: { mode: "absent" } });
  await page.goto("http://127.0.0.1:4175/");
  await page.evaluate(() => {
    localStorage.removeItem("simex-dashboard-config-v3-three-mode-v1");
    localStorage.removeItem("simex-dashboard-mode-v3");
  });
  await page.reload();
});

test("three Build content commands preserve six/four stage contracts", async ({ page }) => {
  await openBuild(page, { width: 1440, height: 900 });
  const content = page.getByRole("region", { name: "Content commands" });
  await expect(content.getByRole("button")).toHaveText(["Add chart", "Add static content", "Source content"]);
  await expect(page.getByRole("region", { name: "Structure commands" }).getByRole("button")).toHaveText(["Pages & sections"]);

  await content.getByRole("button", { name: "Add chart" }).click();
  const chartWizard = page.getByRole("dialog", { name: "Add new chart" });
  await expect(chartWizard.getByRole("navigation", { name: "Chart creation steps" }).getByRole("button")).toHaveCount(6);
  await chartWizard.getByRole("button", { name: "Close", exact: true }).click();

  await content.getByRole("button", { name: "Add static content" }).click();
  const staticWizard = page.getByRole("dialog", { name: "Add static content" });
  await expect(staticWizard.getByRole("navigation", { name: "Static content stages" }).getByRole("button")).toHaveCount(4);
  await staticWizard.getByRole("button", { name: "Close static content editor" }).click();
});

test("non-modal manager restores canvas selection scroll and focus", async ({ page }) => {
  await openBuild(page, { width: 1440, height: 900 });
  const canvas = page.locator("[data-canonical-canvas-instance]");
  const canvasInstance = await canvas.getAttribute("data-canonical-canvas-instance");
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const originalSelection = page.locator('[role="treeitem"][aria-selected="true"]').first();
  await expect(originalSelection).toBeVisible();
  const originalSelectionLabel = await originalSelection.getAttribute("aria-label");
  await page.evaluate(() => window.scrollTo(0, Math.min(240, document.documentElement.scrollHeight - innerHeight)));
  const beforeScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));

  const sourceCommand = page.getByRole("button", { name: "Source content", exact: true });
  await sourceCommand.click();
  const manager = page.getByRole("complementary", { name: "Source content authoring" });
  await expect(manager).toBeVisible();
  await expect(canvas).toHaveAttribute("data-canonical-canvas-instance", canvasInstance);
  await expect(canvas).toHaveCount(1);
  const changedSelection = page.locator('[role="treeitem"][data-build-node-kind="page"]:not([aria-selected="true"])').first();
  const changedSelectionLabel = await changedSelection.getAttribute("aria-label");
  await changedSelection.evaluate((node) => {
    node.focus();
    node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await expect(page.getByRole("treeitem", { name: changedSelectionLabel, exact: true })).toHaveAttribute("aria-selected", "true");

  await manager.getByRole("button", { name: "Close", exact: true }).click();
  await expect(manager).toHaveCount(0);
  await expect(page.getByRole("treeitem", { name: originalSelectionLabel, exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(sourceCommand).toBeFocused();
  await expect.poll(() => page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(beforeScroll);
});

test("desktop composition keeps canvas and catalogue state without overflow", async ({ page }) => {
  test.setTimeout(90_000);
  await openBuild(page, { width: 1440, height: 900 });
  await page.getByRole("button", { name: "Source content", exact: true }).click();
  const host = page.getByRole("complementary", { name: "Source content authoring" });
  const manager = page.locator('.source-content-workspace[data-manager-layout="desktop"]');
  await expect(manager).toBeVisible();
  await expect(manager.getByRole("region", { name: "Media catalogue" })).toBeVisible();
  await expect(manager.getByRole("region", { name: "Content detail" })).toBeVisible();

  await manager.getByRole("tab", { name: "Data sources" }).click();
  const firstSource = manager.locator(".source-content-row").first();
  await expect(firstSource).toBeVisible();
  await firstSource.click();
  const nameField = manager.getByLabel("Display name");
  const originalName = await nameField.inputValue();
  await nameField.fill(`${originalName} managed`);
  await manager.getByRole("button", { name: "Save name" }).click();
  await expect(nameField).toHaveValue(`${originalName} managed`);
  await expect(manager.getByRole("region", { name: "Data source catalogue" })).toContainText(`${originalName} managed`);
  const sourceSearch = manager.getByLabel("Search data sources");
  await sourceSearch.fill("Generated");
  await manager.getByLabel("Filter by origin").selectOption("legacy-import");
  await manager.getByLabel("Filter by status").selectOption("ready");
  await manager.getByLabel("Filter by usage").selectOption("used");
  await manager.getByLabel("Filter by kind").selectOption("csv");

  await manager.getByRole("tab", { name: "Media" }).click();
  const search = manager.getByLabel("Search media");
  await search.fill("image");
  await manager.getByLabel("Filter by origin").selectOption("legacy-import");
  await manager.getByLabel("Filter by status").selectOption("ready");
  await manager.getByLabel("Filter by usage").selectOption("unused");
  await manager.getByRole("tab", { name: "Data sources" }).click();
  await expect(manager.getByLabel("Filter by kind")).toBeVisible();
  await manager.getByRole("tab", { name: "Media" }).click();
  await expect(search).toHaveValue("image");
  await expect(manager.getByLabel("Filter by origin")).toHaveValue("legacy-import");
  await host.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Source content", exact: true }).click();
  await expect(manager.getByRole("tab", { name: "Media" })).toHaveAttribute("aria-selected", "true");
  await expect(manager.getByLabel("Search media")).toHaveValue("image");
  await expect(manager.getByLabel("Filter by origin")).toHaveValue("legacy-import");
  await expect(manager.getByLabel("Filter by status")).toHaveValue("ready");
  await expect(manager.getByLabel("Filter by usage")).toHaveValue("unused");
  await manager.getByRole("tab", { name: "Data sources" }).click();
  await expect(manager.getByLabel("Search data sources")).toHaveValue("Generated");
  await expect(manager.getByLabel("Filter by origin")).toHaveValue("legacy-import");
  await expect(manager.getByLabel("Filter by status")).toHaveValue("ready");
  await expect(manager.getByLabel("Filter by usage")).toHaveValue("used");
  await expect(manager.getByLabel("Filter by kind")).toHaveValue("csv");
  await manager.getByLabel("Filter by usage").selectOption("all");
  await expect(manager.locator('.source-content-row[aria-pressed="true"]')).toContainText(`${originalName} managed`);

  await assertMountedDeleteCheckpoint(page, manager, { width: 1440, height: 900 });

  const geometry = await page.evaluate(() => {
    const host = document.querySelector('.build-authoring-auxiliary[data-authoring-surface="source-content"]');
    const workspace = host?.querySelector(".source-content-workspace")?.getBoundingClientRect();
    const catalogue = host?.querySelector(".source-content-catalogue")?.getBoundingClientRect();
    const detail = host?.querySelector(".source-content-detail")?.getBoundingClientRect();
    const canvas = document.querySelector("[data-canonical-canvas-instance]")?.getBoundingClientRect();
    return {
      hostClientWidth: host?.clientWidth ?? 0,
      hostScrollWidth: host?.scrollWidth ?? 0,
      workspaceLeft: workspace?.left ?? -1,
      workspaceRight: workspace?.right ?? innerWidth + 1,
      hostLeft: host?.getBoundingClientRect().left ?? 0,
      hostRight: host?.getBoundingClientRect().right ?? 0,
      catalogueRight: catalogue?.right ?? 0,
      detailLeft: detail?.left ?? 0,
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0,
    };
  });
  expect(geometry.hostScrollWidth).toBeLessThanOrEqual(geometry.hostClientWidth);
  expect(geometry.workspaceLeft).toBeGreaterThanOrEqual(geometry.hostLeft);
  expect(geometry.workspaceRight).toBeLessThanOrEqual(geometry.hostRight);
  expect(geometry.catalogueRight).toBeLessThanOrEqual(geometry.detailLeft);
  expect(geometry.canvasWidth).toBeGreaterThan(240);
  expect(geometry.canvasHeight).toBeGreaterThan(160);
});

test("tablet composition navigates list to detail with Back and preserves filters", async ({ page }) => {
  test.setTimeout(90_000);
  await openBuild(page, { width: 1024, height: 768 });
  const canvas = page.locator("[data-canonical-canvas-instance]");
  const canvasInstance = await canvas.getAttribute("data-canonical-canvas-instance");
  await page.getByRole("button", { name: "Source content", exact: true }).click();
  const host = page.getByRole("complementary", { name: "Source content authoring" });
  const manager = page.locator('.source-content-workspace[data-manager-layout="tablet"]');
  await expect(manager).toBeVisible();
  await expect(canvas).toHaveAttribute("data-canonical-canvas-instance", canvasInstance);
  await expect(canvas).toHaveCount(1);
  await manager.getByRole("tab", { name: "Data sources" }).click();
  const search = manager.getByLabel("Search data sources");
  await search.fill("");
  await manager.getByLabel("Filter by kind").selectOption("all");
  const firstItem = manager.locator(".source-content-row").first();
  await expect(firstItem).toBeVisible();
  const selectedName = await firstItem.locator(".source-content-row__name").textContent();
  await firstItem.click();
  await expect(manager.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await expect(manager.getByRole("region", { name: "Content detail" })).toContainText(selectedName);
  await host.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Source content", exact: true }).click();
  await expect(manager.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await expect(manager.getByRole("region", { name: "Content detail" })).toContainText(selectedName);
  await manager.getByRole("button", { name: "Back", exact: true }).click();
  await expect(manager.getByLabel("Search data sources")).toHaveValue("");
  await expect(manager.getByLabel("Filter by kind")).toHaveValue("all");
  await expect(firstItem).toHaveAttribute("aria-pressed", "true");
  await assertMountedDeleteCheckpoint(page, manager, { width: 1024, height: 768 });
  const geometry = await page.evaluate(() => {
    const host = document.querySelector('.build-authoring-auxiliary[data-authoring-surface="source-content"]');
    const workspace = host?.querySelector(".source-content-workspace")?.getBoundingClientRect();
    const pane = host?.querySelector(".source-content-catalogue")?.getBoundingClientRect();
    const bounds = document.querySelector("[data-canonical-canvas-instance]")?.getBoundingClientRect();
    return {
      hostClientWidth: host?.clientWidth ?? 0,
      hostScrollWidth: host?.scrollWidth ?? 0,
      hostLeft: host?.getBoundingClientRect().left ?? 0,
      hostRight: host?.getBoundingClientRect().right ?? 0,
      workspaceLeft: workspace?.left ?? -1,
      workspaceRight: workspace?.right ?? innerWidth + 1,
      paneLeft: pane?.left ?? -1,
      paneRight: pane?.right ?? innerWidth + 1,
      canvasWidth: bounds?.width ?? 0,
      canvasHeight: bounds?.height ?? 0,
    };
  });
  expect(geometry.hostScrollWidth).toBeLessThanOrEqual(geometry.hostClientWidth);
  expect(geometry.workspaceLeft).toBeGreaterThanOrEqual(geometry.hostLeft);
  expect(geometry.workspaceRight).toBeLessThanOrEqual(geometry.hostRight);
  expect(geometry.paneLeft).toBeGreaterThanOrEqual(geometry.hostLeft);
  expect(geometry.paneRight).toBeLessThanOrEqual(geometry.hostRight);
  expect(geometry.canvasWidth).toBeGreaterThan(240);
  expect(geometry.canvasHeight).toBeGreaterThan(160);
});

async function openBuild(page, viewport) {
  await page.setViewportSize(viewport);
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
}

async function assertMountedDeleteCheckpoint(page, manager, viewport) {
  await page.evaluate(async ({ key }) => {
    const stored = localStorage.getItem(key);
    const input = stored === null
      ? await fetch("/config/dashboard.json").then((response) => response.json())
      : JSON.parse(stored);
    const configuredProfiles = await fetch("/config/dataset-profiles.json").then((response) => response.json());
    const { normalizeDashboardSource } = await import("/src/lib/loadDashboard.js");
    const dashboard = normalizeDashboardSource(input, configuredProfiles);
    dashboard.contentLibrary.mediaItems["task6-unused-media"] = {
      mediaId: "task6-unused-media",
      revision: 1,
      current: { kind: "url", url: "https://example.test/task6-unused.png" },
      displayName: "Task 6 unused media",
      defaultDescription: "",
      origin: "external",
      health: "external",
    };
    const { validateConfigurationForPersistence } = await import("/src/lib/dashboardPersistenceValidation.js");
    validateConfigurationForPersistence(dashboard, configuredProfiles);
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, { key: STORAGE_KEY });
  await page.reload();
  await openBuild(page, viewport);
  await page.getByRole("button", { name: "Source content", exact: true }).click();
  await manager.getByRole("tab", { name: "Data sources" }).click();
  await manager.getByLabel("Search data sources").fill("");
  await manager.getByLabel("Filter by kind").selectOption("all");
  await manager.getByLabel("Filter by usage").selectOption("used");
  const blockedRow = manager.locator(".source-content-row").first();
  await expect(blockedRow).toBeVisible();
  await blockedRow.click();
  const blockedDelete = manager.getByRole("button", { name: "Delete", exact: true });
  await expect(blockedDelete).toBeDisabled();
  await expect(manager).toContainText("Remove or replace the direct use before deleting");
  await expect(page.getByRole("dialog", { name: /Delete/ })).toHaveCount(0);

  if (viewport.width < 1200) await manager.getByRole("button", { name: "Back", exact: true }).click();
  await manager.getByRole("tab", { name: "Media" }).click();
  await manager.getByLabel("Filter by usage").selectOption("unused");
  await manager.getByLabel("Search media").fill("Task 6 unused media");
  const eligibleRow = manager.locator(".source-content-row").first();
  await expect(eligibleRow).toBeVisible();
  const eligibleName = await eligibleRow.locator(".source-content-row__name").textContent();
  await eligibleRow.click();
  const eligibleDelete = manager.getByRole("button", { name: "Delete", exact: true });
  await expect(eligibleDelete).toBeEnabled();
  const prior = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await eligibleDelete.click();
  const dialog = page.getByRole("dialog", { name: `Delete ${eligibleName}?` });
  await expect(dialog).toBeVisible();
  const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
  await expect(cancel).toBeFocused();
  await cancel.click();
  await expect(dialog).toHaveCount(0);
  await expect(eligibleDelete).toBeFocused();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(prior);
  if (viewport.width < 1200) await manager.getByRole("button", { name: "Back", exact: true }).click();
}
