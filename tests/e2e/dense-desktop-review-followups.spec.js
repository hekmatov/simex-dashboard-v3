import { expect, test } from "@playwright/test";
import { timeCursor } from "./support/time-cursor-workflow.js";

import { openChartAuthoring } from "./support/chart-authoring-workflow.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

test("chart wizard stage labels and statuses use two unclipped lines at desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  const { stageButtons } = await openChartAuthoring(page);

  const geometry = await stageButtons.evaluateAll((buttons) => buttons.map((button) => {
    const label = button.querySelector("span");
    const status = button.querySelector("small");
    const buttonRect = button.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const statusRect = status.getBoundingClientRect();
    return {
      height: Math.round(buttonRect.height),
      labelClipped: label.scrollWidth > label.clientWidth + 1,
      statusClipped: status.scrollWidth > status.clientWidth + 1,
      statusBelowLabel: statusRect.top >= labelRect.bottom - 1,
    };
  }));

  expect(geometry).toHaveLength(5);
  expect(geometry.every(({ height }) => height === 36)).toBe(true);
  expect(geometry.every(({ labelClipped, statusClipped }) => !labelClipped && !statusClipped)).toBe(true);
  expect(geometry.every(({ statusBelowLabel }) => statusBelowLabel)).toBe(true);
});

test("the default time bar is compact and clears the dashboard identity header", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // The native TimeBar needs the real source clock, not an archived
  // page-removal seed that introduces invalid chart-owned time synchronization.
  await page.context().clearCookies({ name: "simex-e2e-fixture" });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const bar = timeCursor(page).bar;
  const header = page.locator(".canonical-dashboard-frame .dashboard-header");
  await expect(bar).toBeVisible();
  await expect(header).toBeVisible();

  const geometry = await page.evaluate(() => {
    const bar = document.querySelector('.time-bar');
    const overlayRect = bar.getBoundingClientRect();
    const headerRect = document.querySelector(".canonical-dashboard-frame .dashboard-header").getBoundingClientRect();
    return {
      width: Math.round(overlayRect.width),
      height: Math.round(overlayRect.height),
      headerGap: Math.round(headerRect.top - overlayRect.bottom),
      overflow: bar.scrollWidth - bar.clientWidth,
    };
  });

  expect(geometry.height).toBe(36);
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.width).toBeLessThanOrEqual(1440);
  expect(geometry.headerGap).toBeGreaterThanOrEqual(0);
  expect(geometry.overflow).toBeLessThanOrEqual(0);
});

test("Build Libraries exposes Storyline Studio directly without a More drawer", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  const toolbar = page.getByRole("toolbar", { name: "Primary Build commands" });
  const libraries = toolbar.getByRole("group", { name: "Libraries", exact: true });
  const sceneStudio = libraries.locator('[data-build-command-action="scene-studio"]');
  await expect(sceneStudio).toHaveText("Storyline Studio");
  await expect(sceneStudio).toBeVisible();
  await expect(sceneStudio).toBeInViewport();
  await expect(page.getByRole("button", { name: "More", exact: true })).toHaveCount(0);
  await sceneStudio.click();
  await expect(page.getByRole("dialog", { name: "Storyline Studio authoring" })).toBeVisible();
});

test("the fixed Audience options drawer sizes to its four facts", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Present", exact: true }).click();
  await page.getByRole("button", { name: "Audience display options", exact: true }).click();

  const drawer = page.getByRole("dialog", { name: "Audience display options" });
  const facts = drawer.locator(".present-audience-fact");
  await expect(facts).toHaveCount(4);
  const geometry = await drawer.evaluate((node) => {
    const drawerRect = node.getBoundingClientRect();
    const lastFactRect = node.querySelector(".present-audience-fact:last-of-type").getBoundingClientRect();
    return {
      height: Math.round(drawerRect.height),
      blankBelowFacts: Math.round(drawerRect.bottom - lastFactRect.bottom),
    };
  });

  expect(geometry.height).toBeLessThanOrEqual(420);
  expect(geometry.blankBelowFacts).toBeLessThanOrEqual(32);
});
