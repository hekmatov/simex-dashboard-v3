import { expect, test } from "@playwright/test";

import {
  enterAuthoredDashboard,
  openDashboardPage,
} from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await openDashboardPage(page, "biomedical");
  await expect(page.getByRole("button", {
    name: "Build",
  })).toBeVisible();
});

test("a pending header edit and immediate chart save commit in order", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Build" }).click();
  const map = await openBiomedicalPageInspector(page);
  await map.getByLabel("Page title", { exact: true })
    .fill("Race-safe exercise");
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await page.getByRole("button", { name: "Edit chart" }).first().click();
  await page.getByRole("button", {
    name: "Appearance",
    exact: true,
  }).click();
  await page.getByLabel("Chart title").fill("Race-safe chart title");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();

  await expect.poll(() => page.evaluate((key) => {
    const config = JSON.parse(localStorage.getItem(key));
    const biomedical = config.pages.find(({ id }) => id === "biomedical");
    const charts = biomedical.sections.flatMap(({ panels }) => panels);
    return {
      pageTitle: biomedical.title,
      chartSaved: charts.some(({ title }) => (
        title === "Race-safe chart title"
      )),
    };
  }, STORAGE_KEY)).toEqual({
    pageTitle: "Race-safe exercise",
    chartSaved: true,
  });
});

test("reset cancels a pending header callback so it cannot reappear", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Build" }).click();
  const map = await openBiomedicalPageInspector(page);
  const baselineHeading = (await page.locator(".dashboard-brand-block h1")
    .textContent()).trim();
  await map.getByLabel("Page title", { exact: true })
    .fill("Must never reappear");
  await page.locator(".build-command-header")
    .getByRole("button", { name: "Discard Build changes", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard Build changes?" })
    .getByRole("button", { name: "Discard Build changes", exact: true })
    .click();
  await page.waitForTimeout(800);

  await expect(page.locator(".dashboard-brand-block h1")).toHaveText(
    baselineHeading,
  );
  await expect.poll(() => storedBiomedicalTitle(page)).toBe(
    baselineHeading,
  );
});

async function openBiomedicalPageInspector(page) {
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  const inspector = map.getByRole("button", { name: "Inspector", exact: true });
  await expect.poll(() => inspector.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      bottom: bounds.bottom <= window.innerHeight,
      left: bounds.left >= 0,
      right: bounds.right <= window.innerWidth,
      top: bounds.top >= 0,
    };
  })).toEqual({ bottom: true, left: true, right: true, top: true });
  await inspector.click();
  return map;
}

function storedBiomedicalTitle(page) {
  return page.evaluate((key) => {
    const config = JSON.parse(localStorage.getItem(key));
    return config.pages.find(({ id }) => id === "biomedical").title;
  }, STORAGE_KEY);
}
