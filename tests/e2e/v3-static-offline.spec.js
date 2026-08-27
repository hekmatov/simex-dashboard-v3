import { expect, test } from "@playwright/test";

import {
  createSavedPresentationScene,
  enterPresentWithScene,
  injectIncompleteNextAudienceState,
  installAudienceFaultInstrumentation,
  openAudienceSession,
  sendFreshAudienceSnapshot,
} from "./support/present-audience-workflow.js";

test("production View launches from the built static output", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('button[data-dashboard-mode="view"]')).toBeVisible();
  await page.locator('[data-dashboard-page-id="biomedical"]').click();
  await expect(page.locator('[data-panel-id="bio_confirmed_cases"]')).toBeVisible();
  await expect(page.locator('[data-panel-id="bio_confirmed_cases"] [data-canonical-runtime-ledger]')).toBeVisible();
});

test("installed production package relaunches View, Build, Present, and passive last-valid Audience offline", async ({ context, page }) => {
  await installAudienceFaultInstrumentation(context);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.locator('[data-dashboard-page-id="biomedical"]').click();
  await page.locator('[data-dashboard-mode="build"]').click();
  const scene = await createSavedPresentationScene(page, { entry: "build-biomedical" });
  await expectServiceWorkerControl(page);
  await page.locator('button[data-dashboard-mode="view"]').click();
  await expect(page.locator(`[data-panel-id="${scene.present.chartIds[0]}"]`)).toBeVisible();
  await page.locator('[data-dashboard-mode="build"]').click();
  await expect(page.locator(".build-workspace")).toBeVisible();
  await enterPresentWithScene(page, scene);
  const onlineAudience = await openAudienceSession(page);
  await expect(onlineAudience.popup.locator(`[data-displayed-chart-id="${scene.present.chartIds[0]}"]`)).toBeVisible();
  await expectServiceWorkerControl(onlineAudience.popup);
  await onlineAudience.popup.close();
  await page.close();

  await context.setOffline(true);
  const offline = await context.newPage();
  await offline.goto("/");
  await offline.locator('button[data-dashboard-mode="view"]').click();
  await offline.locator('[data-dashboard-page-id="biomedical"]').click();
  await expect(offline.locator(`[data-panel-id="${scene.present.chartIds[0]}"]`)).toBeVisible();
  await offline.locator('[data-dashboard-mode="build"]').click();
  await expect(offline.locator(".build-workspace")).toBeVisible();
  await enterPresentWithScene(offline, scene);
  const offlineAudience = await openAudienceSession(offline);
  const chart = offlineAudience.popup.locator(`[data-displayed-chart-id="${scene.present.chartIds[0]}"]`);
  await expect(chart).toBeVisible();
  await offlineAudience.popup.evaluate((chartId) => {
    window.__audienceTestTransport.lastValidRemoved = false;
    window.__audienceTestTransport.lastValidObserver = new MutationObserver(() => {
      if (!document.querySelector(`[data-displayed-chart-id="${CSS.escape(chartId)}"]`)) {
        window.__audienceTestTransport.lastValidRemoved = true;
      }
    });
    window.__audienceTestTransport.lastValidObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }, scene.present.chartIds[0]);
  await injectIncompleteNextAudienceState(offlineAudience.popup);
  await expect.poll(() => offlineAudience.popup.evaluate(() => (
    window.__audienceTestTransport.incompleteStateCount ?? 0
  ))).toBeGreaterThan(0);
  await expect(chart).toBeVisible();
  expect(await offlineAudience.popup.evaluate(() => (
    window.__audienceTestTransport.lastValidRemoved
  ))).toBe(false);
  await sendFreshAudienceSnapshot(offlineAudience.popup);
  await expect.poll(() => offlineAudience.popup.evaluate(() => (
    window.__audienceTestTransport.lastStateMessage.sequence
      > window.__audienceTestTransport.incompleteStateSequence
  ))).toBe(true);
  await expect(offlineAudience.popup.locator(".audience-display")).toHaveAttribute("data-connection-status", "connected");
  await expect(chart).toBeVisible();
  expect(await offlineAudience.popup.evaluate(() => (
    window.__audienceTestTransport.lastValidRemoved
  ))).toBe(false);
  await offlineAudience.popup.evaluate(() => {
    window.__audienceTestTransport.lastValidObserver?.disconnect();
  });
  await offlineAudience.popup.close();
});

async function expectServiceWorkerControl(page) {
  await expect.poll(() => page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller?.scriptURL ?? null;
  })).toMatch(/service-worker\.js$/);
}
