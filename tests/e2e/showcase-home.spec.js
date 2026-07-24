import { test, expect } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-v2-config-pages-v2";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("standalone Home orients visitors and routes into both domains", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Standalone", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "From complex exercise data to shared situational awareness",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Explore the live dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "HeV-A26 Dashboard: Epidemiological overview" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Explore Socio-economic" }).click();
  await expect(
    page.getByRole("heading", { name: "HeV-A26 Dashboard: Socio-economic Overview" }),
  ).toBeVisible();
});

test("saved beta configuration receives the new Home presentation", async ({ page, request }) => {
  const response = await request.get("http://127.0.0.1:4173/config/dashboard.json");
  const savedBeta = await response.json();
  delete savedBeta.pages[0].pageType;
  delete savedBeta.pages[0].landing;

  await page.addInitScript(({ key, config }) => {
    localStorage.setItem(key, JSON.stringify(config));
  }, { key: STORAGE_KEY, config: savedBeta });
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "From complex exercise data to shared situational awareness",
    }),
  ).toBeVisible();
  const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  expect(persisted.pages[0].pageType).toBe("landing");
  expect(persisted.pages[0].landing.hero.primaryAction.pageId).toBe("biomedical");
});
