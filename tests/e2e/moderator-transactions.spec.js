import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3";

test.beforeEach(async ({ request, page }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await page.addInitScript((storageKey) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE__ === true) {
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
        throw new DOMException("Storage full", "QuotaExceededError");
      }
      if (key === storageKey) {
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
      }
      return setItem.call(this, key, value);
    };
  }, STORAGE_KEY);
});

async function openDashboardEditMode(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByRole("button", { name: "Open edit mode" }).click();
}

async function openFirstChartEditor(page) {
  await openDashboardEditMode(page);
  await page.locator(".chart-panel").first()
    .getByRole("button", { name: "Edit chart" }).click();
}

test("failed chart save keeps the editor and draft open for retry", async ({ page }) => {
  await openFirstChartEditor(page);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".chart-editor-v3")).toBeVisible();
  await expect(page.locator(".chart-editor-error")).toContainText("Browser storage is full");

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".chart-editor-v3")).toBeHidden();
});

test("failed chart removal keeps confirmation and chart available for retry", async ({ page }) => {
  await openFirstChartEditor(page);
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Remove chart" }).click();
  const confirmation = page.getByRole("dialog", { name: "Remove this chart?" });
  await expect(confirmation).toBeVisible();

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await confirmation.getByRole("button", { name: "Remove chart" }).click();
  await expect(confirmation).toBeVisible();
  await expect(page.locator(".chart-editor-v3")).toBeVisible();
  await expect(page.locator(".edit-operation-error")).toContainText("Browser storage is full");

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  await confirmation.getByRole("button", { name: "Remove chart" }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.locator(".chart-editor-v3")).toBeHidden();
});

test("failed edit-session save and reset keep edit mode available for retry", async ({ page }) => {
  await openDashboardEditMode(page);
  await page.getByLabel("Program label").fill("Unsaved exercise label");
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await page.getByRole("button", { name: "Save edit mode" }).click();
  await expect(page.getByRole("button", { name: "Save edit mode" })).toBeVisible();
  await expect(page.locator(".edit-operation-error")).toContainText("Browser storage is full");

  await page.getByRole("button", { name: "Reset edits" }).click();
  const confirmation = page.getByRole("dialog", { name: "Discard these edits?" });
  await confirmation.getByRole("button", { name: "Reset edits" }).click();
  await expect(confirmation).toBeVisible();
  await expect(page.getByRole("button", { name: "Save edit mode" })).toBeVisible();

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  await confirmation.getByRole("button", { name: "Reset edits" }).click();
  await expect(page.getByRole("button", { name: "Open edit mode" })).toBeVisible();
});

test("failed final edit-session commit keeps the chart edit context available", async ({ page }) => {
  await openFirstChartEditor(page);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await page.getByRole("button", { name: "Save edit mode" }).evaluate((button) => button.click());
  await expect(page.getByRole("button", { name: "Save edit mode" })).toBeVisible();
  await expect(page.locator(".chart-editor-v3")).toBeVisible();
  await expect(page.locator(".chart-editor-v3").getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(page.locator(".edit-operation-error")).toContainText("Browser storage is full");

  const failedSaveAttempts = await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".chart-editor-v3")).toBeHidden();
  await expect.poll(() => page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__), { timeout: 5_000 })
    .toBe(failedSaveAttempts + 1);
});
