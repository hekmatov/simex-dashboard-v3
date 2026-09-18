import { expect } from "@playwright/test";
import { chartAuthoringWorkflow } from "./chart-authoring-workflow.js";

import { enterAuthoredDashboard } from "./landingWorkflow.js";

const BUILD_MODE = "Build";

export async function enterBuildMode(page) {
  await enterAuthoredDashboard(page);
  const build = page.getByLabel("Dashboard mode").getByRole("button", {
    name: BUILD_MODE,
    exact: true,
  });
  if (await build.getAttribute("aria-pressed") !== "true") await build.click();
  await page.locator("[data-canonical-mode='build']").waitFor({ state: "visible" });
}



export async function openSourceContent(page) {
  await enterBuildMode(page);
  await page.locator('[data-build-command-action="source-content"]').click();
  const workspace = page.getByRole("complementary", { name: "Source content authoring" });
  await workspace.waitFor({ state: "visible" });
  return workspace;
}

export function structureRail(page) {
  return page.locator('[data-build-rail="structure"]');
}

export function propertiesPane(page) {
  return page.locator('[data-build-rail="properties"]');
}

export async function authorAttentionStrip(page, { pageId = "biomedical", sectionTitle = "At a glance", chartTitle = "Cases today" } = {}) {
  await enterBuildMode(page);
  await structureRail(page).locator(`[data-build-node-id="${pageId}"] > .build-tree-row`).click();
  await page.getByRole("button", { name: "Add section" }).click();
  await page.getByLabel("Section name").fill(sectionTitle);
  await page.getByRole("button", { name: "Create section" }).click();
  const section = page.locator("[data-canonical-section-id]", { has: page.getByRole("button", { name: `Edit Section title: ${sectionTitle}`, exact: true }) });
  await expect(section).toBeVisible();
  const sectionId = await section.getAttribute("data-canonical-section-id");
  await page.getByRole("button", { name: "Save Layout Changes" }).click();

  await section.getByRole("button", { name: "Add chart" }).click();
  const wizard = chartAuthoringWorkflow(page.getByRole("dialog", { name: "Add new chart" }));
  await expect(wizard.wizard).toBeVisible();
  await wizard.selectExistingSource("cases WCPH eldoria");
  await wizard.chooseChartType("KPI", "KPI card");
  await wizard.goToMapAndPrepare();
  await wizard.selectRole("value", "national_total_cases");
  await wizard.selectRole("time", "Date");
  await wizard.goToConfigure();
  try {
    await wizard.createChart(chartTitle);
  } catch (error) {
    error.message += `\nChart creation review:\n${await wizard.wizard.innerText()}`;
    throw error;
  }

  await structureRail(page).locator(`[data-build-node-id="${sectionId}"] > .build-tree-row`).click();
  await propertiesPane(page).getByLabel("Role").selectOption("attention");
  await page.getByRole("button", { name: "Save Layout Changes" }).click();
  await expect(page.locator(`.dashboard-attention-strip[data-canonical-section-id="${sectionId}"]`)).toBeVisible();
  return sectionId;
}
