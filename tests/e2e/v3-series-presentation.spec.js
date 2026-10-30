import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { validateDashboardConfig } from "../../src/charting/config/dashboardBundleV3.js";
import { chartAuthoringWorkflow } from "./support/chart-authoring-workflow.js";
import { choosePanelAction } from "./support/buildWorkflow.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

const reported = JSON.parse(readFileSync(new URL("../fixtures/v3-issue-30-charts.json", import.meta.url)));
const fixture = JSON.parse(readFileSync(new URL("../fixtures/fable-m0-dashboard.json", import.meta.url)));
fixture.dataSources = reported.dataSources;
fixture.datasetProfiles = reported.datasetProfiles;
fixture.contentLibrary.sourceEntries = reported.sourceEntries;
fixture.chronoGroups = [];
fixture.scenes = [];
fixture.pages = [{ id: "presentation-proof", title: "Presentation proof", sections: [{ id: "reported", title: "Reported charts", panels: reported.charts }] }];
validateDashboardConfig(fixture);
const priorities = reported.charts.find(c => c.title.startsWith("Priorities"));
const support = reported.charts.find(c => c.typeId === "line");
const STORAGE = "simex-dashboard-config-v3-three-mode-v1";

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  await page.route("**/config/dashboard.json", route => route.fulfill({ json: fixture }));
  await page.route("**/config/dataset-profiles.json", route => route.fulfill({ json: fixture.datasetProfiles }));
  await page.goto("/");
  await openDashboardPage(page, "presentation-proof");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
});

test("V3 #28 #30 reported single-series bars retain category colors after ordering and reload", async ({ page }) => {
  test.setTimeout(90_000);
  const editor = await edit(page, priorities.id);
  const colors = editor.locator('[data-field-id="categoryColors"]');
  await expect(colors.locator("li")).toHaveCount(5);
  await colors.getByLabel("Bar color: More social contact", { exact: true }).fill("#FF0000");
  await colors.getByLabel("Bar color: More social contact", { exact: true }).press("Tab");
  const order = editor.locator('[data-field-id="categoryOrder"]');
  const up = order.getByRole("button", { name: "Move More social contact up", exact: true });
  await up.focus();
  await up.press("Enter");
  await expect(order.locator("li").first()).toContainText("More social contact");
  await save(editor);
  const saved = await savedChart(page, priorities.id);
  expect(saved.presentation.axes.x.categoryOrder[0]).toContain("More social contact");
  expect(saved.presentation.series.categoryOverrides[saved.presentation.axes.x.categoryOrder[0]]).toEqual({ color: "#FF0000" });
  await page.reload();
  await openDashboardPage(page, "presentation-proof");
  const option = await rendered(page, priorities.id);
  expect(option.categories[0]).toBe("More social contact");
  expect(option.series).toHaveLength(1);
  expect(option.series[0].data[0]).toMatchObject({ value: 24, itemStyle: { color: "#FF0000" } });
  const reopened = await edit(page, priorities.id);
  await expect(reopened.getByLabel("Bar color: More social contact", { exact: true })).toHaveValue("#FF0000");
});

test("V3 #20 #28 reported multi-series chart preserves legend choices data and colors", async ({ page }) => {
  test.setTimeout(90_000);
  const editor = await edit(page, support.id);
  const entries = editor.locator('[data-field-id="legendEntries"]');
  await expect(entries.locator("li")).toHaveCount(4);
  const originalNames = await entries.locator("li > span").allTextContents();
  await entries.locator("li").nth(0).getByRole("textbox").fill("Shared alias");
  await entries.locator("li").nth(1).getByRole("textbox").fill("Shared alias");
  await entries.locator("li").nth(1).getByRole("checkbox").uncheck();
  await editor.locator('[data-field-id="seriesColorsByIdentity"] li').nth(1).getByRole("textbox").fill("#123456");
  await editor.locator('[data-field-id="seriesColorsByIdentity"] li').nth(1).getByRole("textbox").press("Tab");
  const order = editor.locator('[data-field-id="seriesOrder"]');
  await order.getByRole("button", { name: `Move ${originalNames[1]} up`, exact: true }).click();
  await editor.getByLabel("Show legend", { exact: true }).uncheck();
  await save(editor);
  expect((await rendered(page, support.id)).legend.show).toBe(false);
  const reopened = await edit(page, support.id);
  await expect(reopened.getByLabel("Show legend", { exact: true })).not.toBeChecked();
  await reopened.getByLabel("Show legend", { exact: true }).check();
  await save(reopened);
  await page.reload();
  await openDashboardPage(page, "presentation-proof");
  const option = await rendered(page, support.id);
  expect(option.series).toHaveLength(4);
  expect(option.series.every(s => s.data.length === 4)).toBe(true);
  expect(option.legend.data).toHaveLength(3);
  expect(option.series[0].color).toBe("#123456");
  expect(option.series.every(s => s.type === "line" && s.axis === 0)).toBe(true);
  const final = await edit(page, support.id);
  const finalEntries = final.locator('[data-field-id="legendEntries"]');
  await expect(finalEntries.locator("li").nth(0).getByRole("textbox")).toHaveValue("Shared alias");
  await expect(finalEntries.locator("li").nth(1).getByRole("checkbox")).not.toBeChecked();
  await finalEntries.locator("li").nth(0).getByRole("textbox").fill("");
  await save(final);
  const configuration = await savedChart(page, support.id);
  const records = Object.values(configuration.presentation.legend.entries);
  expect(records.filter(entry => entry.label === "Shared alias")).toHaveLength(1);
});

async function edit(page, id) {
  const modes = page.getByLabel("Dashboard mode");
  await modes.getByRole("button", { name: "Build", exact: true }).click();
  const panel = page.locator(`[data-canonical-panel-id="${id}"]`);
  await panel.scrollIntoViewIfNeeded();
  await panel.hover();
  await choosePanelAction(page, await panel.getAttribute("data-canonical-placement-id"), "edit");
  await page.locator(".chart-quick-editor").getByRole("button", { name: "Open full editor", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit chart", exact: true });
  await chartAuthoringWorkflow(editor, { mode: "edit" }).goToConfigure();
  return editor;
}
async function save(editor) {
  await editor.locator('[data-icon-control="editor.save-changes"]').click();
  await expect(editor).toHaveCount(0);
}
async function savedChart(page, id) {
  return page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)).pages.flatMap(p => p.sections).flatMap(s => s.panels).map(p => p.chart ?? p).find(c => c.id === id), { key: STORAGE, id });
}
async function rendered(page, id) {
  const panel = page.locator(`[data-canonical-panel-id="${id}"]`);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator("canvas").first()).toBeVisible();
  return panel.evaluate(async node => {
    const url = performance.getEntriesByType("resource").find(r => /\/deps\/echarts\.js\?/.test(r.name))?.name;
    const { getInstanceByDom } = await import(url);
    const instance = getInstanceByDom(node.querySelector(".chart-echarts-host"));
    const option = instance.getOption();
    return { categories: option.yAxis[0].type === "category" ? option.yAxis[0].data : option.xAxis[0].data,
      legend: { show: option.legend[0].show, data: option.legend[0].data },
      series: option.series.map(s => ({ id: s.id, data: s.data, type: s.type, axis: s.yAxisIndex, color: s.itemStyle?.color })) };
  });
}
