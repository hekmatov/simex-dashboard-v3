import { expect, test } from "@playwright/test";

import {
  WORKSPACE_VIEWPORTS,
  captureCheckpoint,
  expectMinimumTouchTargets,
  expectNoViewportOverflow,
  readFocusVisibility,
  setActualPageZoom,
} from "./support/final-acceptance.js";
import { openLanding } from "./support/landingWorkflow.js";

const APP_URL = "http://127.0.0.1:4185/";
const DESKTOP_VIEWPORT = WORKSPACE_VIEWPORTS.find(({ width, height }) => width === 1200 && height === 900);

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
    await expect(map).toHaveAttribute("data-open", "true");
    await expect(map).toBeVisible();
    await firstTreeItem.focus();
    const wrapperFocus = await readFocusVisibility(firstTreeItem);
    expect(wrapperFocus.visible).toBe(true);
    await assertVisibleFocus(firstTreeItem.locator(":scope > .build-tree-row"));
    await expect(firstTreeItem).toBeInViewport();
    const treeBounds = await firstTreeItem.boundingBox();
    expect(treeBounds).not.toBeNull();
    expect(treeBounds.x).toBeGreaterThanOrEqual(0);
    expect(treeBounds.y).toBeGreaterThanOrEqual(0);
    expect(treeBounds.x + treeBounds.width).toBeLessThanOrEqual(DESKTOP_VIEWPORT.width);
    expect(treeBounds.y + treeBounds.height).toBeLessThanOrEqual(DESKTOP_VIEWPORT.height);

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
  await home.focus();
  await page.keyboard.press("Tab");
  await expect(view).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(view).toHaveAttribute("aria-pressed", "true");
  await build.focus();
  await expect(build).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(build).toHaveAttribute("aria-pressed", "true");

  const mapToggle = page.getByRole("button", { name: "Dashboard map", exact: true });
  await mapToggle.focus();
  await page.keyboard.press("Enter");
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  const structure = map.getByRole("navigation", { name: "Dashboard structure" });
  const tree = structure.getByRole("tree");
  const firstTreeItem = tree.getByRole("treeitem").first();
  await expect(map).toBeVisible();
  await expect(firstTreeItem).toHaveAttribute("aria-expanded", "true");
  await expect(firstTreeItem).toHaveAttribute("aria-selected", "true");
  await firstTreeItem.focus();
  await page.keyboard.press("ArrowDown");
  await expect(tree.getByRole("treeitem").nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(firstTreeItem).toBeFocused();

  await mapToggle.focus();
  await page.keyboard.press("Enter");
  await expect(map).toBeHidden();
  await expect(mapToggle).toBeFocused();

  const snapshot = await page.locator("body").ariaSnapshot();
  expect(snapshot).toContain("Home");
  expect(snapshot).toContain("View");
  expect(snapshot).toContain("Build");
  expect(snapshot).toContain("Dashboard map");
  await testInfo.attach("step9-screen-reader-journey.yml", {
    body: snapshot,
    contentType: "text/yaml",
  });
});

test("touch input activates the phone recovery control with a 44 by 44 target", async ({ browser }) => {
  const touchContext = await browser.newContext({
    hasTouch: true,
    viewport: WORKSPACE_VIEWPORTS[0],
  });
  try {
    const touchPage = await touchContext.newPage();
    await touchPage.goto(APP_URL);
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

async function assertVisibleFocus(target) {
  const focus = await readFocusVisibility(target);
  expect(focus.visible).toBe(true);
  expect(focus.outlineStyle).not.toBe("none");
  expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
}
