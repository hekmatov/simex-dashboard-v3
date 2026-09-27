import { choosePanelAction, structureRail, propertiesPane } from "./support/buildWorkflow.js";
import { expect, test } from "@playwright/test";

import {
  enterAuthoredDashboard,
  openDashboardPage,
} from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const EDIT_CHART_ID = "chart-line-mtgz6v76";
const EDIT_SOURCE_ID = "upload-cases-wcph-eldoria-3";

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
  await openBiomedicalPageInspector(page);
  const panel = page.locator(`[data-panel-id="${EDIT_CHART_ID}"]`);
  await expect(panel).toBeVisible();
  const before = await biomedicalChartState(page);
  expect(before).toMatchObject({
    pageTitle: "Biomedical Information",
    targetCount: 1,
    chartTitle: "National Confirmed Cases (cumulative)",
    sourceId: EDIT_SOURCE_ID,
    typeId: "line",
  });
  expect(before.chartCount).toBeGreaterThan(1);
  await propertiesPane(page).getByLabel("Page title", { exact: true })
    .fill("Race-safe exercise");
  expect((await biomedicalChartState(page)).pageTitle).toBe(before.pageTitle);
  await panel.scrollIntoViewIfNeeded();
  await panel.hover();
  await choosePanelAction(page, await panel.getAttribute("data-build-placement-id"), "edit");
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await quick.getByRole("textbox", { name: "Chart title", exact: true }).fill("Race-safe chart title");
  await quick.getByRole("button", { name: "Save", exact: true }).click();
  await expect(quick).toHaveCount(0);

  const expected = {
    ...before,
    persisted: true,
    pageTitle: "Race-safe exercise",
    chartTitle: "Race-safe chart title",
  };
  await expect.poll(() => biomedicalChartState(page)).toEqual(expected);
  await page.waitForTimeout(800);
  expect(await biomedicalChartState(page)).toEqual(expected);
});

test("reset cancels a pending header callback so it cannot reappear", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Build" }).click();
  const map = await openBiomedicalPageInspector(page);
  const baselineHeading = (await page.locator(".dashboard-brand-block h1")
    .textContent()).trim();
  await propertiesPane(page).getByLabel("Page title", { exact: true })
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
  const map = structureRail(page);
  const pageTitle = propertiesPane(page).getByLabel("Page title", { exact: true });
  await expect(pageTitle).toBeVisible();
  return map;
}

function storedBiomedicalTitle(page) {
  return page.evaluate((key) => {
    const config = JSON.parse(localStorage.getItem(key));
    return config.pages.find(({ id }) => id === "biomedical").title;
  }, STORAGE_KEY);
}

function biomedicalChartState(page) {
  return page.evaluate(async ({ key, chartId }) => {
    const storedText = localStorage.getItem(key);
    const config = storedText
      ? JSON.parse(storedText)
      : await fetch("/config/dashboard.json").then((response) => response.json());
    const biomedical = config.pages.find(({ id }) => id === "biomedical");
    const charts = biomedical.sections.flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement);
    const targets = charts.filter(({ id }) => id === chartId);
    return {
      persisted: Boolean(storedText),
      pageTitle: biomedical.title,
      chartCount: charts.length,
      targetCount: targets.length,
      chartTitle: targets[0]?.title ?? null,
      sourceId: targets[0]?.sourceId ?? null,
      typeId: targets[0]?.typeId ?? null,
    };
  }, { key: STORAGE_KEY, chartId: EDIT_CHART_ID });
}
