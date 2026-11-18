import { expect, test } from "@playwright/test";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";
import { openChartAuthoring } from "./support/chart-authoring-workflow.js";
import { resetSourceDashboard } from "./support/dashboardFixture.js";
import { normalizeDashboardBoundary } from "../../src/charting/config/dashboardBundleV3.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const EXERCISE_TIME = "2027-05-02T00:00:00.000Z";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ page, request }) => {
  await page.addInitScript(() => performance.setResourceTimingBufferSize(2000));
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
  await resetSourceDashboard(page, { fixture: "fable-m0" });
  const response = await page.request.get("/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const fixture = await response.json();
  expect(fixture.id).toBe("fable-m0-dashboard");
  // This uploaded dataset is observed on May 1/2. Declare the exercise instant
  // explicitly; Live authoring must not silently jump from February to future rows.
  const config = normalizeDashboardBoundary({ ...fixture,
    scenario: { ...fixture.scenario, exerciseTime: EXERCISE_TIME },
  }, { profiles: fixture.datasetProfiles });
  await page.evaluate(({ key, config }) => localStorage.setItem(key, JSON.stringify(config)), { key: STORAGE_KEY, config });
  await page.reload();
  await enterAuthoredDashboard(page);
  await expect(page.getByRole("region", { name: "Dashboard time", exact: true })).toHaveAttribute("data-time-mode", "live");
  await expect(page.locator(".time-bar__instant")).toContainText("2027-05-02");
  await page.getByRole("button", { name: "Build" }).click();
});

test("geography exercise time preflight reaches Live May 2 and Build controls", async ({ page }) => {
  await expect(page.locator('[data-build-command-action="add-chart"]')).toBeEnabled();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).scenario.exerciseTime, STORAGE_KEY)).toBe(EXERCISE_TIME);
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType("resource").some(resource => /\/deps\/echarts\.js(?:\?|$)/.test(resource.name)))).toBe(true);
});

test("a fresh chronological choropleth reaches preview through the early GeoJSON selector", async ({
  page,
}) => {
  const flow = await openChartAuthoring(page);
  const { wizard } = flow;

  await flow.uploadCsv({
    name: "fresh-municipal-cases.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Date,MunicipalityCode,cases\n2027-05-01,GM0473,10\n2027-05-02,GM0473,12\n"),
  });
  await flow.chooseChartType(
    "chronological choropleth",
    /Chronological choropleth/i,
  );
  await flow.goToDataSource();
  await wizard.getByLabel("GeoJSON source").selectOption(
    "geo_netherlands_municipalities_2026",
  );

  await flow.goToMapAndPrepare();
  await flow.selectRole("geography", "MunicipalityCode");
  await flow.selectRole("value", "cases");
  await flow.selectRole("time", "Date");

  await expect(
    wizard.locator('[data-field-id="geoSource"]'),
  ).toHaveCount(1);
  await flow.goToConfigure();
  await expect(
    wizard.locator(".chart-authoring-preview-ready"),
  ).toBeVisible();
  await wizard.getByRole("textbox", { name: "Chart title", exact: true }).fill("Fresh municipal map");
  const preview = wizard.getByRole("region", { name: "Chart preview", exact: true });
  await expect(preview).toBeVisible();
  const previewTime = preview.getByRole("group", { name: "Preview time", exact: true });
  await expect(previewTime.getByRole("button", { name: "Live preview", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(previewTime).toContainText("2027-05-02");
  await expect(preview.getByRole("heading", { name: "Fresh municipal map", exact: true })).toBeVisible();
  await expect.poll(() => preview.locator(".chart-echarts-host").evaluate(async host => {
    const url = performance.getEntriesByType("resource").find(resource => /\/deps\/echarts\.js(?:\?|$)/.test(resource.name))?.name;
    if (!url) throw new Error("The rendered map has no observed ECharts engine resource.");
    const engine = await import(url);
    const instance = engine.getInstanceByDom(host);
    // ECharts adds name-only boundary placeholders. Check every entry that has
    // a measurement, including invalid/null values rather than filtering those out.
    return (instance?.getOption().series?.[0]?.data ?? []).filter(item => Object.hasOwn(item, "value"))
      .map(item => ({ value: item.value, geography: item.feature?.id, time: item.time, status: item.temporalStatus }));
  })).toEqual([{ value: 12, geography: "GM0473", time: "2027-05-02", status: "observed" }]);
  await expect(
    wizard.locator('[data-field-id="geoSource"]'),
  ).toHaveCount(0);
  await flow.goToReview();
  await expect(
    wizard.getByRole("button", { name: "Create chart" }),
  ).toBeEnabled();
});
