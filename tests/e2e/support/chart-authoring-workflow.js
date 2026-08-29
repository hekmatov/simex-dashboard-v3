import { expect } from "@playwright/test";

const STAGE_NAMES = Object.freeze({
  destination: /^Destination\./,
  dataSource: /^Data source\./,
  chartType: /^Chart type\./,
  mapAndPrepare: /^Map and prepare\./,
  configure: /^Configure\./,
  review: /^Review\./,
});

export async function openChartAuthoring(page) {
  await page.getByRole("button", { name: "Add chart", exact: true })
    .first()
    .click();
  const wizard = page.getByRole("dialog", { name: "Add new chart" });
  await expect(wizard).toBeVisible();
  return chartAuthoringWorkflow(wizard);
}

export function chartAuthoringWorkflow(wizard) {
  const navigation = wizard.getByRole("navigation", {
    name: "Chart creation steps",
  });
  const stageButton = (stage) => navigation.getByRole("button", {
    name: stageName(stage),
  });
  const goToStage = async (stage) => {
    const button = stageButton(stage);
    await button.click();
    await expect(button).toHaveAttribute("aria-current", "step");
    return wizard;
  };

  return Object.freeze({
    wizard,
    stageButtons: navigation.getByRole("button"),
    stageButton,
    goToDestination: () => goToStage("destination"),
    goToDataSource: () => goToStage("dataSource"),
    goToChartType: () => goToStage("chartType"),
    goToMapAndPrepare: () => goToStage("mapAndPrepare"),
    goToConfigure: () => goToStage("configure"),
    goToReview: () => goToStage("review"),
    async selectExistingSource(sourceLabel) {
      await goToStage("dataSource");
      const trigger = wizard.getByRole("combobox", {
        name: /^Managed data source\b/,
      });
      await trigger.click();
      const option = wizard.getByRole("option", {
        name: sourceLabel,
        exact: true,
      });
      await expect(option).toBeVisible();
      await option.click();
      await expect(trigger).toContainText(sourceLabel);
    },
    async uploadCsv(files) {
      await goToStage("dataSource");
      await wizard.getByLabel("CSV file").setInputFiles(files);
    },
    async chooseChartType(query, accessibleName) {
      await goToStage("chartType");
      if (query) await wizard.getByLabel("Search chart types").fill(query);
      await wizard.getByRole("button", { name: accessibleName }).click();
    },
    async selectRole(roleId, column, { index = 0 } = {}) {
      await wizard.locator(`[data-field-id="${roleId}"] select`)
        .nth(index)
        .selectOption(column);
    },
    async createChart(title) {
      await wizard.getByLabel("Chart title").fill(title);
      await goToStage("review");
      const create = wizard.getByRole("button", { name: "Create chart" });
      await expect(create).toBeEnabled();
      await create.click();
      await expect(wizard).toHaveCount(0);
    },
  });
}

function stageName(stage) {
  const name = STAGE_NAMES[stage];
  if (!name) throw new TypeError(`Unknown chart-authoring stage "${stage}".`);
  return name;
}
