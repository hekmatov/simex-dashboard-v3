import { mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { scenePresentLayoutToDisplayLayout } from "../../src/components/time/scenePresentLayout.js";
import {
  WORKSPACE_VIEWPORTS,
  captureCheckpoint,
  expectMinimumTouchTargets,
  expectNoViewportOverflow,
  readFocusVisibility,
  setActualPageZoom,
} from "./support/final-acceptance.js";
import { openDashboardFromLanding, openLanding } from "./support/landingWorkflow.js";
import {
  createSavedPresentationScene,
  enterPresentWithScene,
  openAudienceSession,
} from "./support/present-audience-workflow.js";

const DESKTOP_VIEWPORT = WORKSPACE_VIEWPORTS.find(({ width, height }) => width === 1200 && height === 900);
const AUDIENCE_PRIMARY_VISUAL = [
  ".chart-echarts-host canvas",
  ".chart-image-viewport :is(img, svg)",
  ".chart-table-scroll table",
  ".chart-card-collection",
  ".chart-target-collection",
  ".free-text-chart-view__content",
].join(", ");
const AUDIENCE_FORBIDDEN_INTERACTION = [
  "button",
  "nav",
  "a",
  "input",
  "select",
  "textarea",
  "[contenteditable]",
  "[tabindex]",
  '[role="button"]',
  '[role="link"]',
].join(", ");
const AUDIENCE_INVALID_CHART_STATE = [
  ".chart-status-error",
  ".chart-status-empty",
  ".chart-deferred-placeholder",
  ".chart-image-pending",
  ".chart-image-loading",
  ".chart-embedded-echarts-error",
  ".static-content-state--loading",
  ".static-content-state--error",
  "[data-chart-state-overlay]",
  "[data-static-failure]",
].join(", ");

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await openLanding(page);
});

test("200% text reflow keeps canonical Home, mode controls, and Dashboard map focus visible", async ({ context, page }, testInfo) => {
  const restoreScale = await setActualPageZoom(page, context, 2);
  try {
    const openDashboard = page.getByRole("button", { name: "Open the dashboard", exact: true });
    await openDashboard.focus();
    await assertVisibleFocus(openDashboard);
    await openDashboard.click();

    const modes = page.getByLabel("Dashboard mode");
    await expect(modes.getByRole("button", { name: "View", exact: true })).toBeVisible();
    await modes.getByRole("button", { name: "View", exact: true }).click();
    await expect(modes.getByRole("button", { name: "View", exact: true })).toHaveAttribute("aria-pressed", "true");
    await modes.getByRole("button", { name: "Build", exact: true }).click();
    await expect(modes.getByRole("button", { name: "Build", exact: true })).toHaveAttribute("aria-pressed", "true");

    const mapToggle = page.getByRole("button", { name: "Dashboard map", exact: true });
    await expect(mapToggle).toBeVisible();
    await mapToggle.focus();
    await mapToggle.press("Enter");
    const map = page.getByRole("complementary", { name: "Dashboard map" });
    const firstTreeItem = map.getByRole("treeitem").first();
    const focusIndicator = firstTreeItem.locator(":scope > .build-tree-row");
    await expect(map).toHaveAttribute("data-open", "true");
    await expect(map).toBeVisible();
    await firstTreeItem.focus();
    const wrapperFocus = await readFocusVisibility(firstTreeItem);
    expect(wrapperFocus.visible).toBe(true);
    const indicatorFocus = await readFocusVisibility(focusIndicator);
    const outlineInset = indicatorFocus.outlineWidth + Math.max(0, indicatorFocus.outlineOffset);
    expect(indicatorFocus.bounds.left - outlineInset).toBeGreaterThanOrEqual(indicatorFocus.visualViewport.left);
    expect(indicatorFocus.bounds.top - outlineInset).toBeGreaterThanOrEqual(indicatorFocus.visualViewport.top);
    expect(indicatorFocus.bounds.right + outlineInset).toBeLessThanOrEqual(indicatorFocus.visualViewport.right);
    expect(indicatorFocus.bounds.bottom + outlineInset).toBeLessThanOrEqual(indicatorFocus.visualViewport.bottom);
    await assertVisibleFocus(focusIndicator);

    await expect(page.getByRole("region", { name: "Build commands" })).toBeVisible();
    await expectNoViewportOverflow(page);
    await captureCheckpoint(page, testInfo, "step9-200-percent-reflow.png");
  } finally {
    await restoreScale();
  }
});

test("keyboard and screen-reader journey exposes truthful mode and Dashboard map semantics", async ({ page }, testInfo) => {
  const modes = page.getByRole("navigation", { name: "Dashboard mode" });
  const home = modes.getByRole("button", { name: "Home", exact: true });
  const view = modes.getByRole("button", { name: "View", exact: true });
  const build = modes.getByRole("button", { name: "Build", exact: true });

  await expect(modes).toHaveCount(1);
  await expect(home).toHaveAttribute("aria-pressed", "true");
  await pressUntilFocused(page, home, "Tab");
  await page.keyboard.press("Tab");
  await expect(view).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(view).toHaveAttribute("aria-pressed", "true");
  await pressUntilFocused(page, build, "Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(build).toHaveAttribute("aria-pressed", "true");

  const mapToggle = page.getByRole("button", { name: "Dashboard map", exact: true });
  await pressUntilFocused(page, mapToggle, "Tab");
  await page.keyboard.press("Enter");
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  const structure = map.getByRole("navigation", { name: "Dashboard structure" });
  const tree = structure.getByRole("tree");
  const firstTreeItem = tree.getByRole("treeitem").first();
  await expect(map).toBeVisible();
  await expect(firstTreeItem).toHaveAttribute("aria-expanded", "true");
  await expect(firstTreeItem).toHaveAttribute("aria-selected", "true");
  await pressUntilFocused(page, firstTreeItem, "Tab", 160);
  await page.keyboard.press("ArrowDown");
  await expect(tree.getByRole("treeitem").nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(firstTreeItem).toBeFocused();

  const snapshot = await page.locator("body").ariaSnapshot();
  expect(snapshot).toContain("Home");
  expect(snapshot).toContain("View");
  expect(snapshot).toContain("Build");
  expect(snapshot).toContain("Dashboard map");
  expect(snapshot).toContain("Dashboard structure");
  expect(snapshot).toContain('treeitem "Old Homepage Content" [expanded] [selected]');
  await testInfo.attach("step9-screen-reader-journey.yml", {
    body: snapshot,
    contentType: "text/yaml",
  });

  await page.keyboard.press("Escape");
  await expect(map).toBeHidden();
  await expect(mapToggle).toBeFocused();
});

test("touch input activates the phone recovery control with a 44 by 44 target", async ({ browser, baseURL }) => {
  const touchContext = await browser.newContext({
    hasTouch: true,
    viewport: WORKSPACE_VIEWPORTS[0],
  });
  try {
    const touchPage = await touchContext.newPage();
    await touchPage.goto(baseURL);
    const modes = touchPage.getByLabel("Dashboard mode");
    await modes.getByRole("button", { name: "Build", exact: true }).tap();

    const notice = touchPage.locator('[data-phone-mode-notice="build"]');
    const switchToView = notice.getByRole("button", { name: "Switch to View", exact: true });
    await expect(notice).toHaveAttribute("role", "status");
    await expect(notice).toBeVisible();
    await expectMinimumTouchTargets(switchToView);
    await switchToView.tap();
    await expect(modes.getByRole("button", { name: "View", exact: true })).toHaveAttribute("aria-pressed", "true");
  } finally {
    await touchContext.close();
  }
});

test("viewport fan-out preserves canonical Home and cross-mode analytical identities", async ({ page }) => {
  test.setTimeout(240_000);
  for (const viewport of WORKSPACE_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await openLanding(page);

    const appFrame = page.locator(".app-frame");
    const modes = page.getByRole("navigation", { name: "Dashboard mode" });
    await expect(appFrame).toHaveAttribute("data-dashboard-mode", "home");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "SimEx Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Getting started with building", exact: true })).toBeVisible();
    expect(await page.evaluate(() => (
      getComputedStyle(document.documentElement).getPropertyValue("--simex-surface-canvas").trim()
    ))).not.toBe("");
    await expectNoViewportOverflow(page);

    if (viewport.width === 390 && viewport.height === 844) {
      await expect(page.locator("[data-phone-mode-notice]")).toHaveCount(0);
    }

    const savedPackage = await readSavedPackage(page);
    await openDashboardFromLanding(page);
    await expect(appFrame).toHaveAttribute("data-dashboard-mode", "view");
    const viewCanvas = await readCanonicalCanvasIdentity(page);

    await modes.getByRole("button", { name: "Build", exact: true }).click();
    await expect(appFrame).toHaveAttribute("data-dashboard-mode", "build");
    if (viewport.width === 390 && viewport.height === 844) {
      await expect(page.locator('[data-phone-mode-notice="build"]')).toBeVisible();
      await expect(page.locator(".build-workspace")).toHaveCount(1);
      await expect(page.locator(".build-workspace")).toBeVisible();
      expect(await readCanonicalCanvasIdentity(page)).toEqual(viewCanvas);
      await page.getByRole("button", { name: "Switch to View", exact: true }).click();
      await expect(appFrame).toHaveAttribute("data-dashboard-mode", "view");
    } else {
      expect(await readCanonicalCanvasIdentity(page)).toEqual(viewCanvas);
    }

    await modes.getByRole("button", { name: "Home", exact: true }).click();
    await expect(appFrame).toHaveAttribute("data-dashboard-mode", "home");
    expect(await readSavedPackage(page)).toBe(savedPackage);
  }
});

test("1920 Audience preserves room-distance composition through the public workflow", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const scene = await createSavedPresentationScene(page);
  const savedChartIds = scene.present.chartIds;
  expect(savedChartIds.length).toBeGreaterThan(0);
  expect(new Set(savedChartIds).size).toBe(savedChartIds.length);
  const savedDisplayLayout = scenePresentLayoutToDisplayLayout(
    scene.present.layout,
    savedChartIds.length,
  );

  await enterPresentWithScene(page, scene);
  let popup;
  let checkpointPath;
  try {
    ({ popup } = await openAudienceSession(page));
    await popup.setViewportSize({ width: 1920, height: 1080 });

    const audience = popup.locator('.audience-display[data-output-mode="active"]');
    const grid = audience.locator(
      '.displayed-chart-grid[data-display-surface="audience"][data-layout-system="presentation"]',
    );
    const header = audience.locator(".audience-shared-header");
    const title = audience.locator(".audience-shared-header h1");
    const sceneName = audience.locator(".audience-scene-name");
    const sceneDate = audience.locator(".audience-scene-date");
    const cells = grid.locator("[data-displayed-chart-id]");

    await expect(audience).toBeVisible();
    await expect(grid).toBeVisible();
    await expect(header).toBeVisible();
    await expect(title).toBeVisible();
    await expect(sceneName).toHaveText(scene.name);
    await expect(sceneDate).toBeVisible();
    await expect(cells).toHaveCount(savedChartIds.length);
    expect(await grid.evaluate((element) => [...element.classList])).toEqual(expect.arrayContaining([
      `displayed-count-${savedChartIds.length}`,
      `layout-${savedDisplayLayout}`,
    ]));
    expect(await cells.evaluateAll((elements) => (
      elements.map((element) => element.getAttribute("data-displayed-chart-id"))
    ))).toEqual(savedChartIds);
    await expect(audience.locator(AUDIENCE_FORBIDDEN_INTERACTION)).toHaveCount(0);

    for (let index = 0; index < savedChartIds.length; index += 1) {
      const cell = cells.nth(index);
      await expect(cell.locator('.chart-view-frame[data-chart-interaction-mode="passive"]')).toHaveCount(1);
      await expect(cell.locator(AUDIENCE_PRIMARY_VISUAL).first()).toBeVisible();
      await expect(cell.locator(AUDIENCE_INVALID_CHART_STATE)).toHaveCount(0);
    }

    await expect(audience).toHaveAttribute("data-render-status", "current");
    await expect(audience).toHaveAttribute("data-connection-status", "connected");
    await expect(audience.locator("[data-connection-indicator]")).toHaveCount(0);
    const geometry = await readAudienceRoomDistanceGeometry(popup);
    expect(geometry.root.width).toBe(geometry.viewport.width);
    expect(geometry.root.height).toBe(geometry.viewport.height);
    expect(geometry.root.left).toBe(0);
    expect(geometry.root.top).toBe(0);
    expect(geometry.documentOverflow).toEqual({ horizontal: false, vertical: false });

    expectContainedGeometry(geometry.header, geometry.root, "Audience header");
    expectContainedGeometry(geometry.title, geometry.header, "Audience title");
    expectContainedGeometry(geometry.sceneName, geometry.header, "Audience Scene name");
    expectContainedGeometry(geometry.sceneDate, geometry.root, "Audience Scene date");
    expectContainedGeometry(geometry.grid, geometry.root, "Audience chart grid");
    expect(geometry.cells).toHaveLength(savedChartIds.length);
    expectPairwiseNonOverlapping(geometry.cells);
    for (const cell of geometry.cells) {
      expect(cell.id).toBe(savedChartIds[cell.index]);
      expectContainedGeometry(cell.bounds, geometry.grid, `Audience cell ${cell.id}`);
      expectContainedGeometry(cell.frame, cell.bounds, `Audience frame ${cell.id}`);
      expectContainedGeometry(cell.primary, cell.frame, `Audience primary visual ${cell.id}`);
      expect(cell.overflow, `Audience cell ${cell.id} overflow`).toEqual({ horizontal: false, vertical: false });
      expect(cell.bounds.width, `Audience cell ${cell.id} width`).toBeGreaterThanOrEqual(480);
      expect(cell.bounds.height, `Audience cell ${cell.id} height`).toBeGreaterThanOrEqual(300);
      expect(cell.primary.width, `Audience primary visual ${cell.id} width`).toBeGreaterThanOrEqual(
        cell.bounds.width / 2,
      );
      expect(cell.primary.height, `Audience primary visual ${cell.id} height`).toBeGreaterThanOrEqual(
        cell.bounds.height / 2,
      );
    }

    checkpointPath = await captureCheckpoint(
      popup,
      testInfo,
      "audience-1920x1080-room-distance.png",
    );
  } finally {
    if (popup && !popup.isClosed()) await popup.close();
  }

  const durablePath = resolve(
    dirname(testInfo.file),
    "../../docs/audits/2026-08-28-v3-step-9-final-acceptance/screenshots/audience-1920x1080-room-distance.png",
  );
  await mkdir(dirname(durablePath), { recursive: true });
  await copyFile(checkpointPath, durablePath);
});

async function readCanonicalCanvasIdentity(page) {
  await expect(page.locator("[data-canonical-canvas-id]")).toBeVisible();
  return page.evaluate(() => ({
    canvasId: document.querySelector("[data-canonical-canvas-id]")?.getAttribute("data-canonical-canvas-id"),
    panelIds: [...document.querySelectorAll("[data-canonical-panel-id]")]
      .map((panel) => panel.getAttribute("data-canonical-panel-id")),
  }));
}

async function readAudienceRoomDistanceGeometry(popup) {
  return popup.evaluate(({ invalidStateSelector, primarySelector }) => {
    const root = document.querySelector('.audience-display[data-output-mode="active"]');
    const grid = root.querySelector(
      '.displayed-chart-grid[data-display-surface="audience"][data-layout-system="presentation"]',
    );
    const bounds = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      root: bounds(root),
      header: bounds(root.querySelector(".audience-shared-header")),
      title: bounds(root.querySelector(".audience-shared-header h1")),
      sceneName: bounds(root.querySelector(".audience-scene-name")),
      sceneDate: bounds(root.querySelector(".audience-scene-date")),
      grid: bounds(grid),
      documentOverflow: {
        horizontal: document.documentElement.scrollWidth > window.innerWidth,
        vertical: document.documentElement.scrollHeight > window.innerHeight,
      },
      cells: [...grid.querySelectorAll("[data-displayed-chart-id]")].map((cell, index) => {
        const frame = cell.querySelector('.chart-view-frame[data-chart-interaction-mode="passive"]');
        const primary = frame.querySelector(primarySelector);
        return {
          index,
          id: cell.getAttribute("data-displayed-chart-id"),
          bounds: bounds(cell),
          frame: bounds(frame),
          primary: bounds(primary),
          invalidStateCount: cell.querySelectorAll(invalidStateSelector).length,
          overflow: {
            horizontal: cell.scrollWidth > cell.clientWidth + 1,
            vertical: cell.scrollHeight > cell.clientHeight + 1,
          },
        };
      }),
    };
  }, {
    invalidStateSelector: AUDIENCE_INVALID_CHART_STATE,
    primarySelector: AUDIENCE_PRIMARY_VISUAL,
  });
}

function expectContainedGeometry(inner, outer, label) {
  expect(inner.width, `${label} width`).toBeGreaterThan(0);
  expect(inner.height, `${label} height`).toBeGreaterThan(0);
  expect(inner.left, `${label} left`).toBeGreaterThanOrEqual(outer.left - 1);
  expect(inner.top, `${label} top`).toBeGreaterThanOrEqual(outer.top - 1);
  expect(inner.right, `${label} right`).toBeLessThanOrEqual(outer.right + 1);
  expect(inner.bottom, `${label} bottom`).toBeLessThanOrEqual(outer.bottom + 1);
}

function expectPairwiseNonOverlapping(cells) {
  for (let leftIndex = 0; leftIndex < cells.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cells.length; rightIndex += 1) {
      const left = cells[leftIndex];
      const right = cells[rightIndex];
      const separated = left.bounds.right <= right.bounds.left + 1
        || right.bounds.right <= left.bounds.left + 1
        || left.bounds.bottom <= right.bounds.top + 1
        || right.bounds.bottom <= left.bounds.top + 1;
      expect(
        separated,
        `Audience cells ${left.id} and ${right.id} overlap by more than 1px`,
      ).toBe(true);
    }
  }
}

async function readSavedPackage(page) {
  return page.evaluate(() => localStorage.getItem("simex-dashboard-config-v3-three-mode-v1"));
}

async function assertVisibleFocus(target) {
  const focus = await readFocusVisibility(target);
  expect(focus.visible).toBe(true);
  expect(focus.outlineStyle).not.toBe("none");
  expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
}

async function pressUntilFocused(page, target, key, limit = 32) {
  for (let attempt = 0; attempt < limit; attempt += 1) {
    if (await target.evaluate((element) => document.activeElement === element)) return;
    await page.keyboard.press(key);
  }
  await expect(target).toBeFocused();
}
