import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";
import {
  OTHER_BIOMEDICAL_CHART_ID,
  REMOVED_PAGE_GROUP_ID,
  RETAINED_PAGE_GROUP_ID,
  withPageRemovalGroups,
} from "./support/layoutReviewFixture.js";
import { SHIPPED_CASE_CHART_ID } from "./support/importedProfileFixture.js";

const APP_URL = "http://127.0.0.1:4173";
const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Chrono Studio and Scene Studio navigate through content before editing and persist end to end", async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  await installTemporalFixture(page, request);
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();

  await openChronoStudio(page);
  let auxiliary = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await expect(auxiliary).toBeVisible();
  await expect(auxiliary.getByLabel("Page")).toHaveValue("");
  await auxiliary.getByRole("button", { name: /Biomedical page group/ }).click();
  await expect(auxiliary.getByRole("heading", { name: "Biomedical page group" })).toBeVisible();
  await expect(auxiliary.locator(".chrono-group-content")).toContainText("National Confirmed Cases");
  const contentActionGroups = auxiliary.locator("[data-content-action-group]");
  await expect(contentActionGroups).toHaveCount(3);
  const contentActionGeometry = await contentActionGroups.evaluateAll((groups) => groups.map((group) => {
    const rect = group.getBoundingClientRect();
    return { name: group.dataset.contentActionGroup, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
  const primaryActions = contentActionGeometry.find(({ name }) => name === "primary");
  const managementActions = contentActionGeometry.find(({ name }) => name === "management");
  expect(primaryActions.right).toBeLessThanOrEqual(managementActions.left);
  const primaryCenter = (primaryActions.top + primaryActions.bottom) / 2;
  const managementCenter = (managementActions.top + managementActions.bottom) / 2;
  expect(Math.abs(primaryCenter - managementCenter)).toBeLessThanOrEqual(1);
  const contentActionsBox = await auxiliary.locator(".temporal-content-page__actions").evaluate((actions) => {
    const rect = actions.getBoundingClientRect();
    return { height: rect.height };
  });
  expect(contentActionsBox.height).toBeLessThanOrEqual(70);
  const contentActionButtons = await auxiliary.locator("[data-content-action-group] button").evaluateAll((buttons) => (
    buttons.map((button) => ({
      height: button.getBoundingClientRect().height,
      label: button.textContent?.trim() ?? "",
    }))
  ));
  const ordinaryActions = contentActionButtons.filter(({ label }) => label !== "Remove");
  const removeAction = contentActionButtons.find(({ label }) => label === "Remove");
  expect(ordinaryActions.length).toBeGreaterThan(0);
  for (const { height, label } of ordinaryActions) {
    expect(height, `${label} should use the 32px dense standard control role`).toBe(32);
  }
  expect(removeAction?.height, "Remove should use the 36px prominent destructive role").toBe(36);
  await auxiliary.getByRole("button", { name: "Edit", exact: true }).click();
  const stages = auxiliary.getByRole("navigation", { name: "Chrono Group stages" });
  const expectedStageLabels = ["Name and period", "Choose charts", "Set defaults", "Review"];
  await expect(stages.getByRole("button")).toHaveCount(expectedStageLabels.length);
  for (const [index, label] of expectedStageLabels.entries()) {
    await expect(stages.getByRole("button").nth(index)).toContainText(label);
  }
  const groupName = auxiliary.getByLabel("Chrono Group name");
  await groupName.fill("E2E national playback");
  await stages.getByRole("button", { name: /Review/ }).click();
  await auxiliary.getByRole("button", { name: "Save Chrono Group" }).click();
  await expect(auxiliary.getByRole("heading", { name: "E2E national playback" })).toBeVisible();
  await expect.poll(() => storedTemporalState(page)).toMatchObject({
    groups: [
      { id: REMOVED_PAGE_GROUP_ID, name: "E2E national playback", members: [OTHER_BIOMEDICAL_CHART_ID, SHIPPED_CASE_CHART_ID] },
      { id: RETAINED_PAGE_GROUP_ID, name: "Socio-economic page group" },
    ],
    scenes: [],
  });
  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();

  auxiliary = await openSceneStudio(page);
  await auxiliary.getByRole("button", { name: "Create Scene", exact: true }).click();
  await expect(auxiliary.getByLabel("Owning page")).toHaveValue("biomedical");
  await expect(auxiliary.getByLabel("Parent Chrono Group")).toHaveValue(REMOVED_PAGE_GROUP_ID);
  const sceneName = auxiliary.getByLabel("Scene name");
  await sceneName.fill("E2E response scene");
  await auxiliary.getByRole("button", { name: "Save Scene" }).click();
  await expect(auxiliary.getByRole("heading", { name: "E2E response scene" })).toBeVisible();

  await expect.poll(() => storedTemporalState(page)).toMatchObject({
    groups: [
      { id: REMOVED_PAGE_GROUP_ID, name: "E2E national playback", members: [OTHER_BIOMEDICAL_CHART_ID, SHIPPED_CASE_CHART_ID] },
      { id: RETAINED_PAGE_GROUP_ID, name: "Socio-economic page group" },
    ],
    scenes: [{
      name: "E2E response scene",
      pageId: "biomedical",
      chronoGroupId: REMOVED_PAGE_GROUP_ID,
      members: [OTHER_BIOMEDICAL_CHART_ID, SHIPPED_CASE_CHART_ID],
    }],
  });
});

test("Studios open unfiltered from Home and a newly saved Scene remains visible", async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  await installTemporalFixture(page, request);
  await page.goto("/");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();

  let auxiliary = await openSceneStudio(page);
  await expect(auxiliary.getByLabel("Page")).toHaveValue("");
  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();

  await openChronoStudio(page);
  const chronoAuxiliary = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await expect(chronoAuxiliary.getByLabel("Page")).toHaveValue("");
  await expect(chronoAuxiliary.locator("[data-action='open-content']").first()).toBeVisible();
  await expect(chronoAuxiliary.getByText("Showing 2 of 2", { exact: true })).toBeVisible();
  await chronoAuxiliary.getByRole("button", { name: "Close", exact: true }).click();

  auxiliary = await openSceneStudio(page);
  await auxiliary.getByRole("button", { name: "Create Scene", exact: true }).click();
  await expect(auxiliary.getByLabel("Owning page")).toHaveValue("biomedical");
  await expect(auxiliary.getByLabel("Parent Chrono Group")).toHaveValue(REMOVED_PAGE_GROUP_ID);

  const sceneName = "Cross-page response scene";
  await auxiliary.getByLabel("Scene name").fill(sceneName);
  await auxiliary.getByRole("button", { name: "Save Scene" }).click();
  await expect(auxiliary.getByRole("heading", { name: sceneName })).toBeVisible();
  await expect.poll(() => storedTemporalState(page)).toMatchObject({
    scenes: [{
      name: sceneName,
      pageId: "biomedical",
      chronoGroupId: REMOVED_PAGE_GROUP_ID,
      members: [OTHER_BIOMEDICAL_CHART_ID, SHIPPED_CASE_CHART_ID],
    }],
  });
  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();

  auxiliary = await openSceneStudio(page);
  await expect(auxiliary.getByLabel("Page")).toHaveValue("biomedical");
  await expect(auxiliary.getByRole("button", { name: new RegExp(sceneName) })).toBeVisible();
  await expect(auxiliary.getByText("Showing 1 of 1", { exact: true })).toBeVisible();
});

async function openSceneStudio(page) {
  await page.locator('[data-build-command-action="scene-studio"]').click();
  const auxiliary = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await expect(auxiliary).toBeVisible();
  return auxiliary;
}

async function openChronoStudio(page) {
  await page.locator('[data-build-command-action="chrono-studio"]').click();
  const auxiliary = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await expect(auxiliary).toBeVisible();
  return auxiliary;
}

async function installTemporalFixture(page, request) {
  const response = await request.get(`${APP_URL}/config/dashboard.json`);
  expect(response.ok()).toBeTruthy();
  const dashboard = withPageRemovalGroups(await response.json());
  await page.addInitScript(({ key, fixture }) => {
    const marker = `${key}:temporal-fixture-installed`;
    if (sessionStorage.getItem(marker) === "true") return;
    localStorage.setItem(key, JSON.stringify(fixture));
    sessionStorage.setItem(marker, "true");
  }, { key: STORAGE_KEY, fixture: dashboard });
}

async function storedTemporalState(page) {
  return page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return {
      groups: dashboard.chronoGroups.map(({ id, name, members }) => ({
        id, name, members: members.map(({ chartId }) => chartId).sort(),
      })),
      scenes: dashboard.scenes.map(({ id, name, pageId, chronoGroupId, members }) => ({
        id, name, pageId, chronoGroupId,
        members: members.map(({ chartId }) => chartId).sort(),
      })),
    };
  }, STORAGE_KEY);
}
