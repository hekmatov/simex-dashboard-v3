import { expect, test } from "@playwright/test";
import { openChartAuthoring } from "./support/chart-authoring-workflow.js";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { choosePanelAction } from "./support/buildWorkflow.js";

const ISSUE_CONTROLS = "V3 #11 #16 #19 #28 #29 existing controls remain editable and persistent";
const ISSUE_STORAGE = "simex-dashboard-config-v3-three-mode-v1";

test(`${ISSUE_CONTROLS}: gauge range typing`, async ({ page }) => {
  test.setTimeout(90_000);
  const flow = await openWizard(page);
  await flow.selectExistingSource("cases WCPH eldoria");
  await flow.chooseChartType("gauge", /^Gauge\./);
  await flow.goToDataSource();
  await flow.wizard.locator('[data-icon-control="wizard.enter-data-manually"]').click();
  await flow.wizard.getByLabel("Value row 1", { exact: true }).fill("72");
  await flow.goToConfigure();
  const ranges = flow.wizard.getByLabel("Status-band upper limits");
  await ranges.fill("");
  let typed = "";
  for (const character of "50, 80, 100") {
    typed += character;
    await ranges.pressSequentially(character);
    await expect(ranges).toHaveValue(typed);
  }
  await ranges.press("Backspace");
  await expect(ranges).toHaveValue("50, 80, 10");
  await ranges.pressSequentially("0");
  await flow.createChart("Incremental ranges proof");
  const saved = await issueSavedChart(page, "Incremental ranges proof");
  expect(saved.presentation.targets.ranges).toEqual([50, 80, 100]);
  const editor = await issueOpenEditor(page, saved.id);
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  await expect(editor.getByLabel("Status-band upper limits")).toHaveValue("50, 80, 100");
});

test(`${ISSUE_CONTROLS}: category labels and ordinary axis bounds`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1117, height: 766 });
  const flow = await issueBarFlow(page);
  await flow.goToConfigure();
  const x = flow.wizard.getByRole("group", { name: "X axis", exact: true });
  await x.getByLabel("Tick label font size", { exact: true }).fill("10");
  await x.getByLabel("Wrap long labels", { exact: true }).check();
  await x.getByLabel("Wrapped label width (× tick-label font size)").fill("4");
  const primary = flow.wizard.getByRole("group", { name: "Primary axis", exact: true });
  await primary.getByLabel("Maximum", { exact: true }).fill("100");
  await primary.getByLabel("Minimum", { exact: true }).fill("40");
  await expect(primary.getByLabel("Maximum", { exact: true })).toHaveValue("100");
  await flow.createChart("Axis controls proof");
  const saved = await issueSavedChart(page, "Axis controls proof");
  expect(saved.presentation.axes.x).toMatchObject({ labelWrap: true, labelFontSize: 10, labelMaxWidthEm: 4 });
  expect(saved.presentation.axes.primary).toMatchObject({ min: 40, max: 100 });
  const panel = page.locator(`[data-canonical-panel-id="${saved.id}"]`);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator("canvas").first()).toBeVisible();
  const option = await issueRenderedAxis(panel);
  expect(option).toMatchObject({ minimum: 40, maximum: 100, wrap: "break", width: 40, clip: true });
  const editor = await issueOpenEditor(page, saved.id);
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  const reset = editor.getByRole("group", { name: "Primary axis", exact: true });
  await reset.getByLabel("Minimum", { exact: true }).fill("");
  await reset.getByLabel("Maximum", { exact: true }).fill("");
  await editor.locator('[data-icon-control="editor.save-changes"]').click();
  await expect(editor).toHaveCount(0);
  expect((await issueSavedChart(page, "Axis controls proof")).presentation.axes.primary?.min).toBeUndefined();
});

test(`${ISSUE_CONTROLS}: categorical filter source suggestions`, async ({ page }) => {
  test.setTimeout(90_000);
  const flow = await issueBarFlow(page, "category,value\nNorth,50\nSouth,60\nEast,70\n");
  await flow.goToMapAndPrepare();
  await flow.wizard.locator('[data-field-id="filters"] [data-icon-control="editor.add-filter"]').click();
  await flow.wizard.getByRole("combobox", { name: "Filter column", exact: true }).selectOption("category");
  const values = flow.wizard.locator('[data-field-id="filters"] datalist option');
  await expect(values).toHaveCount(3);
  expect(await values.evaluateAll(nodes => nodes.map(n => n.value))).toEqual(["North", "South", "East"]);
  await flow.wizard.getByRole("combobox", { name: "Filter column", exact: true }).selectOption("value");
  await expect(values).toHaveCount(0);
  await flow.wizard.getByRole("combobox", { name: "Filter column", exact: true }).selectOption("category");
  await expect(values).toHaveCount(3);
  await flow.wizard.getByLabel("Value", { exact: true }).fill("North");
  await flow.uploadCsv({ name: "replacement.csv", mimeType: "text/csv", buffer: Buffer.from("category,value\nWest,70\nCentral,80\nWest,90\n") });
  await flow.goToMapAndPrepare();
  await expect(flow.wizard.getByLabel("Value", { exact: true })).toHaveValue("North");
  expect(await values.evaluateAll(nodes => nodes.map(n => n.value))).toEqual(["West", "Central"]);
});

test(`${ISSUE_CONTROLS}: palette reachability and gradients across bars`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1117, height: 766 });
  const flow = await issueBarFlow(page);
  await flow.goToConfigure();
  for (const fieldId of ["seriesColors", "seriesColorsByIdentity", "categoryColors"]) {
    const help = flow.wizard.locator(`[data-field-id="${fieldId}"] .chart-color-heading-help`).first();
    await help.hover();
    await expect(help.getByRole("tooltip")).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(help.getByRole("tooltip")).toBeHidden();
  }
  const paletteHelp = flow.wizard.locator('[data-field-id="seriesColors"] .chart-color-heading-help');
  await paletteHelp.locator('[tabindex="0"]').focus();
  await expect(paletteHelp.getByRole("tooltip")).toBeVisible();
  await flow.wizard.getByRole("heading", { name: "Add new chart", exact: true }).click();
  await flow.wizard.locator('[data-icon-control="editor.add-color"]').click();
  const toggle = flow.wizard.getByRole("button", { name: "Open Palette color 1 color options", exact: true });
  await toggle.click();
  const palette = flow.wizard.getByRole("dialog", { name: "Palette color 1 color options", exact: true });
  await palette.getByRole("tab", { name: "Gradients", exact: true }).click();
  const last = palette.getByRole("button").last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await last.click();
  await expect(flow.wizard.getByLabel("Palette color 1", { exact: true })).toHaveValue("#08224A");
  await expect(flow.wizard.getByRole("button", { name: "Close Palette color 1 color options", exact: true })).toHaveCSS("background-image", /linear-gradient/);
  await last.focus();
  await last.press("Escape");
  await expect(palette).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await flow.wizard.getByLabel("Series override: value", { exact: true }).fill("#FFFFFF");
  await flow.createChart("Bar gradient proof");
  const saved = await issueSavedChart(page, "Bar gradient proof");
  const colors = Object.values(saved.presentation.series.categoryOverrides).map(entry => entry.color);
  expect(colors).toHaveLength(6);
  expect(new Set(colors).size).toBe(6);
  expect(colors[0]).toBe("#08224A");
  expect(colors.at(-1)).toBe("#F1A1AD");
  const panel = page.locator(`[data-canonical-panel-id="${saved.id}"]`);
  await panel.scrollIntoViewIfNeeded();
  const rendered = await issueRenderedAxis(panel);
  expect(rendered.barColors).toEqual(colors);
  expect(rendered.legendColor.type).toBe("linear");
  expect(rendered.legendColor.colorStops.map(stop => stop.color)).toEqual(colors);
  await page.reload();
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await panel.scrollIntoViewIfNeeded();
  expect((await issueRenderedAxis(panel)).legendColor.colorStops.map(stop => stop.color)).toEqual(colors);
  const editor = await issueOpenEditor(page, saved.id);
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  await expect(editor.getByLabel("Bar color: A long category about hospital readiness", { exact: true })).toHaveValue("#08224A");
  await expect(editor.getByLabel("Bar color: A long category about coordination", { exact: true })).toHaveValue("#F1A1AD");
  const restoredSwatch = editor.getByRole("button", { name: "Open Palette color 1 color options", exact: true });
  await expect(restoredSwatch).toHaveCSS("background-image", /linear-gradient/);
  await editor.getByRole("button", { name: "Reset bar colors", exact: true }).click();
  await expect(restoredSwatch).toHaveCSS("background-image", "none");
});

async function issueBarFlow(page, csv = "category,value\nA long category about hospital readiness,20\nA long category about infection prevention,50\nA long category about clinical staffing,60\nA long category about medical supplies,70\nA long category about community response,80\nA long category about coordination,90\n") {
  await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  page.setDefaultTimeout(15_000);
  const flow = await openWizard(page);
  await flow.uploadCsv({ name: "issue-controls.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await flow.chooseChartType(null, /^Bar\./);
  await flow.goToMapAndPrepare();
  await flow.selectRole("measurements", "value");
  await flow.selectRole("observation", "category");
  return flow;
}

test(`${ISSUE_CONTROLS}: repeated series and bar color selection stays beside its control`, async ({ page }) => {
  test.setTimeout(90_000);
  const flow = await issueBarFlow(page);
  await flow.goToConfigure();
  for (const label of ["Series override: value", "Bar color: A long category about hospital readiness"]) {
    await flow.wizard.getByRole("button", { name: `Open ${label} color options`, exact: true }).click();
    const palette = flow.wizard.getByRole("dialog", { name: `${label} color options`, exact: true });
    await palette.getByRole("button", { name: `Use #F1A1AD for ${label}`, exact: true }).click();
    await expect(flow.wizard.getByLabel(label, { exact: true })).toHaveValue("#F1A1AD");
    await flow.wizard.getByRole("button", { name: `Close ${label} color options`, exact: true }).click();
    await flow.wizard.getByRole("button", { name: `Open ${label} color options`, exact: true }).click();
    const swatch = flow.wizard.getByRole("button", { name: `Close ${label} color options`, exact: true });
    const swatchBox = await swatch.boundingBox();
    const paletteBox = await palette.boundingBox();
    expect(paletteBox.y - (swatchBox.y + swatchBox.height)).toBeGreaterThanOrEqual(0);
    expect(paletteBox.y - (swatchBox.y + swatchBox.height)).toBeLessThan(24);
    await palette.getByRole("button", { name: `Use #36BDEB for ${label}`, exact: true }).click();
    await expect(flow.wizard.getByLabel(label, { exact: true })).toHaveValue("#36BDEB");
    await palette.getByRole("button", { name: `Use #043BCB for ${label}`, exact: true }).click();
    await expect(flow.wizard.getByLabel(label, { exact: true })).toHaveValue("#043BCB");
    await palette.getByRole("button", { name: `Use #043BCB for ${label}`, exact: true }).press("Escape");
    await expect(palette).toHaveCount(0);
    await expect(flow.wizard.getByRole("button", { name: `Open ${label} color options`, exact: true })).toBeFocused();
  }
});

async function issueSavedChart(page, title) {
  return page.evaluate(({ key, title }) => JSON.parse(localStorage.getItem(key)).pages.flatMap(p => p.sections).flatMap(s => s.panels).map(p => p.chart ?? p).find(c => c.title === title), { key: ISSUE_STORAGE, title });
}

async function issueOpenEditor(page, chartId) {
  const panel = page.locator(`[data-canonical-panel-id="${chartId}"]`);
  await panel.scrollIntoViewIfNeeded();
  await panel.hover();
  await choosePanelAction(page, await panel.getAttribute("data-canonical-placement-id"), "edit");
  await page.locator(".chart-quick-editor").getByRole("button", { name: "Open full editor", exact: true }).click();
  return page.getByRole("dialog", { name: "Edit chart", exact: true });
}

async function issueRenderedAxis(panel) {
  return panel.evaluate(async node => {
    const url = performance.getEntriesByType("resource").find(r => /\/deps\/echarts\.js\?/.test(r.name))?.name;
    if (!url) throw new Error("The rendered chart's ECharts module was not loaded.");
    const { getInstanceByDom } = await import(url);
    const instance = getInstanceByDom(node.querySelector(".chart-echarts-host"));
    const option = instance.getOption();
    return { minimum: option.yAxis[0].min, maximum: option.yAxis[0].max, wrap: option.xAxis[0].axisLabel.overflow, width: option.xAxis[0].axisLabel.width, clip: instance.getModel().getSeriesByIndex(0).get("clip"), barColors: option.series[0].data.map(item => item.itemStyle?.color), legendColor: option.legend[0].data?.[0]?.itemStyle?.color };
  });
}

test("chart-panel tooltips escape clipping and use selected-style paint", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();

  const control = page.locator('[data-panel-id="chart-line-mtgz6v76"]')
    .getByRole("button", { name: "View source CSV", exact: true });
  await control.hover();
  const tooltip = page.getByRole("tooltip", { name: "View source CSV" });
  await expect(tooltip).toBeVisible();
  const result = await tooltip.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const app = document.querySelector(".app-frame");
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--simex-surface-panel)";
    probe.style.color = "var(--simex-text-strong)";
    app.append(probe);
    const expected = getComputedStyle(probe);
    const expectedBackground = expected.backgroundColor;
    const expectedColor = expected.color;
    probe.remove();
    return {
      insidePanel: Boolean(node.closest(".chart-panel")),
      withinViewport: rect.left >= 8
        && rect.top >= 8
        && rect.right <= window.innerWidth - 8
        && rect.bottom <= window.innerHeight - 8,
      background: style.backgroundColor,
      color: style.color,
      expectedBackground,
      expectedColor,
    };
  });
  expect(result).toMatchObject({
    insidePanel: false,
    withinViewport: true,
    background: result.expectedBackground,
    color: result.expectedColor,
  });
  expect(result.background).not.toBe("rgb(8, 34, 74)");
});

test("fullscreen tooltips are hover-only and always clear on hover-away", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");

  const focus = page.getByRole("button", { name: "Focus chart", exact: true }).first();
  await focus.hover();
  await expect(page.getByRole("tooltip", { name: "Fullscreen", exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip", { name: "Fullscreen", exact: true })).toHaveCount(0);

  await focus.click();
  const fullscreen = page.getByRole("dialog", { name: "Focused chart" });
  const exit = fullscreen.getByRole("button", { name: "Exit fullscreen", exact: true });
  await expect(fullscreen).toBeVisible();
  await expect(page.getByRole("tooltip", { name: "Exit fullscreen", exact: true })).toHaveCount(0);
  await exit.hover();
  await expect(page.getByRole("tooltip", { name: "Exit fullscreen", exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip", { name: "Exit fullscreen", exact: true })).toHaveCount(0);

  await exit.click();
  await expect(fullscreen).toHaveCount(0);
  await focus.hover();
  await expect(page.getByRole("tooltip", { name: "Fullscreen", exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip", { name: "Fullscreen", exact: true })).toHaveCount(0);
});

test("New Chart keeps stable geometry and exposes editable destination placement", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const flow = await openWizard(page);
  const { wizard } = flow;

  await expect(wizard).toHaveAccessibleName("Add new chart");
  await expect(wizard.getByRole("heading", { name: "Add new chart", exact: true })).toHaveCount(1);
  await expect(wizard.locator(".chart-wizard-header .eyebrow")).toHaveCount(0);

  const stages = flow.stageButtons;
  await expect(stages).toHaveCount(5);
  const rows = await stages.evaluateAll((buttons) => (
    new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top))).size
  ));
  expect(rows).toBe(1);

  const initialHeight = await wizard.evaluate((node) => Math.round(node.getBoundingClientRect().height));
  expect(initialHeight).toBe(852);
  await flow.goToConfigure();
  await expect.poll(() => wizard.evaluate((node) => Math.round(node.getBoundingClientRect().height)))
    .toBe(initialHeight);
  await flow.goToDestination();

  await expect(flow.destinationMap.getByRole('navigation', { name: 'Destination map', exact: true })).toBeVisible();
  await expect(flow.destinationMap.locator('[role="treeitem"][aria-selected="true"]')).toHaveCount(1);
  await expect(wizard.getByRole("heading", { name: "Select data source", exact: true })).toBeVisible();
  await expect(wizard.getByRole("region", { name: "Footprint" })).toHaveCount(0);
  await expect(wizard.locator('[data-chart-proof-deck="persistent"]')).toBeHidden();
  const body = await wizard.locator('.chart-wizard-body').boundingBox();
  const destination = await wizard.getByRole('complementary', { name: 'Chart destination', exact: true }).boundingBox();
  expect(destination.x).toBeGreaterThan(body.x);
  expect(Math.abs(destination.width - body.width)).toBeLessThan(2);
  const anchor = flow.destinationMap.locator('[data-build-node-kind="chart"]').first();
  await anchor.click();
  await flow.destinationMap.getByRole('radio', { name: 'Before selected chart', exact: true }).check();
  await flow.setFootprint({ columns: 3, rows: 2 });
  const footprint = wizard.getByRole("region", { name: "Footprint" });
  await expect(footprint).toBeVisible();
  await expect(footprint.getByLabel("Width")).toHaveValue("3");
  await expect(footprint.getByLabel("Height step (12.5% of a row)")).toHaveValue("2");
  await expect(footprint.getByRole("img", {
    name: "Chart size: 3 columns by 16 steps",
  })).toBeVisible();
  await flow.goToDestination();
  await expect(flow.destinationMap.getByRole('radio', { name: 'Before selected chart', exact: true })).toBeChecked();
  await expect(flow.destinationMap.locator('[role="treeitem"][aria-selected="true"]')).toHaveAttribute('data-build-node-kind', 'chart');
  await expect(wizard.getByRole("region", { name: "Footprint" })).toHaveCount(0);
  await flow.goToConfigure();
  await expect(footprint.getByLabel("Width")).toHaveValue("3");
});

test("Data source composes source tasks vertically and contains their controls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const flow = await openWizard(page);
  const { wizard } = flow;
  await flow.goToDataSource();

  const grid = wizard.locator(".chart-wizard-data-source .chart-wizard-source-grid");
  const cards = grid.locator(":scope > .wizard-choice-card");
  await expect(cards).toHaveCount(2);

  const existingCard = cards.nth(0);
  const uploadCard = cards.nth(1);
  const listbox = existingCard.locator(".accessible-listbox-select");
  const trigger = existingCard.getByRole("combobox", { name: /^Managed data source\b/ });
  const uploadInput = uploadCard.getByLabel("CSV file", { exact: true });

  await expect(existingCard).toBeVisible();
  await expect(uploadCard).toBeVisible();
  await expect(existingCard.getByRole("heading", {
    name: "Use an existing CSV",
    exact: true,
  })).toBeVisible();
  await expect(uploadCard.getByRole("heading", {
    name: "Upload a new CSV",
    exact: true,
  })).toBeVisible();
  await expect(trigger).toBeVisible();
  await expect(uploadInput).toBeVisible();

  const geometry = await grid.evaluate((node) => {
    const [existing, upload] = node.querySelectorAll(":scope > .wizard-choice-card");
    const select = existing.querySelector(".accessible-listbox-select");
    const button = select.querySelector(".accessible-listbox-trigger");
    const file = upload.querySelector('input[type="file"]');
    const rect = (element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        width: bounds.width,
      };
    };
    return {
      existing: rect(existing),
      upload: rect(upload),
      select: rect(select),
      trigger: rect(button),
      file: rect(file),
    };
  });

  expect(Math.abs(geometry.existing.left - geometry.upload.left)).toBeLessThanOrEqual(1);
  expect(geometry.existing.bottom).toBeLessThanOrEqual(geometry.upload.top + 0.5);
  expect(geometry.select.left).toBeGreaterThanOrEqual(geometry.existing.left - 0.5);
  expect(geometry.select.right).toBeLessThanOrEqual(geometry.existing.right + 0.5);
  expect(geometry.trigger.left).toBeGreaterThanOrEqual(geometry.existing.left - 0.5);
  expect(geometry.trigger.right).toBeLessThanOrEqual(geometry.existing.right + 0.5);
  expect(geometry.trigger.bottom).toBeLessThanOrEqual(geometry.upload.top + 0.5);
  expect(geometry.trigger.bottom).toBeLessThanOrEqual(geometry.file.top + 0.5);
});

test("durable operation notices wait behind the chart wizard instead of covering its footer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const flow = await openWizard(page);
  const { wizard } = flow;
  await flow.goToDataSource();
  const notice = page.locator('[data-operation-status]').filter({ hasText: "Chart draft" });

  await expect(notice).toHaveCount(1);
  await expect(wizard.locator(".chart-wizard-footer")).toBeVisible();
  await expect.poll(() => notice.evaluate((node) => (
    getComputedStyle(node.closest(".operation-status-viewport")).visibility
  ))).toBe("hidden");
});

test("Data source existing CSV actions, blank measurement, and Review repairs are concise and explicit", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const flow = await openWizard(page);
  const { wizard } = flow;
  await flow.selectExistingSource("cases WCPH eldoria");
  await flow.chooseChartType(null, /^Line\./);
  await flow.goToDataSource();

  const viewSource = wizard.getByRole("button", { name: "View source CSV", exact: true });
  const resetSource = wizard.getByRole("button", { name: "Reset selection", exact: true });
  await expect(resetSource).toHaveAttribute("data-icon-tooltip", "Reset selection");
  const actionRows = await viewSource.evaluate((left, rightSelector) => {
    const right = document.querySelector(rightSelector);
    return Math.abs(left.getBoundingClientRect().top - right.getBoundingClientRect().top);
  }, '[aria-label="Reset selection"]');
  expect(actionRows).toBeLessThanOrEqual(4);

  await resetSource.click();
  const confirmation = page.getByRole("dialog", { name: "Reset data source selection?" });
  await expect(confirmation).toContainText("does not delete the CSV from the dashboard");
  await confirmation.getByRole("button", { name: "Keep selection", exact: true }).click();

  await flow.goToReview();
  await expect(wizard.getByRole("heading", { name: "Review and create", exact: true })).toHaveCount(0);
  const summary = wizard.getByRole("alert", { name: "Chart creation issues" });
  await expect(summary).toBeVisible();
  const repair = summary.getByRole("button", { name: "Map and prepare data", exact: true });
  await expect(repair).toHaveCSS("text-decoration-line", "underline");
  await repair.click();
  await expect(flow.stageButton("mapAndPrepare"))
    .toHaveAttribute("aria-current", "step");
  const measurementRows = wizard.locator(
    '[data-field-id="measurements"] .chart-authoring-role-row',
  );
  await expect(measurementRows).toHaveCount(1);
  await expect(measurementRows.getByRole("combobox", { name: "Column", exact: true }))
    .toHaveValue("");
});

async function openWizard(page) {
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  return openChartAuthoring(page);
}
