import { expect, test } from "@playwright/test";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

test.beforeEach(async ({ page, request }) => {
  await request.post("/__test__/catalogue-mode", { data: { mode: "absent" } });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("simex-dashboard-config-v3-three-mode-v1");
    localStorage.removeItem("simex-dashboard-ui-mode-v1");
  });
  await page.reload();
  await enterAuthoredDashboard(page);
});

test("the canonical chart canvas stays mounted while switching between View and Build", async ({ page }) => {
  const canvas = page.locator("[data-canonical-canvas-instance]");
  await expect(canvas).toBeVisible();
  const viewInstance = await canvas.getAttribute("data-canonical-canvas-instance");

  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
  await expect(canvas).toHaveAttribute("data-canonical-canvas-instance", viewInstance);

  await page.getByRole("button", { name: "View", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="view"]')).toBeVisible();
  await expect(canvas).toHaveAttribute("data-canonical-canvas-instance", viewInstance);
});
