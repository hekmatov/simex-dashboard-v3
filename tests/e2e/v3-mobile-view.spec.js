import { expect, test } from "@playwright/test";
import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
});

test("phone-width View shows one crown row, navigates through the disclosure, and caps chart height", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await enterAuthoredDashboard(page);

  const crown = page.locator('.dashboard-command-crown[data-crown-compact="true"]');
  await expect(crown).toBeVisible();
  await crown.locator('[aria-controls="crown-disclosure"]').click();
  await page.locator('#crown-disclosure [data-dashboard-page-id="biomedical"]').click();
  await expect(page.locator("[data-canonical-page-id]")).toHaveAttribute("data-canonical-page-id", "biomedical");
  const row = crown.locator('[data-command-crown-layer="location"]');
  const rowBox = await row.boundingBox();
  expect(rowBox.height).toBeLessThanOrEqual(40);
  await expect(crown.locator('[data-command-crown-layer="mode"]')).toHaveCount(0);

  const trigger = crown.getByRole("button", { name: "Biomedical" });
  await trigger.click();
  const disclosure = page.locator("#crown-disclosure");
  await expect(disclosure).toBeVisible();
  await expect(disclosure.getByRole("button", { name: "Theme" })).toBeVisible();
  await expect(disclosure.locator('[data-dashboard-page-id="biomedical"]')).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(disclosure).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await disclosure.locator('[data-dashboard-page-id="socio_economic"]').click();
  await expect(disclosure).toBeHidden();
  await expect(page.locator("[data-canonical-page-id]")).toHaveAttribute("data-canonical-page-id", "socio_economic");

  await expect(page.locator(".dashboard-header[data-header-compact='true']")).toBeVisible();
  await expect(page.locator(".dashboard-meta")).toHaveCount(0);

  const footprints = page.locator(".view-shell .chart-panel-footprint");
  const count = await footprints.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const box = await footprints.nth(index).boundingBox();
    if (box) expect(box.height).toBeLessThanOrEqual(421);
  }
});
