import { expect, test } from "@playwright/test";
import { openFreshChartAuthoring, resumeChartAuthoring } from "./support/chart-authoring-workflow.js";
import { resetSourceDashboard } from "./support/dashboardFixture.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const SOURCE_ID = "upload-cases-wcph-eldoria-3";
const CHART_TITLE = "E2E atomic M0 chart";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("six-stage chart creation suspends and commits exactly once", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  await resetSourceDashboard(page, { fixture: "fable-m0" });
  await expect(page.locator('[data-canonical-page-id="m0-dashboard"]')).toBeVisible();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  let flow = await openFreshChartAuthoring(page);
  let { wizard } = flow;
  await expect(wizard.getByLabel("Destination page")).toHaveValue("m0-dashboard");
  await expect(wizard.getByLabel("Destination section")).toHaveValue("m0-data");
  await flow.selectExistingSource("cases WCPH eldoria");
  await expect(wizard.getByRole("region", { name: "Selected source profile" })).toContainText("national_total_cases");
  await flow.chooseChartType(null, /^Line\./);
  const firstDraftId = await wizard.getAttribute("data-chart-draft-id");
  expect(firstDraftId).toMatch(/^chart-line-/);
  await expect(wizard).toHaveAccessibleName("Add new chart");
  await expect(flow.stageButton("map-and-prepare-data")).toHaveAttribute("aria-current", "step");
  await flow.selectRole("measurements", "national_total_cases");
  await flow.selectRole("observation", "Date");
  await flow.goToConfigure();
  await wizard.getByRole("textbox", { name: "Chart title", exact: true }).fill(CHART_TITLE);
  await flow.nextStage("review-and-create");
  await expect(wizard.getByText("All current values and both proofs are ready.")).toBeVisible();
  await flow.previousStage("configure-chart");
  await flow.goToMapAndPrepare();
  await flow.suspend();
  flow = await resumeChartAuthoring(page);
  wizard = flow.wizard;
  await expect(wizard).toHaveAttribute("data-chart-draft-id", firstDraftId);
  await expect(flow.stageButton("map-and-prepare-data")).toHaveAttribute("aria-current", "step");

  await flow.goToMapAndPrepare();
  await flow.selectRole("measurements", "national_total_cases");
  await flow.selectRole("observation", "Date");
  await flow.goToConfigure();
  await wizard.getByRole("textbox", { name: "Chart title", exact: true }).fill(CHART_TITLE);
  await flow.goToReview();
  await expect(wizard.getByText("All current values and both proofs are ready.")).toBeVisible();
  await flow.createChart(CHART_TITLE);
  await expect(page.getByRole("treeitem", { name: CHART_TITLE, exact: true })).toHaveCount(1);
  await expect.poll(() => page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .filter(({ title }) => title === "E2E atomic M0 chart");
  }, STORAGE_KEY)).toHaveLength(1);

  await page.reload();
  await expect(page.locator('[data-canonical-page-id="m0-dashboard"]')).toBeVisible();
  await expect(page.locator('[data-panel-id]').filter({ hasText: CHART_TITLE })).toHaveCount(1);
  await expect.poll(() => page.evaluate(({ key, title }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .filter((chart) => chart.title === title)
      .map((chart) => chart.sourceId);
  }, { key: STORAGE_KEY, title: CHART_TITLE })).toEqual([SOURCE_ID]);

  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  flow = await openFreshChartAuthoring(page);
  wizard = flow.wizard;
  await expect(flow.stageButton("destination")).toHaveAttribute("aria-current", "step");
  await expect(wizard.getByText(/already exists in the dashboard/i)).toHaveCount(0);
  await flow.selectExistingSource("cases WCPH eldoria");
  await flow.chooseChartType(null, /^Line\./);
  const secondDraftId = await wizard.getAttribute("data-chart-draft-id");
  expect(secondDraftId).toMatch(/^chart-line-/);
  expect(secondDraftId).not.toBe(firstDraftId);
});
