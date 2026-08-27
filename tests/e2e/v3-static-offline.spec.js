import { expect, test } from "@playwright/test";

import {
  createSavedPresentationScene,
  enterPresentWithScene,
  openAudienceSession,
} from "./support/present-audience-workflow.js";

test("production View launches from the built static output", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('button[data-dashboard-mode="view"]')).toBeVisible();
  await page.locator('[data-dashboard-page-id="biomedical"]').click();
  await expect(page.locator('[data-panel-id="bio_confirmed_cases"]')).toBeVisible();
  await expect(page.locator('[data-panel-id="bio_confirmed_cases"] [data-canonical-runtime-ledger]')).toBeVisible();
});

test("installed production package opens its first Present and Audience from the cold offline runtime graph", async ({ context, page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.locator('[data-dashboard-page-id="biomedical"]').click();
  await page.locator('button[data-dashboard-mode="build"]').click();
  const scene = await createSavedPresentationScene(page, { entry: "build-biomedical" });
  await expectServiceWorkerReady(page);
  await page.reload();
  await expectServiceWorkerControl(page);
  await page.locator('button[data-dashboard-mode="build"]').click();
  await expect(page.locator(".build-workspace")).toBeVisible();

  await context.setOffline(true);
  await enterPresentWithScene(page, scene);
  await expect(page.locator('.audience-snapshot-monitor img[alt="Current audience scene"]')).toHaveAttribute(
    "src",
    /^data:image\/jpeg/,
  );
  const offlineAudience = await openAudienceSession(page);
  await expectServiceWorkerControl(offlineAudience.popup);
  await expect(offlineAudience.popup.locator(".audience-display")).toBeVisible();
  const chart = offlineAudience.popup.locator(`[data-displayed-chart-id="${scene.present.chartIds[0]}"]`);
  await expect(chart).toBeVisible();
  await offlineAudience.popup.close();
});

async function expectServiceWorkerReady(page) {
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL ?? null;
  })).toMatch(/service-worker\.js$/);
}

async function expectServiceWorkerControl(page) {
  await expect.poll(() => page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller?.scriptURL ?? null;
  })).toMatch(/service-worker\.js$/);
}
