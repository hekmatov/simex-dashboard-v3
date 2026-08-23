import { expect, test } from "@playwright/test";

test("chart-panel tooltips escape clipping and use selected-style paint", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
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

test("New Chart keeps stable geometry and exposes editable destination placement", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const wizard = await openWizard(page);

  await expect(wizard).toHaveAccessibleName("Add new chart");
  await expect(wizard.getByRole("heading", { name: "Add new chart", exact: true })).toHaveCount(1);
  await expect(wizard.locator(".chart-wizard-header .eyebrow")).toHaveCount(0);

  const stages = wizard.getByRole("navigation", { name: "Chart creation steps" }).getByRole("button");
  await expect(stages).toHaveCount(6);
  const rows = await stages.evaluateAll((buttons) => (
    new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top))).size
  ));
  expect(rows).toBe(1);

  const initialHeight = await wizard.evaluate((node) => Math.round(node.getBoundingClientRect().height));
  expect(initialHeight).toBe(852);
  await stages.nth(4).click();
  await expect.poll(() => wizard.evaluate((node) => Math.round(node.getBoundingClientRect().height)))
    .toBe(initialHeight);
  await stages.nth(0).click();

  await expect(wizard.getByLabel("Destination page")).toBeEnabled();
  await expect(wizard.getByLabel("Destination section")).toBeEnabled();
  await expect(wizard.getByLabel("Insertion")).toBeEnabled();
  await expect(wizard.getByRole("grid", { name: /Chart size:/ })).toBeVisible();
  await wizard.getByRole("gridcell", { name: "Set chart size to 3 columns by 2 rows" }).click();
  await expect(wizard.getByRole("gridcell", { name: "Set chart size to 3 columns by 2 rows" }))
    .toHaveAttribute("aria-pressed", "true");
  await wizard.getByLabel("Insertion").selectOption("before");
  await expect(wizard.getByLabel("Placement anchor")).toBeEnabled();
  await expect(wizard.locator(".chart-wizard-destination .chart-proof-state")).toHaveCount(0);
});

test("Data Source actions and Review repairs are concise and explicit", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const wizard = await openWizard(page);
  await wizard.getByRole("button", { name: /^Chart type\./ }).click();
  await wizard.getByRole("button", { name: /^Line\./ }).click();
  await wizard.getByLabel("Dashboard data source").selectOption("bio_cases");

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

  await wizard.getByRole("button", { name: /^Review and create\./ }).click();
  await expect(wizard.getByRole("heading", { name: "Review and create", exact: true })).toHaveCount(0);
  const summary = wizard.getByRole("alert", { name: "Chart creation issues" });
  await expect(summary).toBeVisible();
  const repair = summary.getByRole("button", { name: "Map and prepare data", exact: true });
  await expect(repair).toHaveCSS("text-decoration-line", "underline");
  await repair.click();
  await expect(wizard.getByRole("button", { name: /^Map and prepare data\./ }))
    .toHaveAttribute("aria-current", "step");
});

async function openWizard(page) {
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  const wizard = page.getByRole("dialog");
  await expect(wizard).toBeVisible();
  return wizard;
}
