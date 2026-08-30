import { expect, test } from "@playwright/test";

import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
});

test("multi-page Collection transport stays in the header and leaves Build Edit rightmost", async ({ page }) => {
  const panel = page.locator('[data-panel-id="bio_current_cases_kpi"]');
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
  const actions = panel.locator(".panel-actions button");
  await expect(actions).toHaveCount(4);
  await expect(actions.last()).toHaveAttribute("aria-label", "Edit chart");
  const geometry = await panel.evaluate((element) => {
    const headerElement = element.querySelector(".collection-display-header");
    const transportElement = headerElement.querySelector('[data-collection-header-transport="true"]');
    const editElement = element.querySelector('[aria-label="Edit chart"]');
    return { headerHeight: headerElement.getBoundingClientRect().height, transportRight: transportElement.getBoundingClientRect().right, editLeft: editElement.getBoundingClientRect().left };
  });
  expect(geometry.headerHeight).toBe(viewHeaderHeight);
  expect(geometry.transportRight).toBeLessThanOrEqual(geometry.editLeft);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
