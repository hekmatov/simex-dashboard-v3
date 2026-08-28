import { expect, test } from "@playwright/test";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

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
  await page.getByRole("button", { name: "Add chart" }).first().click();
  const wizard = page.getByRole("dialog");

  await wizard.getByRole("button", { name: /^Chart type\./ }).click();
  await wizard.getByLabel("Search chart types").fill(
    "chronological choropleth",
  );
  await wizard.getByRole("button", {
    name: /Chronological choropleth/i,
  }).click();
  await wizard.getByRole("button", { name: /^Data source\./ }).click();
  await wizard.getByLabel("Managed data source").selectOption(
    "bio_municipal_map_timeline",
  );
  await wizard.getByLabel("GeoJSON source").selectOption(
    "geo_netherlands_municipalities_2021",
  );

  await wizard.getByRole("button", { name: /^Map and prepare data\./ }).click();
  await wizard.locator('[data-field-id="geography"] select').selectOption(
    "MunicipalityCode",
  );
  await wizard.locator('[data-field-id="value"] select').selectOption(
    "infectionsPer10000",
  );
  await wizard.locator('[data-field-id="time"] select').selectOption("Datum");

  await expect(
    wizard.locator('[data-field-id="geoSource"]'),
  ).toHaveCount(1);
  await wizard.getByRole("button", { name: /^Configure chart\./ }).click();
  await expect(
    wizard.locator(".chart-authoring-preview-ready"),
  ).toBeVisible();
  await wizard.getByLabel("Chart title").fill("Fresh municipal map");
  await expect(
    wizard.getByRole("region", { name: "Map", exact: true }),
  ).toBeVisible();
  await expect(
    wizard.locator('[data-field-id="geoSource"]'),
  ).toHaveCount(0);
  await wizard.getByRole("button", { name: /^Review and create\./ }).click();
  await expect(
    wizard.getByRole("button", { name: "Create chart" }),
  ).toBeEnabled();
});
