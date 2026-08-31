import { expect, test } from "@playwright/test";

test("status publication does not rerender actions-only consumers", async ({ page }) => {
  await page.goto("http://127.0.0.1:4175/tests/e2e/operation-status-context-harness.html");
  await expect(page.getByRole("button", { name: "Report activity" })).toBeVisible();
  const before = await page.evaluate(() => ({ ...window.__statusHarness }));

  await page.getByRole("button", { name: "Report activity" }).click();

  await expect(page.locator("[data-status-count]")).toHaveText("1");
  const after = await page.evaluate(() => ({ ...window.__statusHarness }));
  expect(after.actionsRenders).toBe(before.actionsRenders);
  expect(after.snapshotRenders).toBeGreaterThan(before.snapshotRenders);
});
