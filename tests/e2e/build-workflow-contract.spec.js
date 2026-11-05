import { expect, test } from "@playwright/test";

import {
  structureRail,
  propertiesPane,
  openSourceContent,
} from "./support/buildWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("the shared Build workflow exposes persistent Structure and on-demand quick editors", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", {
    name: "Build",
    exact: true,
  }).click();

  const map = await structureRail(page);
  await expect(map.getByRole("navigation", { name: "Dashboard structure" })).toBeVisible();

  await expect(page.locator('[data-build-rail="properties"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  await expect(propertiesPane(page)).toBeVisible();
});

test("the shared Build workflow enters Build before opening source management", async ({ page }) => {
  await page.goto("/");

  const workspace = await openSourceContent(page);
  await expect(page.locator("[data-canonical-mode='build']")).toBeVisible();
  await expect(workspace.getByRole("tab", { name: "Data sources", exact: true })).toBeVisible();
});
