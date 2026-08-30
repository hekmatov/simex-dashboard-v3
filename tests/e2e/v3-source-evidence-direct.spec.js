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

test("ordinary chart evidence action opens the dedicated viewer and returns to its invoker", async ({ page }) => {
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await panel.scrollIntoViewIfNeeded();
  const sourceAction = panel.getByRole("button", { name: "View source CSV", exact: true });
  await expect(sourceAction).toBeVisible();
  await expect(panel.getByRole("button", { name: "Show chart details" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("dialog", { name: /source/i })).toHaveCount(0);
  const before = await page.locator(".dashboard-command-page-scroller").evaluate((element) => ({
    scrollTop: element.scrollTop,
    page: document.querySelector('[aria-current="page"]')?.textContent,
  }));

  const popupPromise = page.waitForEvent("popup");
  await sourceAction.click();
  const viewer = await popupPromise;
  await viewer.waitForLoadState("domcontentloaded");
  await expect(viewer.getByRole("heading", { name: "Biomedical cases", exact: true })).toBeVisible();
  const provenance = viewer.getByRole("definition");
  await expect(viewer.getByText("Invoking chart", { exact: true })).toBeVisible();
  await expect(provenance).toContainText(["Confirmed cases", "national_total_cases", "bio_cases", "data/biomedical/cases.csv"]);
  await expect(viewer.getByText("177 of 177 rows", { exact: true })).toBeVisible();

  const closePromise = viewer.waitForEvent("close");
  await viewer.getByRole("button", { name: "Return to dashboard" }).click();
  await closePromise;
  await expect(sourceAction).toBeFocused();
  const after = await page.locator(".dashboard-command-page-scroller").evaluate((element) => ({
    scrollTop: element.scrollTop,
    page: document.querySelector('[aria-current="page"]')?.textContent,
  }));
  expect(after).toEqual(before);
});
