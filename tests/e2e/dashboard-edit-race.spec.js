import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3";

test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
  await page.goto("/");
  await page.getByRole("button", {
    name: "Explore the live dashboard",
  }).click();
  await expect(page.getByRole("button", {
    name: "Open edit mode",
  })).toBeVisible();
});

test("a pending header edit and immediate chart save commit in order", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open edit mode" }).click();
  await page.getByLabel("Program label").fill("Race-safe exercise");
  await page.getByRole("button", { name: "Edit chart" }).first().click();
  await page.getByRole("button", {
    name: "Appearance",
    exact: true,
  }).click();
  await page.getByLabel("Chart title").fill("Race-safe chart title");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();

  await expect.poll(() => page.evaluate((key) => {
    const config = JSON.parse(localStorage.getItem(key));
    const charts = config.pages.flatMap(({ sections }) => (
      sections.flatMap(({ panels }) => panels)
    ));
    return {
      programLabel: config.programLabel,
      chartSaved: charts.some(({ title }) => (
        title === "Race-safe chart title"
      )),
    };
  }, STORAGE_KEY)).toEqual({
    programLabel: "Race-safe exercise",
    chartSaved: true,
  });
});

test("reset cancels a pending header callback so it cannot reappear", async ({
  page,
}) => {
  const baseline = await page.locator(".dashboard-brand-block .eyebrow")
    .textContent();
  await page.getByRole("button", { name: "Open edit mode" }).click();
  await page.getByLabel("Program label").fill("Must never reappear");
  await page.getByRole("button", { name: "Reset edits" }).click();
  await page.getByRole("dialog", { name: "Discard these edits?" })
    .getByRole("button", { name: "Reset edits" })
    .click();
  await page.waitForTimeout(800);

  await expect(page.locator(".dashboard-brand-block .eyebrow")).toHaveText(
    baseline.trim(),
  );
  await expect.poll(() => page.evaluate((key) => (
    JSON.parse(localStorage.getItem(key)).programLabel
  ), STORAGE_KEY)).toBe(baseline.trim());
});
