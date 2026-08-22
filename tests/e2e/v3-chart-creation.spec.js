import { expect, test } from "@playwright/test";

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
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Build panel", exact: true }).click();
  await page.getByRole("button", { name: "Add chart", exact: true }).click();

  let wizard = page.getByRole("dialog");
  const stageLabels = await wizard.getByRole("navigation", { name: "Chart creation steps" })
    .getByRole("button").allTextContents();
  expect(stageLabels.map((label) => label.replace(/(Complete|In progress|Not started|Waiting on prerequisite|Needs attention)$/u, "")))
    .toEqual(["Destination", "Chart type", "Data source", "Map and prepare data", "Configure chart", "Review and create"]);

  await wizard.getByRole("button", { name: /^Chart type\./ }).click();
  await wizard.getByRole("button", { name: /^Line\./ }).click();
  await expect(wizard).toHaveAccessibleName("Data source");
  await wizard.getByRole("button", { name: "Close" }).click();
  await expect(wizard).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Resume chart draft" })).toBeVisible();
  await page.getByRole("button", { name: "Resume chart draft" }).click();
  wizard = page.getByRole("dialog");

  await wizard.getByLabel("Dashboard data source").selectOption("bio_cases");
  await wizard.getByRole("button", { name: /^Map and prepare data\./ }).click();
  await wizard.getByRole("button", { name: "Add measurement" }).click();
  await wizard.getByLabel("Observation / X-axis").selectOption("date");
  await wizard.getByRole("button", { name: /^Configure chart\./ }).click();
  await wizard.getByLabel("Chart title").fill("E2E atomic Step 7 chart");
  await wizard.getByRole("button", { name: /^Review and create\./ }).click();
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
});
