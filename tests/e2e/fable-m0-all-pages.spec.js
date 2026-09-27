import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

import { withPageRemovalGroups } from "./support/layoutReviewFixture.js";

const storageKey = "simex-dashboard-config-v3-three-mode-v1";
const appVersion = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8")).version;

test.use({ viewport: { width: 1440, height: 1000 } });

test("every shipped Page renders in View and Build, then eligible content reaches Present", async ({ page }) => {
  test.setTimeout(60_000);
  const response = await page.request.get("http://127.0.0.1:4173/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const shipped = await response.json();
  const pages = shipped.pages ?? [];
  expect(pages.length).toBeGreaterThan(1);
  expect(pages.every(({ id, sections }) => id && sections?.length)).toBe(true);
  const fixture = withPageRemovalGroups(shipped);
  const chartIds = new Set(pages.flatMap(({ sections }) => sections.flatMap(({ panels }) => panels.map((panel) => (panel.chart ?? panel).id))));
  expect(fixture.chronoGroups.every(({ members }) => members.every(({ chartId }) => chartIds.has(chartId)))).toBe(true);

  await page.addInitScript(({ key, dashboard }) => {
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, { key: storageKey, dashboard: fixture });
  await page.goto("http://127.0.0.1:4185/?mode=view");
  const modes = page.getByLabel("Dashboard mode");
  await expect(modes.getByRole("button", { name: "View", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".dashboard-footer")).toContainText(`App version ${appVersion}`);
  await expect(page.locator(".dashboard-footer").getByRole("link", { name: "Changelog" })).toBeVisible();
  for (const { id } of pages) {
    await page.locator(`[data-dashboard-page-id="${id}"]`).click();
    await expect(page.locator(`[data-canonical-mode="view"][data-canonical-page-id="${id}"]`)).toBeVisible();
  }

  await modes.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
  await expect(page.locator(".dashboard-footer")).toContainText(`App version ${appVersion}`);
  const navigation = page.getByRole("navigation", { name: "Dashboard pages" });
  for (const { id, label, title } of pages) {
    await navigation.getByRole("button", { name: label ?? title ?? id, exact: true }).click();
    await expect(page.locator(`[data-canonical-mode="build"][data-canonical-page-id="${id}"]`)).toBeVisible();
  }

  await modes.getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.locator(".present-workspace")).toBeVisible();
  await expect(page.getByRole("region", { name: "Choose charts for the audience scene" })).toBeVisible();
  await expect(page.locator(`[data-presentable-item-id="${fixture.chronoGroups[0].members[0].chartId}"]`).getByRole("checkbox")).toBeEnabled();
});
