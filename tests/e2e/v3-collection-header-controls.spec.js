import { expect, test } from "@playwright/test";

import { collectionConsumerFixture } from "../fixtures/collectionConsumerV3.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
  const response = await request.get("http://127.0.0.1:4173/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const dashboard = await response.json();
  const { collection } = collectionConsumerFixture();
  collection.sourceId = "upload-eldoria-work-sectors";
  collection.roles = {
    value: { field: "Share of workforce (%)" },
    label: { field: "Sector", interpretation: "category" },
  };
  expect(dashboard.dataSources[collection.sourceId]).toBeTruthy();
  expect(dashboard.datasetProfiles[collection.sourceId]).toBeTruthy();
  dashboard.pages.find(({ id }) => id === "biomedical").sections[0].panels.unshift(collection);
  await page.addInitScript((fixture) => {
    localStorage.setItem("simex-dashboard-config-v3-three-mode-v1", JSON.stringify(fixture));
  }, dashboard);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
});

test("multi-page Collection transport stays in the header beside reachable Build actions", async ({ page }) => {
  const panel = page.locator('[data-panel-id="current-cases-collection"]');
  await panel.scrollIntoViewIfNeeded();
  const header = panel.locator(".collection-display-header");
  const transport = header.locator('[data-collection-header-transport="true"]');
  await expect(panel).toHaveAttribute("data-footprint", "2x1");
  await expect(transport).toBeVisible();
  await expect(transport.getByRole("button")).toHaveCount(3);
  await expect(panel.locator(".collection-page-status")).toHaveCount(0);
  const pageStatus = transport.getByRole("status");
  const initialLabel = await pageStatus.getAttribute("aria-label");
  await transport.getByRole("button", { name: "Pause collection rotation" }).click();
  await expect(transport.getByRole("button", { name: "Resume collection rotation" })).toBeVisible();
  await transport.getByRole("button", { name: "Next collection page" }).click();
  await expect(pageStatus).not.toHaveAttribute("aria-label", initialLabel);

  const viewHeaderHeight = await header.evaluate((element) => element.getBoundingClientRect().height);
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('.app-frame[data-dashboard-mode="build"]')).toBeVisible();
  await panel.scrollIntoViewIfNeeded();
  const action = panel.locator('[data-panel-menu="current-cases-collection"]');
  await expect(panel.locator(".panel-actions button")).toHaveCount(1);
  await expect(action).toHaveAttribute("aria-label", "Panel actions for Current cases");
  const geometry = await panel.evaluate((element) => {
    const headerElement = element.querySelector(".collection-display-header");
    const transportElement = headerElement.querySelector('[data-collection-header-transport="true"]');
    const actionElement = element.querySelector('[data-panel-menu="current-cases-collection"]');
    const transport = transportElement.getBoundingClientRect();
    const action = actionElement.getBoundingClientRect();
    return {
      headerHeight: headerElement.getBoundingClientRect().height,
      overlapWidth: Math.max(0, Math.min(transport.right, action.right) - Math.max(transport.left, action.left)),
      overlapHeight: Math.max(0, Math.min(transport.bottom, action.bottom) - Math.max(transport.top, action.top)),
    };
  });
  expect(geometry.headerHeight).toBe(viewHeaderHeight);
  expect(geometry.overlapWidth * geometry.overlapHeight).toBe(0);
  await panel.hover();
  await action.click();
  const menu = page.locator('[id="panel-menu-current-cases-collection"][role="menu"]');
  await expect(menu.getByRole("menuitem")).toHaveText([
    "Edit chart", "Move…", "Start section here", "Remove chart",
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
