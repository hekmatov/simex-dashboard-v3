import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Time Content, Time Group Studio, and Scene Studio author and persist end to end", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Build panel", exact: true }).click();

  await page.getByRole("button", { name: "Time Content", exact: true }).click();
  let auxiliary = page.getByRole("dialog", { name: "Time Content authoring" });
  await expect(auxiliary).toBeVisible();
  await expect(auxiliary).toContainText("National outbreak and health-system playback");
  const nationalGroup = auxiliary.locator("article")
    .filter({ hasText: "National outbreak and health-system playback" });
  await nationalGroup.getByRole("button", { name: "Edit", exact: true }).click();
  auxiliary = page.getByRole("dialog", { name: "Time Group authoring" });
  const stages = auxiliary.getByRole("navigation", { name: "Time Group stages" });
  await expect(stages.getByRole("button")).toHaveText([
    "Choose period",
    "Choose charts",
    "Set defaults",
    "Name and review",
  ]);
  await stages.getByRole("button", { name: "Name and review" }).click();
  const groupName = auxiliary.getByLabel("Time Group name");
  await groupName.fill("E2E national playback");
  await auxiliary.getByRole("button", { name: "Save Time Group" }).click();
  await expect(auxiliary.getByText("Time Group saved", { exact: true })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Scene Studio", exact: true }).click();
  auxiliary = page.getByRole("dialog", { name: "Scene authoring" });
  await auxiliary.getByRole("button", { name: /Arrange and configure/ }).click();
  const sceneName = auxiliary.getByLabel("Scene name");
  await sceneName.fill("E2E response scene");
  await auxiliary.getByRole("button", { name: "Save Scene" }).click();
  await expect(auxiliary.getByText("Scene saved", { exact: true })).toBeVisible();

  await expect.poll(() => page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return {
      group: dashboard.timeSyncGroups.some(({ name }) => name === "E2E national playback"),
      scene: dashboard.scenes.some(({ name }) => name === "E2E response scene"),
    };
  }, STORAGE_KEY)).toEqual({ group: true, scene: true });
});
