import { expect, test } from "@playwright/test";

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

  expect(geometry).toHaveLength(6);
  expect(geometry.every(({ height }) => height === 36)).toBe(true);
  expect(geometry.every(({ labelClipped, statusClipped }) => !labelClipped && !statusClipped)).toBe(true);
  expect(geometry.every(({ statusBelowLabel }) => statusBelowLabel)).toBe(true);
});

test("the default Chrono date is compact and clears the dashboard identity header", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Chrono view", exact: true }).click();

  const overlay = page.getByRole("status", { name: "Chrono date overlay" });
  const header = page.locator(".canonical-dashboard-frame .dashboard-header");
  await expect(overlay).toBeVisible();
  await expect(header).toBeVisible();

  const geometry = await page.evaluate(() => {
    const overlayRect = document.querySelector('[data-chrono-date-overlay="true"]').getBoundingClientRect();
    const headerRect = document.querySelector(".canonical-dashboard-frame .dashboard-header").getBoundingClientRect();
    return {
      width: Math.round(overlayRect.width),
      height: Math.round(overlayRect.height),
      headerGap: Math.round(overlayRect.top - headerRect.bottom),
    };
  });

  expect(geometry).toEqual({ width: 200, height: 56, headerGap: 8 });
});

test("the single-command Build More drawer sizes to its content", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "More", exact: true }).click();

  const drawer = page.getByRole("dialog", { name: "More Build commands" });
  const action = drawer.getByRole("button", { name: "Scene Studio", exact: true });
  const geometry = await drawer.evaluate((node) => {
    const drawerRect = node.getBoundingClientRect();
    const actionRect = node.querySelector('[data-build-more-command="scene-studio"]').getBoundingClientRect();
    return {
      height: Math.round(drawerRect.height),
      blankBelowAction: Math.round(drawerRect.bottom - actionRect.bottom),
    };
  });

  await expect(action).toBeVisible();
  expect(geometry.height).toBeLessThanOrEqual(260);
  expect(geometry.blankBelowAction).toBeLessThanOrEqual(24);
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
