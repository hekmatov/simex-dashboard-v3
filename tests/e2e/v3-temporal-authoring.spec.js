import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Chrono Studio and Scene Studio navigate through content before editing and persist end to end", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Build panel", exact: true }).click();

  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  let auxiliary = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await expect(auxiliary).toBeVisible();
  await auxiliary.getByRole("button", { name: /National outbreak and health-system playback/ }).click();
  await expect(auxiliary.getByRole("heading", { name: "National outbreak and health-system playback" })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Edit", exact: true }).click();
  const stages = auxiliary.getByRole("navigation", { name: "Chrono Group stages" });
  await expect(stages.getByRole("button")).toHaveText([
    "Name and period",
    "Choose charts",
    "Set defaults",
    "Review",
  ]);
  const groupName = auxiliary.getByLabel("Chrono Group name");
  await groupName.fill("E2E national playback");
  await auxiliary.getByRole("button", { name: "Save Chrono Group" }).click();
  await expect(auxiliary.getByRole("heading", { name: "E2E national playback" })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Scene Studio", exact: true }).click();
  auxiliary = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await auxiliary.getByRole("button", { name: "Create Scene", exact: true }).click();
  const sceneName = auxiliary.getByLabel("Scene name");
  await sceneName.fill("E2E response scene");
  await auxiliary.getByRole("button", { name: "Save Scene" }).click();
  await expect(auxiliary.getByRole("heading", { name: "E2E response scene" })).toBeVisible();

  await expect.poll(() => page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return {
      group: dashboard.chronoGroups.some(({ name }) => name === "E2E national playback"),
      scene: dashboard.scenes.some(({ name }) => name === "E2E response scene"),
    };
  }, STORAGE_KEY)).toEqual({ group: true, scene: true });
});
