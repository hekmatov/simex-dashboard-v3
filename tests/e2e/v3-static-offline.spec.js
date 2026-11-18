import { expect, test } from "@playwright/test";

import { openDashboardPage } from "./support/landingWorkflow.js";
import { normalizeDashboardBoundary } from "../../src/charting/config/dashboardBundleV3.js";
import {
  DASHBOARD_STORAGE_KEY,
  createSavedPresentationScene,
  enterPresentWithScene,
  openAudienceSession,
} from "./support/present-audience-workflow.js";

const OFFLINE_STORYLINE_ID = "offline-production-storyline";

const requestMetadata = request => {
  const url = new URL(request.url());
  return { method: request.method(), origin: url.origin,
    path: ["http:", "https:"].includes(url.protocol) ? url.pathname : `[${url.protocol}]`,
    queryPresent: Boolean(url.search), type: request.resourceType() };
};

test("production View launches from the built static output", {
  tag: "@production-static",
}, async ({ page }, testInfo) => {
  const requests = [];
  const recordRequest = request => requests.push(requestMetadata(request));
  page.on("request", recordRequest);
  const response = await page.goto("/");
  expect(response.headers()["content-security-policy"]).toContain("script-src 'self' 'sha256-");
  await expect(page.locator('button[data-dashboard-mode="view"]')).toBeVisible();
  await openDashboardPage(page, "biomedical");
  const chart = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Confirmed cases", exact: true }),
  });
  await chart.scrollIntoViewIfNeeded();
  await expect(chart).toBeVisible();
  await expect(chart.locator("[data-canonical-runtime-ledger]")).toBeVisible();
  expect(await page.evaluate(() => {
    const script = document.createElement("script");
    script.textContent = "window.__simexUnauthorizedInline = true";
    document.body.append(script);
    return window.__simexUnauthorizedInline === true;
  })).toBe(false);
  await page.evaluate(() => document.fonts.ready);
  const storage = await storageMetadata(page);
  page.off("request", recordRequest);
  await testInfo.attach("standard-view-network-and-storage", {
    body: JSON.stringify({
      scope: "Fresh standard built View launch through Confirmed cases paint; no import, export, companion session or Audience actions in this observation.",
      contentSecurityPolicy: response.headers()["content-security-policy"], requests, storage,
    }, null, 2),
    contentType: "application/json",
  });
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
}, async ({ context, page }, testInfo) => {
  const requests = [];
  let stage = "online preparation";
  const recordRequest = request => requests.push({ stage, ...requestMetadata(request) });
  context.on("request", recordRequest);
  const response = await page.request.get("/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const fixture = coldOfflineStorylineFixture(await response.json());
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
    chronoGroupId: OFFLINE_STORYLINE_ID,
  });
  await expectServiceWorkerReady(page);
  await page.reload();
  await expectServiceWorkerControl(page);
  await page.locator('button[data-dashboard-mode="build"]').click();
  await expect(page.locator(".build-workspace")).toBeVisible();
  const beforeOffline = await storageMetadata(page);

  await context.setOffline(true);
  stage = "offline Present and Audience";
  await enterPresentWithScene(page, scene);
  const monitor = page.getByRole("region", { name: "Audience scene monitor" });
  await expect(monitor).toHaveAttribute("data-monitor-source", "local");
  const chartSelector = `[data-displayed-chart-id="${scene.present.chartIds[0]}"]`;
  await expect(monitor.locator(".audience-local-preview").locator(chartSelector)).toBeVisible();

  const offlineAudience = await openAudienceSession(page);
  await expectServiceWorkerControl(offlineAudience.popup);
  const output = offlineAudience.popup.locator(".audience-display");
  await expect(output.locator(chartSelector)).toBeVisible();
  await expect.poll(() => output.locator(chartSelector).evaluate(panel => {
    const raw = panel.querySelector("[data-canonical-runtime-ledger]")?.getAttribute("data-canonical-runtime-ledger");
    const ledger = raw ? JSON.parse(raw) : null;
    const finite = ledger?.render?.resolution === "available" && ledger.series?.some(series => series.values.some(value =>
      Number.isFinite(Array.isArray(value) ? value.at(-1) : value)));
    return Boolean(finite && [...panel.querySelectorAll("canvas")].some(canvas => {
      if (!canvas.width || !canvas.height) return false;
      const context = canvas.getContext("2d"); if (!context) return false;
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      return data.some((value, index) => index >= 4 && value !== data[index % 4]);
    }));
  })).toBe(true);
  await expect(monitor).toHaveAttribute("data-monitor-source", "audience");
  const captured = monitor.getByRole("img", { name: "Captured Audience stage" });
  await expect(captured).toHaveAttribute("src", /^data:image\/jpeg/);
  await expect.poll(() => captured.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  const captureMetrics = await captured.evaluate(image => {
    const canvas = document.createElement("canvas"); canvas.width = 80; canvas.height = 50;
    const context = canvas.getContext("2d"); context.drawImage(image, 0, 0, 80, 50);
    const pixels = context.getImageData(0, 0, 80, 50).data, colours = new Set();
    for (let index = 0; index < pixels.length; index += 4) colours.add(`${pixels[index] >> 4},${pixels[index + 1] >> 4},${pixels[index + 2] >> 4}`);
    return { width: image.naturalWidth, height: image.naturalHeight, colours: colours.size };
  });
  expect(captureMetrics.colours).toBeGreaterThan(1);
  await offlineAudience.popup.close();
  await expect(monitor).toHaveAttribute("data-monitor-source", "local");
  const afterAudienceClose = await storageMetadata(page);
  context.off("request", recordRequest);
  await testInfo.attach("standard-offline-audience-network-and-storage", {
    body: JSON.stringify({
      scope: "Built standard app: online Storyline preparation, then cold offline Present/Audience capture and window close. Browser request metadata, storage names/keys and image metrics only; no bodies, storage values or captured frame bytes.",
      requests, beforeOffline, afterAudienceClose, captureMetrics,
      limitation: "Names and keys inventory storage surfaces; it does not inspect persisted record contents or prove their absence.",
    }, null, 2),
    contentType: "application/json",
  });
});

function coldOfflineStorylineFixture(input) {
  const dashboard = normalizeDashboardBoundary(input);
  // The cold-graph journey duplicates a native saved composition. Preserve the
  // original source/charts and the former seed's union period/exact policies;
  // no inherited Group default is written into any chart.
  const chartIds = ["bio_confirmed_cases", "bio_daily_cases_bar"];
  const charts = dashboard.pages.flatMap(({ sections }) => sections.flatMap(({ panels }) =>
    panels.map((placement) => placement.chart ?? placement)));
  for (const id of chartIds) {
    if (!charts.some((chart) => chart.id === id)) throw new Error(`Missing cold offline source chart ${id}.`);
  }
  dashboard.scenes.push({
    id: OFFLINE_STORYLINE_ID, name: "Offline production Storyline",
    period: { start: "2027-02-14", end: "2027-02-21" },
    frames: { mode: "union" }, secondsPerFrame: 1,
    members: chartIds.map((chartId) => ({
      chartId, width: 2, timeRole: "observation", matching: { policy: "exact" },
    })),
    present: { chartIds, layout: "vertical-divider" },
    audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } },
  });
  return dashboard;
}

async function storageMetadata(page) {
  return page.evaluate(async () => ({
    localStorageKeys: Object.keys(localStorage).sort(),
    databaseNames: (await indexedDB.databases()).map(database => database.name).filter(Boolean).sort(),
    cacheNames: (await caches.keys()).sort(),
    serviceWorker: navigator.serviceWorker.controller?.scriptURL ?? null,
  }));
}

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
