import { expect, test } from "@playwright/test";

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
  await expect(content.getByRole("button")).toHaveText(["Add chart", "Add static content", "Source content", "Pages & sections"]);

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
  await page.evaluate(() => window.scrollTo(0, Math.min(240, document.documentElement.scrollHeight - innerHeight)));
  const beforeScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));

  const sourceCommand = page.getByRole("button", { name: "Source content", exact: true });
  await sourceCommand.click();
  const manager = page.getByRole("complementary", { name: "Source content authoring" });
  await expect(manager).toBeVisible();
  await expect(canvas).toHaveAttribute("data-canonical-canvas-instance", canvasInstance);
  await expect(canvas).toHaveCount(1);

  await manager.getByRole("button", { name: "Close", exact: true }).click();
  await expect(manager).toHaveCount(0);
  await expect(sourceCommand).toBeFocused();
  await expect.poll(() => page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(beforeScroll);
});

test("desktop composition keeps canvas and catalogue state without overflow", async ({ page }) => {
  await openBuild(page, { width: 1440, height: 900 });
  await page.getByRole("button", { name: "Source content", exact: true }).click();
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

  await manager.getByRole("tab", { name: "Media" }).click();
  const search = manager.getByLabel("Search media");
  await search.fill("image");
  await manager.getByLabel("Filter by origin").selectOption("legacy-import");
  await manager.getByRole("tab", { name: "Data sources" }).click();
  await expect(manager.getByLabel("Filter by kind")).toBeVisible();
  await manager.getByRole("tab", { name: "Media" }).click();
  await expect(search).toHaveValue("image");
  await expect(manager.getByLabel("Filter by origin")).toHaveValue("legacy-import");

  const geometry = await page.evaluate(() => {
    const canvas = document.querySelector("[data-canonical-canvas-instance]")?.getBoundingClientRect();
    return {
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(geometry.canvasWidth).toBeGreaterThan(240);
  expect(geometry.canvasHeight).toBeGreaterThan(160);
  expect(geometry.overflow).toBe(0);
});

test("tablet composition navigates list to detail with Back and preserves filters", async ({ page }) => {
  await openBuild(page, { width: 1024, height: 768 });
  const canvas = page.locator("[data-canonical-canvas-instance]");
  const canvasInstance = await canvas.getAttribute("data-canonical-canvas-instance");
  await page.getByRole("button", { name: "Source content", exact: true }).click();
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
  await manager.getByRole("button", { name: "Back", exact: true }).click();
  await expect(manager.getByLabel("Search data sources")).toHaveValue("");
  await expect(manager.getByLabel("Filter by kind")).toHaveValue("all");
  await expect(firstItem).toHaveAttribute("aria-pressed", "true");
  const geometry = await page.evaluate(() => {
    const bounds = document.querySelector("[data-canonical-canvas-instance]")?.getBoundingClientRect();
    return {
      canvasWidth: bounds?.width ?? 0,
      canvasHeight: bounds?.height ?? 0,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(geometry.canvasWidth).toBeGreaterThan(240);
  expect(geometry.canvasHeight).toBeGreaterThan(160);
  expect(geometry.overflow).toBe(0);
});

async function openBuild(page, viewport) {
  await page.setViewportSize(viewport);
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
}
