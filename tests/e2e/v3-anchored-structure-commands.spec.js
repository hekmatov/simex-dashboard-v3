import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the live dashboard" }).click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-dashboard-mode="build"]')).toBeVisible();
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await expect(navigation).toBeVisible();
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();
});

test("anchored Page and Section commands preview and discard through the live layout draft", async ({ page }) => {
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await navigation.getByRole("button", { name: "Page actions for Biomedical", exact: true }).click();
  await expect(navigation.getByRole("group", { name: "Biomedical Page actions", exact: true })).toBeVisible();
  await navigation.getByRole("button", { name: "Edit Page Biomedical" }).click();
  const orbit = page.getByLabel("Page Orbit for Biomedical");
  await expect(orbit.getByRole("button")).toHaveText(["Rename Page", "Merge Page", "Remove Page", "Close"]);
  await orbit.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Move Outbreak dynamics to Page" }).click();
  const move = page.getByRole("dialog", { name: "move Outbreak dynamics" });
  await expect(move.getByLabel("Destination Page")).toHaveValue("socio_economic");
  await expect(move.getByLabel("Placement")).toHaveValue("first");
  await expect(move.getByRole("region", { name: "Named consequences" })).toContainText("Confirmed cases");
  await expect(move.getByRole("region", { name: "Named consequences" })).toContainText("Municipal outbreak playback");
  await move.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("button", { name: "Edit Section title: Outbreak dynamics" })).toHaveCount(0);
  await navigation.getByRole("button", { name: "Socio-economic", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit Section title: Outbreak dynamics" })).toBeVisible();

  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await expect(page.getByLabel("Build draft status")).toContainText("Layout changesdirty");
  await page.getByRole("button", { name: "Discard Layout Changes" }).click();
  await expect(page.getByRole("button", { name: "Edit Section title: Outbreak dynamics" })).toHaveCount(0);
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit Section title: Outbreak dynamics" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
