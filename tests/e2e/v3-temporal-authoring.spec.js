import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { REMOVED_PAGE_GROUP_ID, RETAINED_PAGE_GROUP_ID, withPageRemovalGroups } from "./support/layoutReviewFixture.js";

const APP_URL = "http://127.0.0.1:4173";
const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
});

test("Storyline Studio navigates through native content before editing and persists end to end", async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  const fixture = await installTemporalFixture(page, request);
  const original = fixture.scenes.find(scene => scene.id === REMOVED_PAGE_GROUP_ID);
  const retained = fixture.scenes.find(scene => scene.id === RETAINED_PAGE_GROUP_ID);
  const memberIds = original.members.map(member => member.chartId).sort();
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();

  const auxiliary = await openStorylineStudio(page);
  await expect(auxiliary.getByRole("combobox", { name: "Page", exact: true })).toHaveValue("");
  await auxiliary.getByRole("button", { name: new RegExp(original.name) }).click();
  await expect(auxiliary.getByRole("heading", { name: original.name, exact: true })).toBeVisible();
  const charts = fixture.pages.flatMap(p => p.sections.flatMap(s => s.panels.map(p => p.chart ?? p)));
  for (const id of memberIds) await expect(auxiliary.locator(".scene-content")).toContainText(charts.find(chart => chart.id === id).title);
  const actions = auxiliary.locator(".temporal-content-page__actions");
  await expect(actions.getByRole("button")).toHaveText(["Edit", "Duplicate", "Remove", "Back to Storyline Studio"]);
  const geometry = await actions.evaluate(element => ({
    height: element.getBoundingClientRect().height,
    buttons: [...element.querySelectorAll("button")].map(button => {
      const box = button.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, height: box.height };
    }),
  }));
  expect(geometry.height).toBeLessThanOrEqual(70);
  for (const button of geometry.buttons) expect(button.height).toBe(32);
  for (let index = 1; index < geometry.buttons.length; index++) {
    expect(geometry.buttons[index - 1].right).toBeLessThanOrEqual(geometry.buttons[index].left);
    expect(Math.abs(geometry.buttons[index - 1].top - geometry.buttons[index].top)).toBeLessThanOrEqual(1);
  }
  await auxiliary.getByRole("button", { name: "Edit", exact: true }).click();
  const stages = auxiliary.getByRole("navigation", { name: "Storyline authoring stages", exact: true });
  await expect(stages.getByRole("button")).toHaveCount(3);
  await expect(stages.getByRole("button")).toContainText(["Storyline details", "Select charts and frames", "Arrange and configure"]);
  await expect(auxiliary.locator('[data-scene-workflow-id="parent-chrono-group"]')).toHaveCount(0);
  await auxiliary.getByLabel("Storyline name", { exact: true }).fill("E2E national playback");
  await auxiliary.getByLabel("Seconds per frame", { exact: true }).fill("0.75");
  await expect(auxiliary.getByRole("radio", { name: "All member observations", exact: true })).toBeChecked();
  await stages.getByRole("button", { name: /Arrange and configure/ }).click();
  await auxiliary.getByRole("button", { name: "Save Storyline", exact: true }).click();
  await expect(auxiliary.getByRole("heading", { name: "E2E national playback", exact: true })).toBeVisible();
  await expect.poll(() => storedTemporalState(page)).toMatchObject({
    version: 7, hasGroups: false,
  });
  await expect.poll(async () => (await storedTemporalState(page)).scenes.find(scene => scene.id === original.id)).toMatchObject({
    id: original.id, name: "E2E national playback", members: memberIds, secondsPerFrame: 0.75, frames: original.frames, present: original.present,
  });
  await expect.poll(async () => (await storedTemporalState(page)).scenes.find(scene => scene.id === retained.id)).toMatchObject({ id: retained.id, name: retained.name });

  await auxiliary.getByRole("button", { name: "Duplicate", exact: true }).click();
  await auxiliary.getByLabel("Storyline name", { exact: true }).fill("E2E response Storyline");
  await auxiliary.getByRole("combobox", { name: "Owning page", exact: true }).selectOption("biomedical");
  await auxiliary.getByRole("button", { name: "Save Storyline", exact: true }).click();
  await expect(auxiliary.getByRole("heading", { name: "E2E response Storyline", exact: true })).toBeVisible();
  await expect.poll(async () => (await storedTemporalState(page)).scenes.find(scene => scene.name === "E2E response Storyline")).toMatchObject({
    name: "E2E response Storyline", pageId: "biomedical", members: memberIds,
    secondsPerFrame: 0.75, frames: original.frames, present: original.present,
  });
  const saved = await storedTemporalState(page);
  expect(saved.scenes.every(scene => !scene.hasParent)).toBe(true);
  expect(saved.scenes).toHaveLength(fixture.scenes.length + 1);
});

test("Storyline Studio opens unfiltered from Home and a newly saved Storyline remains visible", async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  const fixture = await installTemporalFixture(page, request);
  const seed = fixture.scenes.find(scene => scene.id === REMOVED_PAGE_GROUP_ID);
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  let auxiliary = await openStorylineStudio(page);
  await expect(auxiliary.getByRole("combobox", { name: "Page", exact: true })).toHaveValue("");
  await expect(auxiliary.locator("[data-action='open-content']").first()).toBeVisible();
  await expect(auxiliary.getByText(`Showing ${fixture.scenes.length} of ${fixture.scenes.length}`, { exact: true })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Create Storyline", exact: true }).click();
  await auxiliary.getByRole("combobox", { name: "Owning page", exact: true }).selectOption("biomedical");
  await expect(auxiliary.locator('[data-scene-workflow-id="parent-chrono-group"]')).toHaveCount(0);
  const name = "Cross-page response Storyline";
  await auxiliary.getByLabel("Storyline name", { exact: true }).fill(name);
  await auxiliary.getByRole("radio", { name: "All member observations", exact: true }).check();
  await auxiliary.getByRole("button", { name: /Select charts and frames/ }).click();
  await selectExactMembers(auxiliary, fixture, seed.members.map(member => member.chartId));
  await auxiliary.getByRole("button", { name: "Save Storyline", exact: true }).click();
  await expect(auxiliary.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect.poll(async () => (await storedTemporalState(page)).scenes.find(scene => scene.name === name)).toMatchObject({
    name, pageId: "biomedical", hasParent: false, members: seed.members.map(member => member.chartId).sort(), frames: { mode: "union" },
  });
  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();
  auxiliary = await openStorylineStudio(page);
  await auxiliary.getByRole("combobox", { name: "Page", exact: true }).selectOption("biomedical");
  await expect(auxiliary.getByRole("button", { name: new RegExp(name) })).toBeVisible();
  await auxiliary.getByLabel("Search", { exact: true }).fill(name);
  await expect(auxiliary.locator("[data-action='open-content']")).toHaveCount(1);
  await expect(auxiliary.getByText(`Showing 1 of ${fixture.scenes.length + 1}`, { exact: true })).toBeVisible();
});

async function selectExactMembers(auxiliary, fixture, ids) {
  const charts = fixture.pages.flatMap(p => p.sections.flatMap(s => s.panels.map(p => p.chart ?? p)));
  const picker = auxiliary.getByRole("region", { name: "Storyline chart coverage", exact: true });
  for (const id of ids) await picker.getByRole("checkbox", { name: charts.find(chart => chart.id === id).title, exact: true }).check();
  for (const checkbox of await picker.getByRole("checkbox").all()) {
    const label = await checkbox.getAttribute("aria-label") ?? await checkbox.evaluate(input => input.parentElement.textContent.trim());
    if (!ids.some(id => charts.find(chart => chart.id === id).title === label) && await checkbox.isChecked()) await checkbox.uncheck();
  }
}

async function openStorylineStudio(page) {
  await page.locator('[data-build-command-action="scene-studio"]').click();
  const auxiliary = page.getByRole("dialog", { name: "Storyline Studio authoring", exact: true });
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
  return dashboard;
}

async function storedTemporalState(page) {
  return page.evaluate(key => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return { version: dashboard.configVersion, hasGroups: Object.hasOwn(dashboard, "chronoGroups"),
      scenes: dashboard.scenes.map(({ id, name, pageId, members, secondsPerFrame, frames, present, ...scene }) => ({
        id, name, pageId, secondsPerFrame, frames, present, hasParent: Object.hasOwn(scene, "chronoGroupId"),
        members: members.map(({ chartId }) => chartId).sort(),
      })),
    };
  }, STORAGE_KEY);
}
