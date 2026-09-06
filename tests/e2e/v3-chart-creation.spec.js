import { expect, test } from "@playwright/test";
import { chartAuthoringWorkflow, openChartAuthoring } from "./support/chart-authoring-workflow.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("six-stage chart creation suspends and commits exactly once", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  let flow = await openChartAuthoring(page);
  let { wizard } = flow;
  await flow.selectExistingSource("Biomedical cases");
  await flow.chooseChartType(null, /^Line\./);
  const firstDraftId = await wizard.getAttribute("data-chart-draft-id");
  expect(firstDraftId).toMatch(/^chart-line-/);
  await expect(wizard).toHaveAccessibleName("Add new chart");
  await expect(flow.stageButton("mapAndPrepare")).toHaveAttribute("aria-current", "step");
  await flow.selectRole("measurements", "national_total_cases");
  await flow.selectRole("observation", "date");
  await flow.goToConfigure();
  await wizard.getByRole("textbox", { name: "Chart title", exact: true }).fill("E2E atomic Step 7 chart");
  await flow.goToReview();
  await expect(wizard.getByText("All current values and both proofs are ready.")).toBeVisible();
  await flow.goToMapAndPrepare();
  await wizard.getByRole("button", { name: "Close" }).click();
  await expect(wizard).toHaveCount(0);
  const pendingWork = page.getByRole("navigation", { name: "Pending Build work" });
  const createOwner = pendingWork.locator('[data-pending-work-kind="chart-create"]');
  await expect(createOwner).toHaveCount(1);
  await createOwner.getByRole("button", {
    name: "Resume New chart draft",
    exact: true,
  }).click();
  wizard = page.getByRole("dialog");
  flow = chartAuthoringWorkflow(wizard);
  await expect(flow.stageButton("mapAndPrepare")).toHaveAttribute("aria-current", "step");

  await flow.goToMapAndPrepare();
  await flow.selectRole("measurements", "national_total_cases");
  await flow.selectRole("observation", "date");
  await flow.goToConfigure();
  await wizard.getByRole("textbox", { name: "Chart title", exact: true }).fill("E2E atomic Step 7 chart");
  await flow.goToReview();
  await expect(wizard.getByText("All current values and both proofs are ready.")).toBeVisible();
  await wizard.getByRole("button", { name: "Create chart" }).click();

  await expect(wizard).toHaveCount(0);
  await expect(page.getByRole("treeitem", { name: "E2E atomic Step 7 chart", exact: true })).toHaveCount(1);
  await expect.poll(() => page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .filter(({ title }) => title === "E2E atomic Step 7 chart").length;
  }, STORAGE_KEY)).toBe(1);

  flow = await openChartAuthoring(page);
  wizard = flow.wizard;
  await expect(flow.stageButton("destination")).toHaveAttribute("aria-current", "step");
  await expect(wizard.getByText(/already exists in the dashboard/i)).toHaveCount(0);
  await flow.selectExistingSource("Biomedical cases");
  await flow.chooseChartType(null, /^Line\./);
  const secondDraftId = await wizard.getAttribute("data-chart-draft-id");
  expect(secondDraftId).toMatch(/^chart-line-/);
  expect(secondDraftId).not.toBe(firstDraftId);
});
