import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parseDashboardBundle } from "../../src/charting/config/dashboardBundleV3.js";
import { enterBuildMode } from "./support/buildWorkflow.js";
import { openChartAuthoring } from "./support/chart-authoring-workflow.js";

const APP_URL = process.env.SIMEX_MANUAL_EXPORT_URL ?? "http://127.0.0.1:4175/";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const TITLE = "Manual package repair check";
test.use({ storageState: { cookies: [], origins: [] } });

test("manual KPI saves with empty optional Target and Time fields after clearing a target", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(APP_URL);
  await enterBuildMode(page);
  const flow = await openChartAuthoring(page);
  await flow.selectExistingSource("Cases — Biomedical");
  await flow.chooseChartType("kpi", /^KPI\b/i);
  await flow.goToDataSource();
  await flow.wizard.locator('[data-icon-control="wizard.enter-data-manually"]').click();
  await flow.wizard.getByLabel("Value row 1", { exact: true }).fill("125");
  await flow.wizard.getByLabel("Target row 1", { exact: true }).fill("30");
  await flow.wizard.getByLabel("Entity row 1", { exact: true }).fill("Hospital");
  await flow.wizard.getByLabel("Label row 1", { exact: true }).fill("A");
  await flow.wizard.getByLabel("Target row 1", { exact: true }).fill("");
  await flow.wizard.getByRole("button", { name: "Add row", exact: true }).click();
  await flow.wizard.getByLabel("Value row 2", { exact: true }).fill("140");
  await flow.wizard.getByLabel("Entity row 2", { exact: true }).fill("gh");
  await flow.createChart(TITLE);
  const authored = await snapshot(page);
  expect(authored.chart.roles.target).toBeUndefined();
  expect(authored.chart.roles.time).toBeUndefined();
  expect(authored.source.rows).toEqual([
    { value: "125", target: "", entity: "Hospital", label: "A", time: "" },
    { value: "140", target: "", entity: "gh", label: "", time: "" },
  ]);
  await page.reload();
  await enterBuildMode(page);
  expect(await snapshot(page)).toEqual(authored);
  const panel = page.locator(`[data-canonical-panel-id="${authored.chart.id}"]`).first();
  await panel.scrollIntoViewIfNeeded();
  await expect(panel).toContainText("125");
  await expect(panel).toContainText("140");
});

test("manual KPI creation downloads a package that imports and reloads with its data and bindings", async ({ page, browser }, testInfo) => {
  // The shipped package includes the municipal map data; import hydrates it too.
  test.setTimeout(240_000);
  await page.goto(APP_URL);
  await enterBuildMode(page);
  const flow = await openChartAuthoring(page);
  // Select a shipped tabular source to unlock chart type, then switch to manual entry.
  await flow.selectExistingSource("Cases — Biomedical");
  await flow.chooseChartType("kpi", /^KPI\b/i);
  await flow.goToDataSource();
  await flow.wizard.locator('[data-icon-control="wizard.enter-data-manually"]').click();
  await flow.wizard.getByLabel("Value row 1", { exact: true }).fill("37");
  await flow.wizard.getByLabel("Target row 1", { exact: true }).fill("50");
  await flow.wizard.getByLabel("Entity row 1", { exact: true }).fill("Clinic A");
  await flow.wizard.getByLabel("Label row 1", { exact: true }).fill("Repair value");
  await flow.wizard.getByLabel("Time row 1", { exact: true }).fill("2026-10-27");
  await flow.createChart(TITLE);
  const authored = await snapshot(page);
  expect(authored.source.kind).toBe("inline");
  expect(authored.source.rows[0].value).toBe("37");

  await page.locator(".dashboard-scenario-trigger").click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await expect(passport).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept("manual-data-roundtrip"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    passport.getByRole("button", { name: "Download Dashboard Package", exact: true }).click(),
  ]);
  const bundlePath = testInfo.outputPath("manual-data-roundtrip.json");
  await download.saveAs(bundlePath);
  const bytes = await readFile(bundlePath);
  const imported = parseDashboardBundle(bytes.toString());
  expect(imported.dataSources[authored.chart.sourceId]).toEqual(authored.source);
  const exportedProfile = JSON.parse(bytes.toString()).config.datasetProfiles[authored.chart.sourceId];
  expect(exportedProfile.rowCount).toBe(1);
  expect(exportedProfile.columns).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "value", type: "numeric", examples: ["37"] }),
  ]));
  expect(imported.datasetProfiles[authored.chart.sourceId]).toEqual(exportedProfile);

  const context = await browser.newContext();
  try {
    const target = await context.newPage();
    await target.goto(APP_URL);
    await enterBuildMode(target);
    await target.locator('input[type="file"][accept*="application/json"]').first().setInputFiles({
      name: "manual-data-roundtrip.json", mimeType: "application/json", buffer: bytes,
    });
    const review = target.getByRole("dialog", { name: "Review package contents" });
    await review.getByRole("button", { name: "Load package", exact: true }).click();
    await expect(review).toHaveCount(0);
    await expect.poll(() => snapshot(target)).toEqual(authored);
    await target.reload();
    await enterBuildMode(target);
    await expect.poll(() => snapshot(target)).toEqual(authored);
    const panel = target.locator(`[data-canonical-panel-id="${authored.chart.id}"]`).first();
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toContainText("37");
    await expect(panel).toContainText(TITLE);
  } finally {
    await context.close();
  }
});

async function snapshot(page) {
  return page.evaluate(({ key, title }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const chart = dashboard?.pages.flatMap((page) => page.sections)
      .flatMap((section) => section.panels).map((panel) => panel.chart ?? panel)
      .find((chart) => chart.title === title);
    if (!chart) return null;
    // Storage deliberately omits unchanged runtime profiles; the package asserts them above.
    return { chart, source: dashboard.dataSources[chart.sourceId] };
  }, { key: STORAGE_KEY, title: TITLE });
}
