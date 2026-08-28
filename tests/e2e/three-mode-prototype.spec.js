import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import { serializeDashboardBundle } from "../../src/charting/config/dashboardBundleV3.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const MODE_STORAGE_KEY = "simex-dashboard-ui-mode-v1";

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
  await page.goto("/");
});

test("View, Build, and Present remain visible while preserving the active page", async ({ page }) => {
  const modes = page.getByLabel("Dashboard mode");
  await expect(modes.getByRole("button", { name: "View" })).toBeVisible();
  await expect(modes.getByRole("button", { name: "Build" })).toBeVisible();
  await expect(modes.getByRole("button", { name: "Present" })).toBeVisible();

  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();

  await modes.getByRole("button", { name: "Build" }).click();
  await expect(page.locator(".build-workspace")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true }))
    .toHaveAttribute("aria-current", "page");

  await modes.getByRole("button", { name: "Present" }).click();
  await expect(page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true }))
    .toHaveAttribute("aria-current", "page");

  await modes.getByRole("button", { name: "View" }).click();
  await expect(page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true }))
    .toHaveAttribute("aria-current", "page");
});

test("Build metadata persists on save and stays editable after storage fallback", async ({ page }) => {
  const passport = await enterScenarioInspector(page);
  await passport.getByRole("button", { name: /^Edit Program:/ }).click();
  const program = passport.getByLabel("Program", { exact: true });
  await program.fill("Three-mode training exercise");
  await passport.getByRole("button", { name: "Save Scenario", exact: true }).click();
  await expect(passport).toContainText("Scenario saved");
  await page.getByRole("button", { name: "View", exact: true }).click();
  await expect(page.getByRole("button", { name: "View", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate((key) => (
    JSON.parse(localStorage.getItem(key)).programLabel
  ), STORAGE_KEY)).toBe("Three-mode training exercise");

  await enterScenarioInspector(page);
  await passport.getByRole("button", { name: /^Edit Program:/ }).click();
  await program.fill("Retain this Build draft");
  await page.evaluate((storageKey) => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === storageKey) {
        throw new DOMException("Browser storage is full.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    };
  }, STORAGE_KEY);

  await passport.getByRole("button", { name: "Save Scenario", exact: true }).click();
  await expect(page.getByRole("button", { name: "Build", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(passport).toContainText("Scenario saved");
  await expect(page.getByRole("status")).toContainText(
    "Browser storage is full. Dashboard changes remain available for this session only.",
  );
  await expect.poll(() => page.evaluate((key) => (
    JSON.parse(localStorage.getItem(key)).programLabel
  ), STORAGE_KEY)).toBe("Three-mode training exercise");
  await passport.getByRole("button", { name: "Edit Program: Retain this Build draft", exact: true }).click();
  await expect(program).toHaveValue("Retain this Build draft");
});

test("Scenario Passport saves Home off and on explicitly across reload", async ({ page }) => {
  let passport = await enterScenarioInspector(page);
  const showHome = passport.getByRole("checkbox", { name: "Show Home", exact: true });
  await expect(showHome).toBeChecked();
  await showHome.uncheck();
  const priorStoredDashboard = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await page.evaluate((storageKey) => {
    window.__simexNativeStorageSetItem = Storage.prototype.setItem;
    let failedDashboardWrite = false;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === storageKey && !failedDashboardWrite) {
        failedDashboardWrite = true;
        throw new DOMException("Browser storage is full.", "QuotaExceededError");
      }
      return window.__simexNativeStorageSetItem.call(this, key, value);
    };
  }, STORAGE_KEY);

  await passport.getByRole("button", { name: "Save Scenario", exact: true }).click();
  await expect(page.getByRole("button", { name: "Build", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(passport).toContainText("Unsaved Scenario");
  await expect(passport.getByRole("alert")).toContainText("Browser storage is full.");
  await expect(showHome).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Home", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))
    .toBe(priorStoredDashboard);

  await page.evaluate(() => {
    Storage.prototype.setItem = window.__simexNativeStorageSetItem;
    delete window.__simexNativeStorageSetItem;
  });
  await passport.getByRole("button", { name: "Save Scenario", exact: true }).click();

  await expect(page.getByRole("button", { name: "View", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => (
    JSON.parse(localStorage.getItem(key)).home.enabled
  ), STORAGE_KEY)).toBe(false);

  await page.reload();
  await expect(page.getByRole("button", { name: "View", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveCount(0);

  passport = await enterScenarioInspector(page);
  const hiddenHome = passport.getByRole("checkbox", { name: "Show Home", exact: true });
  await expect(hiddenHome).not.toBeChecked();
  await hiddenHome.check();
  await passport.getByRole("button", { name: "Save Scenario", exact: true }).click();
  await expect(page.getByRole("button", { name: "Build", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Home", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => (
    JSON.parse(localStorage.getItem(key)).home.enabled
  ), STORAGE_KEY)).toBe(true);
});

test("Home-off package import changes mode, preference, and focus only after commit", async ({ page }) => {
  const bundle = await homeOffPackageFixture();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.locator('input[type="file"][accept*="application/json"]').first().setInputFiles({
    name: "home-off-dashboard.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(bundle)),
  });
  const review = page.getByRole("dialog", { name: "Review package contents" });
  await expect(review).toBeVisible();

  await page.getByRole("button", { name: "Home", exact: true }).evaluate((element) => element.click());
  await expect(page.getByRole("button", { name: "Home", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await page.evaluate((storageKey) => {
    window.__simexNativeStorageSetItem = Storage.prototype.setItem;
    let failedDashboardWrite = false;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === storageKey && !failedDashboardWrite) {
        failedDashboardWrite = true;
        throw new DOMException("Browser storage is full.", "QuotaExceededError");
      }
      return window.__simexNativeStorageSetItem.call(this, key, value);
    };
  }, STORAGE_KEY);

  await review.getByRole("button", { name: "Load package", exact: true }).click();
  await expect(review).toContainText("Browser storage is full.");
  await expect(page.getByRole("button", { name: "Home", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), MODE_STORAGE_KEY))
    .toBe("home");

  await page.evaluate(() => {
    Storage.prototype.setItem = window.__simexNativeStorageSetItem;
    delete window.__simexNativeStorageSetItem;
  });
  await review.getByRole("button", { name: "Load package", exact: true }).click();
  await expect(review).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "View", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), MODE_STORAGE_KEY))
    .toBe("view");
  await expect(page.locator('[data-canonical-mode="view"]')).toBeFocused();

  const importedPassport = await enterScenarioInspector(page);
  await expect(importedPassport.getByRole("checkbox", { name: "Show Home", exact: true }))
    .not.toBeChecked();
});

test("View compares charts and closes fullscreen with Escape", async ({ page }) => {
  await openBiomedical(page);
  await page.getByRole("button", { name: "Compare charts" }).click();

  const panels = page.locator(".chart-panel");
  await panels.nth(0).getByRole("button", {
    name: "Add chart to comparison",
  }).click();
  await panels.nth(1).getByRole("button", {
    name: "Add chart to comparison",
  }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();

  const fullscreen = page.getByRole("dialog", { name: "Chart comparison" });
  await expect(fullscreen).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fullscreen).toHaveCount(0);
});

test("Present opens an audience window and sends a two-chart layout", async ({ page }) => {
  await enterPresent(page);
  const audience = await openAudience(page);
  await selectTwoAudienceCharts(page);
  await page.getByLabel("Scene layout").selectOption("overUnder");

  const grid = audience.locator(
    '.displayed-chart-grid[data-display-surface="audience"]',
  );
  await expect(grid).toHaveClass(/displayed-count-2/);
  await expect(grid).toHaveClass(/layout-overUnder/);
  await expect(grid.locator("[data-displayed-chart-id]")).toHaveCount(2);
});

test("Present retains synchronized time through blackout, reload, disconnect, and reopen", async ({ page }) => {
  await enterPresent(page);
  await installAudienceStateObserver(page);
  const audience = await openAudience(page);
  await selectTwoAudienceCharts(page);

  await page.getByLabel("Synchronized time").selectOption({ index: 1 });
  await expect.poll(async () => Number.isFinite(
    await observedAudienceEpoch(page),
  )).toBe(true);
  const previousEpoch = await observedAudienceEpoch(page);
  const presentationTime = page.getByLabel("Presentation time");
  await expect(presentationTime).toBeEnabled();
  const previousTime = await presentationTime.inputValue();
  const maximumTime = Number(await presentationTime.getAttribute("max"));
  await presentationTime.press(
    Number(previousTime) < maximumTime ? "ArrowRight" : "ArrowLeft",
  );
  await expect(presentationTime).not.toHaveValue(previousTime);
  await expect.poll(() => observedAudienceEpoch(page))
    .not.toBe(previousEpoch);
  const activeEpochMs = await observedAudienceEpoch(page);
  expect(Number.isFinite(activeEpochMs)).toBe(true);

  await page.getByRole("button", { name: "Blackout" }).click();
  await expect(audience.locator(".audience-blackout")).toBeVisible();

  await audience.reload();
  await expect(audience.locator(".audience-blackout")).toBeVisible();
  await expect(audience.locator("[data-displayed-chart-id]")).toHaveCount(2);
  await expect.poll(() => observedAudienceEpoch(page)).toBe(activeEpochMs);

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(audience.locator(".audience-blackout")).toHaveCount(0);
  await audience.close();
  await expect(page.getByRole("region", { name: "Audience display connection" })
    .getByText("Audience display disconnected", { exact: true }))
    .toBeVisible({ timeout: 7_000 });

  const reopened = await reopenAudience(page);
  await expect(reopened.locator("[data-displayed-chart-id]")).toHaveCount(2);
  await expect.poll(() => observedAudienceEpoch(page)).toBe(activeEpochMs);
});

test("iPad and 1200px Build plus a 1920 by 1080 audience have no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Build" }).click();
  await expect(page.locator(".build-workspace")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 1200, height: 1024 });
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Present" }).click();
  const audience = await openAudience(page);
  await selectTwoAudienceCharts(page);
  await audience.setViewportSize({ width: 1920, height: 1080 });
  await expectNoHorizontalOverflow(audience);
});

async function openBiomedical(page) {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
}

async function enterScenarioInspector(page) {
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.locator(".dashboard-scenario-trigger").click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await expect(passport).toBeVisible();
  return passport;
}

async function homeOffPackageFixture() {
  const config = JSON.parse(await readFile(
    new URL("../../public/config/dashboard.json", import.meta.url),
    "utf8",
  ));
  config.home = { enabled: false };
  config.dataSources = {};
  config.datasetProfiles = {};
  config.assets = {};
  config.contentLibrary = { mediaItems: {}, sourceEntries: {} };
  config.chronoGroups = [];
  config.scenes = [];
  config.pages = [{
    id: "home_off_import_page",
    label: "Imported dashboard",
    title: "Imported dashboard",
    sections: [{ id: "imported_section", title: "Imported section", panels: [] }],
  }];
  return serializeDashboardBundle(config, { now: "2026-08-28T12:00:00.000Z" });
}

async function enterPresent(page) {
  await page.getByRole("button", { name: "Present" }).click();
  await expect(page.locator(".present-workspace")).toBeVisible();
}

async function selectTwoAudienceCharts(page) {
  const choices = page.locator(".present-chart-choice");
  await expect(choices.nth(1)).toBeVisible();
  for (const choice of [choices.nth(0), choices.nth(1)]) {
    const checkbox = choice.getByRole("checkbox");
    if (!(await checkbox.isChecked())) await checkbox.check();
  }
}

async function openAudience(page) {
  const audiencePromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "Open audience display" }).click();
  const audience = await audiencePromise;
  await audience.waitForLoadState("domcontentloaded");
  await expect(audience.locator(".audience-display")).toBeVisible();
  return audience;
}

async function reopenAudience(page) {
  const audiencePromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "Reopen audience display" }).click();
  const audience = await audiencePromise;
  await audience.waitForLoadState("domcontentloaded");
  await expect(audience.locator(".audience-display")).toBeVisible();
  return audience;
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
}

async function installAudienceStateObserver(page) {
  await page.evaluate(() => {
    const originalPostMessage = BroadcastChannel.prototype.postMessage;
    globalThis.__SIMEX_E2E_AUDIENCE_STATE__ = { latestState: null };
    BroadcastChannel.prototype.postMessage = function observePresentationState(data) {
      if (data?.protocol_version === 3 && data.type === "state") {
        globalThis.__SIMEX_E2E_AUDIENCE_STATE__.latestState = structuredClone(data.payload);
      }
      return originalPostMessage.call(this, data);
    };
  });
}

async function observedAudienceEpoch(page) {
  return page.evaluate(() => (
    globalThis.__SIMEX_E2E_AUDIENCE_STATE__?.latestState?.time?.active_epoch_ms
      ?? null
  ));
}
