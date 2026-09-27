import { expect } from "@playwright/test";

const STAGE_IDS = Object.freeze({
  destination: "destination",
  dataSource: "data-source",
  chartType: "chart-type",
  mapAndPrepare: "map-and-prepare-data",
  configure: "configure-chart",
  review: "review-and-create",
});

export async function openFreshChartAuthoring(page) {
  await page.locator('[data-build-command-action="add-chart"]').click();
  const wizard = page.getByRole("dialog", { name: "Add new chart" });
  await expect(wizard).toBeVisible();
  await expect(wizard.locator('[data-chart-wizard-stage="destination"]')).toBeVisible();
  return chartAuthoringWorkflow(wizard);
}

// Preserve the existing fresh-entry API for consumers that do not need a resumed draft.
export const openChartAuthoring = openFreshChartAuthoring;

export async function resumeChartAuthoring(page) {
  const owner = page.getByRole("navigation", { name: "Pending Build work" })
    .locator('[data-pending-work-kind="chart-create"]');
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute("data-pending-work-activity", "suspended");
  await owner.getByRole("button", { name: /^Resume / }).click();
  const wizard = page.getByRole("dialog", { name: "Add new chart" });
  await expect(wizard).toBeVisible();
  return chartAuthoringWorkflow(wizard);
}

export function chartAuthoringWorkflow(wizard) {
  const navigation = wizard.getByRole("navigation", {
    name: "Chart creation steps",
  });
  const stageButton = (stage) => navigation.locator(`[id="chart-stage-${stageId(stage)}"]`);
  const goToStage = async (stage) => {
    const id = stageId(stage);
    const button = stageButton(stage);
    await button.click();
    await expect(button).toHaveAttribute("aria-current", "step");
    await expect(wizard.locator("[data-chart-wizard-stage]")).toHaveAttribute("data-chart-wizard-stage", id);
    return wizard;
  };
  const step = async (direction, stage) => {
    const id = stageId(stage);
    await wizard.locator(`[data-icon-control="collection.${direction}-page"]`).click();
    await expect(wizard.locator("[data-chart-wizard-stage]")).toHaveAttribute("data-chart-wizard-stage", id);
    await expect(stageButton(id)).toHaveAttribute("aria-current", "step");
    return wizard;
  };

  return Object.freeze({
    wizard,
    stageButtons: navigation.getByRole("button"),
    stageButton,
    goToStage,
    nextStage: (stage) => step("next", stage),
    previousStage: (stage) => step("previous", stage),
    async suspend() {
      await wizard.locator('[data-icon-control="wizard.close-wizard"]').click();
      await expect(wizard).toHaveCount(0);
    },
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
      await goToStage("configure");
      await wizard.getByRole("textbox", { name: "Chart title", exact: true }).fill(title);
      await goToStage("review");
      const create = wizard.locator('[data-icon-control="wizard.create-chart"]');
      await expect(create).toBeEnabled();
      await create.click();
      await expect(wizard).toHaveCount(0);
    },
  });
}

function stageId(stage) {
  const id = STAGE_IDS[stage] ?? (Object.values(STAGE_IDS).includes(stage) ? stage : null);
  if (!id) throw new TypeError(`Unknown chart-authoring stage "${stage}".`);
  return id;
}
