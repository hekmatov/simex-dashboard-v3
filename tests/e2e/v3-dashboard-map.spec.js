import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Build commands stay available while Dashboard map controls only structure context", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();

  const commands = page.getByRole("region", { name: "Build commands" });
  const mapToggle = page.getByRole("button", { name: "Dashboard map", exact: true });
  await expect(commands).toBeVisible();
  await expect(page.getByRole("button", { name: "Chrono Groups", exact: true })).toHaveCount(0);
  await expect(mapToggle).toHaveAttribute("aria-controls", "dashboard-map-panel");

  await mapToggle.click();
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await expect(map).toBeVisible();
  await expect(commands).toBeVisible();
  await expect(map.getByRole("navigation", { name: "Dashboard structure" })).toBeVisible();

  await map.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(map.getByRole("region", { name: "Context inspector" })).toBeVisible();
  await expect(map.getByRole("navigation", { name: "Dashboard structure" })).toHaveCount(0);

  await mapToggle.click();
  await expect(map).toBeHidden();
  await expect(commands).toBeVisible();
});
