import { expect, test } from "@playwright/test";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";
import { openChartAuthoring } from "./support/chart-authoring-workflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByRole("button", { name: "Build" }).click();
});

test("a fresh chronological choropleth reaches preview through the early GeoJSON selector", async ({
  page,
}) => {
  const flow = await openChartAuthoring(page);
  const { wizard } = flow;

  await flow.selectExistingSource(
    "Generated map timeline derived from the authoritative harmonized municipal biomedical dataset",
  );
  await flow.chooseChartType(
    "chronological choropleth",
    /Chronological choropleth/i,
  );
  await flow.goToDataSource();
  await wizard.getByLabel("GeoJSON source").selectOption(
    "geo_netherlands_municipalities_2021",
  );

  await flow.goToMapAndPrepare();
  await flow.selectRole("geography", "MunicipalityCode");
  await flow.selectRole("value", "infectionsPer10000");
  await flow.selectRole("time", "Datum");

  await expect(
    wizard.locator('[data-field-id="geoSource"]'),
  ).toHaveCount(1);
  await flow.goToConfigure();
  await expect(
    wizard.locator(".chart-authoring-preview-ready"),
  ).toBeVisible();
  await wizard.getByRole("textbox", { name: "Chart title", exact: true }).fill("Fresh municipal map");
  await expect(
    wizard.getByRole("region", { name: "Map", exact: true }),
  ).toBeVisible();
  await expect(
    wizard.locator('[data-field-id="geoSource"]'),
  ).toHaveCount(0);
  await flow.goToReview();
  await expect(
    wizard.getByRole("button", { name: "Create chart" }),
  ).toBeEnabled();
});
