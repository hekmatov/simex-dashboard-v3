import { expect, test } from "@playwright/test";
import { openChartAuthoring } from "./support/chart-authoring-workflow.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

test("chart-panel tooltips escape clipping and use selected-style paint", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();

  const control = page.getByRole("button", { name: "Start section here", exact: true }).first();
  await control.hover();
  const tooltip = page.getByRole("tooltip", { name: "Start section here" });
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
  await expect(stages).toHaveCount(6);
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

  await expect(wizard.getByLabel("Destination page")).toBeEnabled();
  await expect(wizard.getByLabel("Destination section")).toBeEnabled();
  await expect(wizard.getByLabel("Insertion")).toBeEnabled();
  const footprint = wizard.getByRole("region", { name: "Footprint" });
  await expect(footprint).toBeVisible();
  await footprint.getByLabel("Width").selectOption("3");
  await footprint.getByLabel("Height step (12.5% of a row)").selectOption({ value: "2" });
  await expect(footprint.getByLabel("Width")).toHaveValue("3");
  await expect(footprint.getByLabel("Height step (12.5% of a row)")).toHaveValue("2");
  await expect(footprint.getByRole("img", {
    name: "Chart size: 3 columns by 16 steps",
  })).toBeVisible();
  await wizard.getByLabel("Insertion").selectOption("before");
  await expect(wizard.getByLabel("Placement anchor")).toBeEnabled();
  await expect(wizard.locator(".chart-wizard-destination .chart-proof-state")).toHaveCount(0);
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
  await flow.selectExistingSource("Biomedical cases");
  await flow.chooseChartType(null, /^Line\./);
  await flow.goToDataSource();

  const viewSource = wizard.getByRole("button", { name: "View source CSV", exact: true });
  const resetSource = wizard.getByRole("button", { name: "Reset selection", exact: true });
  await expect(resetSource).toHaveAttribute("data-icon-tooltip", "Reset selection");
  const actionRows = await viewSource.evaluate((left, rightSelector) => {
    const right = document.querySelector(rightSelector);
    return Math.abs(left.getBoundingClientRect().top - right.getBoundingClientRect().top);
  }, '[aria-label="Reset selection"]');
  expect(actionRows).toBeLessThanOrEqual(2);

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
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  return openChartAuthoring(page);
}
