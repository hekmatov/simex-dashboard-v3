import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3";

test.beforeEach(async ({ request, page }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await page.addInitScript((storageKey) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE__ === true) {
        throw new DOMException("Storage full", "QuotaExceededError");
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
