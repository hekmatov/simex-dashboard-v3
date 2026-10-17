import { expect, test } from "@playwright/test";

import { openDashboardPage } from "./support/landingWorkflow.js";
import { REMOVED_PAGE_GROUP_ID, withPageRemovalGroups } from "./support/layoutReviewFixture.js";
import {
  DASHBOARD_STORAGE_KEY,
  createSavedPresentationScene,
  enterPresentWithScene,
  openAudienceSession,
} from "./support/present-audience-workflow.js";

test("production View launches from the built static output", {
  tag: "@production-static",
}, async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('button[data-dashboard-mode="view"]')).toBeVisible();
  await openDashboardPage(page, "biomedical");
  const chart = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Confirmed cases", exact: true }),
  });
  await chart.scrollIntoViewIfNeeded();
  await expect(chart).toBeVisible();
  await expect(chart.locator("[data-canonical-runtime-ledger]")).toBeVisible();
});

test("Chart wizard shows a modal loading state while its chunk is pending", {
  tag: "@production-static",
}, async ({ page }) => {
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.locator('button[data-dashboard-mode="build"]').click();
  const addChart = page.locator('[data-build-command-action="add-chart"]');
  await expect(addChart).toBeVisible();

  let releaseChunk;
  const chunkGate = new Promise((resolve) => { releaseChunk = resolve; });
  await page.route("**/assets/ChartWizardV3-*.js", async (route) => {
    await chunkGate;
    await route.continue();
  });
  await addChart.click();
  try {
    const pending = page.getByRole("status").filter({ hasText: "Loading Chart wizard" });
    await expect(pending).toBeVisible();
    await expect(pending).toHaveClass(/dashboard-dialog-backdrop/);
  } finally {
    releaseChunk();
  }
  await expect(page.locator("#chart-wizard-title")).toBeVisible();
});

test("installed production package opens its first Present and Audience from the cold offline runtime graph", {
  tag: "@production-static",
}, async ({ context, page }) => {
  const response = await page.request.get("/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const fixture = withPageRemovalGroups(await response.json());
  await page.goto("/");
  await page.evaluate(({ key, dashboard }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, { key: DASHBOARD_STORAGE_KEY, dashboard: fixture });
  await page.reload();
  await openDashboardPage(page, "biomedical");
  await page.locator('button[data-dashboard-mode="build"]').click();
  const scene = await createSavedPresentationScene(page, {
    entry: "build-biomedical",
    chronoGroupId: REMOVED_PAGE_GROUP_ID,
  });
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
