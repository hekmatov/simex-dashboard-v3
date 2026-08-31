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

test("Quick Edit opens before reveal animation frames are allowed to run", async ({ page }) => {
  await enterBiomedicalBuild(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  const edit = panel.getByRole("button", { name: "Edit chart", exact: true });
  await expect(edit).toBeEnabled();
  await page.evaluate(() => {
    window.__savedAnimationFrame = window.requestAnimationFrame;
    window.__savedCancelAnimationFrame = window.cancelAnimationFrame;
    window.__heldAnimationFrames = [];
    window.requestAnimationFrame = (callback) => {
      window.__heldAnimationFrames.push(callback);
      return window.__heldAnimationFrames.length;
    };
    window.cancelAnimationFrame = () => {};
  });

  await edit.evaluate((button) => button.click());

  await expect(page.locator(".chart-quick-editor")).toBeVisible({ timeout: 750 });
  await page.evaluate(() => {
    window.requestAnimationFrame = window.__savedAnimationFrame;
    window.cancelAnimationFrame = window.__savedCancelAnimationFrame;
  });
});

test("Full Edit paints a pending shell without creating unchanged work", async ({ page }) => {
  await enterBiomedicalBuild(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await panel.getByRole("button", { name: "Edit chart", exact: true }).click();
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  const owner = page.locator('[data-pending-work-id="chart-edit:bio_confirmed_cases"]');
  await expect(owner).toHaveCount(0);

  await page.evaluate(() => {
    window.__savedAnimationFrame = window.requestAnimationFrame;
    window.__savedCancelAnimationFrame = window.cancelAnimationFrame;
    window.__heldAnimationFrames = [];
    window.requestAnimationFrame = (callback) => {
      window.__heldAnimationFrames.push(callback);
      return window.__heldAnimationFrames.length;
    };
    window.cancelAnimationFrame = () => {};
  });
  await quick.getByRole("button", { name: "Open full editor", exact: true })
    .evaluate((button) => button.click());

  const full = page.getByRole("dialog", { name: "Edit chart" });
  await expect(full).toBeVisible();
  await expect(full).toHaveAttribute("data-preparation-status", "pending");
  await expect(owner).toHaveCount(0);
  await page.evaluate(() => {
    window.requestAnimationFrame = window.__savedAnimationFrame;
    window.cancelAnimationFrame = window.__savedCancelAnimationFrame;
  });
  await full.getByRole("button", { name: "Close", exact: true }).click();
  await expect(full).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: /discard/i })).toHaveCount(0);
});

async function enterBiomedicalBuild(page) {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
}
