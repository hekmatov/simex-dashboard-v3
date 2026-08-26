import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const MANAGER_CSV = csvFile("journey-d-unused.csv", [
  "period,capacity,region",
  "2026-01,12,North",
  "2026-02,18,South",
]);
const CHART_CSV = csvFile("journey-d-chart.csv", [
  "date,cases,region",
  "2026-01-01,4,North",
  "2026-01-02,7,South",
  "2026-01-03,9,North",
]);

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
});

test("Journey D — CSV upload through six stages then catalogue management", async ({ page }) => {
  test.setTimeout(180_000);
  await openBiomedicalBuild(page, { width: 1440, height: 900 });
  const initial = await csvInventory(page);

  let manager = await openDataSourceManager(page);
  let intake = manager.getByRole("region", { name: "Add CSV to dashboard" });
  await intake.getByRole("button", { name: "Add CSV", exact: true }).click();
  await intake.getByLabel("CSV file").setInputFiles(MANAGER_CSV);
  await expect(intake.getByLabel("Display name")).toHaveValue("journey d unused");
  await expect(intake.getByLabel("CSV upload preview")).toContainText("capacity");
  await intake.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await csvInventory(page)).toEqual(initial);

  await intake.getByRole("button", { name: "Add CSV", exact: true }).click();
  await intake.getByLabel("CSV file").setInputFiles(MANAGER_CSV);
  await intake.getByLabel("Display name").fill("Journey D unused source");
  await intake.getByRole("button", { name: "Add to dashboard" }).click();
  await expect(manager.getByText("Journey D unused source", { exact: true })).toBeVisible();
  const afterManagerAdd = await csvInventory(page);
  expect(afterManagerAdd.sourceIds).toHaveLength(initial.sourceIds.length + 1);
  expect(afterManagerAdd.profileIds).toEqual(afterManagerAdd.sourceIds);
  expect(afterManagerAdd.entryIds).toEqual(afterManagerAdd.sourceIds);
  expect(afterManagerAdd.unusedNames).toContain("Journey D unused source");

  await page.reload();
  await openBiomedicalBuild(page, { width: 1440, height: 900 });
  manager = await openDataSourceManager(page);
  await expect(manager.getByText("Journey D unused source", { exact: true })).toBeVisible();
  intake = manager.getByRole("region", { name: "Add CSV to dashboard" });
  await intake.getByRole("button", { name: "Add CSV", exact: true }).click();
  await intake.getByLabel("CSV file").setInputFiles(MANAGER_CSV);
  await expect(intake.getByRole("status")).toContainText("Matching content already exists");
  await intake.getByRole("button", { name: "Cancel", exact: true }).click();
  await closeManager(page);

  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  let wizard = page.getByRole("dialog", { name: "Add new chart" });
  await expectExactSixStages(wizard);
  await wizard.getByRole("button", { name: /^Chart type\./ }).click();
  await wizard.getByRole("button", { name: /^Line\./ }).click();
  await wizard.getByLabel("Managed data source").selectOption({ label: "Journey D unused source" });
  await expect(wizard.getByRole("region", { name: "Selected source profile" })).toContainText("capacity");
  expect(await csvInventory(page)).toEqual(afterManagerAdd);
  await wizard.getByRole("button", { name: "Discard chart draft" }).click();
  await page.getByRole("dialog", { name: /Discard chart/ }).getByRole("button", { name: "Discard" }).click();
  await expect(wizard).toHaveCount(0);

  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  wizard = page.getByRole("dialog", { name: "Add new chart" });
  await expectExactSixStages(wizard);
  await wizard.getByRole("button", { name: /^Chart type\./ }).click();
  await wizard.getByRole("button", { name: /^Line\./ }).click();
  await wizard.getByLabel("CSV file").setInputFiles(CHART_CSV);
  expect(await csvInventory(page)).toEqual(afterManagerAdd);
  await wizard.getByRole("button", { name: "Close", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  expect(await csvInventory(page)).toEqual(afterManagerAdd);
  await page.getByRole("button", { name: "Resume chart draft" }).click();
  wizard = page.getByRole("dialog", { name: "Add new chart" });
  await expect(wizard.getByLabel("CSV file")).toBeVisible();
  await expect(wizard.getByRole("region", { name: "Selected source profile" })).toHaveCount(0);
  await wizard.getByRole("button", { name: "Discard chart draft" }).click();
  await page.getByRole("dialog", { name: /Discard chart/ }).getByRole("button", { name: "Discard" }).click();
  await expect(wizard).toHaveCount(0);
  expect(await csvInventory(page)).toEqual(afterManagerAdd);

  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  wizard = page.getByRole("dialog", { name: "Add new chart" });
  await expectExactSixStages(wizard);
  await wizard.getByRole("button", { name: /^Chart type\./ }).click();
  await wizard.getByRole("button", { name: /^Line\./ }).click();
  await wizard.getByLabel("CSV file").setInputFiles(CHART_CSV);
  await expect(wizard.getByRole("region", { name: "Selected source profile" })).toContainText("cases");
  await wizard.getByRole("button", { name: /^Map and prepare data\./ }).click();
  await wizard.getByRole("button", { name: "Add measurement" }).click();
  await wizard.getByLabel("Observation / X-axis").selectOption("date");
  await wizard.getByRole("button", { name: /^Configure chart\./ }).click();
  await wizard.getByLabel("Chart title").fill("Journey D CSV chart");
  await wizard.getByRole("button", { name: /^Review and create\./ }).click();
  await expect(wizard.getByText("All current values and both proofs are ready.")).toBeVisible();
  await wizard.getByRole("button", { name: "Create chart" }).click();
  await expect(wizard).toHaveCount(0);
  await expect(page.getByRole("treeitem", { name: "Journey D CSV chart", exact: true })).toHaveCount(1);

  const afterChartAdd = await csvInventory(page);
  expect(afterChartAdd.sourceIds).toHaveLength(afterManagerAdd.sourceIds.length + 1);
  expect(afterChartAdd.profileIds).toEqual(afterChartAdd.sourceIds);
  expect(afterChartAdd.entryIds).toEqual(afterChartAdd.sourceIds);

  manager = await openDataSourceManager(page);
  await selectSourceRow(manager, "journey d chart");
  const detail = manager.getByRole("region", { name: "Content detail" });
  await expect(detail).toContainText("3 rows");
  await expect(detail).toContainText("Used by");
  await expect(detail).toContainText("Journey D CSV chart");
  await detail.getByLabel("Search preview").fill("South");
  await expect(detail.getByRole("region", { name: "Searchable CSV preview" })).toContainText("1 matching rows shown");
  await expect(detail.getByRole("link", { name: "Download CSV" })).toHaveAttribute("download", "journey-d-chart.csv");
  await closeManager(page);
  await expect(page.getByRole("button", { name: "Source content", exact: true })).toBeFocused();

  await page.reload();
  await openBiomedicalBuild(page, { width: 1024, height: 768 });
  manager = await openDataSourceManager(page);
  await selectSourceRow(manager, "journey d chart");
  await expect(manager.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  const overflows = await manager.evaluate((node) => node.scrollWidth > node.clientWidth + 1);
  expect(overflows).toBe(false);
  await manager.getByRole("button", { name: "Back", exact: true }).click();
  await expect(manager.getByLabel("Search data sources")).toBeVisible();
  expect(await csvInventory(page)).toEqual(afterChartAdd);
});

async function openBiomedicalBuild(page, viewport) {
  await page.setViewportSize(viewport);
  if (page.url() === "about:blank") await page.goto("http://127.0.0.1:4175/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  const biomedical = page.locator(".dashboard-command-page-scroller").getByRole("button", { name: "Biomedical", exact: true });
  if (await biomedical.count()) await biomedical.click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
}

async function openDataSourceManager(page) {
  await page.getByRole("button", { name: "Source content", exact: true }).click();
  const manager = page.locator(".source-content-workspace");
  await expect(manager).toBeVisible();
  await manager.getByRole("tab", { name: "Data sources", exact: true }).click();
  return manager;
}

async function closeManager(page) {
  const host = page.getByRole("complementary", { name: "Source content authoring" });
  await host.getByRole("button", { name: "Close", exact: true }).click();
  await expect(host).toHaveCount(0);
}

async function selectSourceRow(manager, name) {
  const row = manager.locator(".source-content-row").filter({ hasText: name }).first();
  await expect(row).toBeVisible();
  await row.click();
}

async function expectExactSixStages(wizard) {
  const labels = await wizard.getByRole("navigation", { name: "Chart creation steps" }).getByRole("button").allTextContents();
  expect(labels.map((label) => label.replace(
    /(Complete|In progress|Not started|Waiting on prerequisite|Needs attention)$/u,
    "",
  ))).toEqual(["Destination", "Chart type", "Data source", "Map and prepare data", "Configure chart", "Review and create"]);
}

async function csvInventory(page) {
  return page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    if (!dashboard) return { sourceIds: [], profileIds: [], entryIds: [], unusedNames: [] };
    const entries = dashboard.contentLibrary?.sourceEntries ?? {};
    const sourceIds = Object.keys(dashboard.dataSources ?? {}).filter((id) => (
      dashboard.dataSources[id]?.kind === "dataset"
      && dashboard.dataSources[id]?.type === "uploadedCsv"
      && entries[id]
    )).sort();
    const used = new Set(dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .map(({ sourceId }) => sourceId).filter(Boolean));
    return {
      sourceIds,
      profileIds: sourceIds.filter((id) => dashboard.datasetProfiles?.[id]).sort(),
      entryIds: sourceIds.filter((id) => dashboard.dataSources?.[id]).sort(),
      unusedNames: sourceIds.filter((id) => !used.has(id)).map((id) => entries[id].displayName).sort(),
    };
  }, STORAGE_KEY);
}

function csvFile(name, lines) {
  return { name, mimeType: "text/csv", buffer: Buffer.from(lines.join("\n")) };
}
