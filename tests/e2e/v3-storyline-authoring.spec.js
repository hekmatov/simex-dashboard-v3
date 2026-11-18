import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { revealCanonicalPanel } from "./support/time-cursor-workflow.js";
import { sceneMemberTimeRole } from "../../src/charting/time/sceneSchema.js";
import { normalizeDashboardBoundary } from "../../src/charting/config/dashboardBundleV3.js";

const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
test.use({ storageState: { cookies: [], origins: [] } });

async function prepareStorylineSource({ page, request }) {
  await request.post("http://127.0.0.1:4174/__test__/reset");
  await request.post("http://127.0.0.1:4174/__test__/catalogue-mode", { data: { mode: "absent" } });
  await page.setViewportSize({ width: 1280, height: 960 });
  const response = await request.get("http://127.0.0.1:4173/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const rawFixture = await response.json();
  const profilesResponse = await request.get("http://127.0.0.1:4173/config/dataset-profiles.json");
  expect(profilesResponse.ok()).toBe(true);
  const profiles = await profilesResponse.json();
  const fixture = normalizeDashboardBoundary(rawFixture, { profiles });
  const candidates = fixture.pages.flatMap(page => page.sections.flatMap(section => section.panels
    .map(placement => placement.chart ?? placement)
    .filter(chart => { if (chart.typeId !== "line") return false; try { sceneMemberTimeRole(chart, {}, profiles); return true; } catch { return false; } })
    .map(chart => ({ pageId: page.id, chart }))));
  expect(candidates.length).toBeGreaterThan(1);
  const first = candidates[0], second = candidates.find(candidate => candidate.pageId !== first.pageId);
  expect(second, "The selected fixture must contain temporal charts on two pages").toBeTruthy();
  const originalScenes = fixture.scenes ?? [];
  await page.addInitScript(({ fixture, key }) => localStorage.setItem(key, JSON.stringify(fixture)), { fixture, key: STORAGE_KEY });
  await page.goto("/");
  return { first, second, originalScenes };

}

test("Storyline source preflight reaches actual two-page comparison controls", async ({ page, request }) => {
  test.setTimeout(60_000);
  const { first, second } = await prepareStorylineSource({ page, request });
  for (const candidate of [first, second]) {
    await openDashboardPage(page, candidate.pageId);
    await expect(page.getByRole("region", { name: "Dashboard time", exact: true })).toBeVisible();
    await expect(page.locator(".time-bar__instant")).toBeEnabled();
    const panel = await revealCanonicalPanel(page, candidate.chart.id);
    if (candidate === first) await expect(panel.getByRole("button", { name: "Focus chart", exact: true })).toBeEnabled();
    if (candidate === first) await expect(page.getByRole("button", { name: "Compare charts", exact: true })).toBeEnabled();
    else await expect(page.getByRole("button", { name: "Compare charts", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true })).toBeEnabled();
    if (candidate === first) await page.getByRole("button", { name: "Compare charts", exact: true }).click();
    else await expect(page.locator(".multi-select-count")).toContainText("1");
    await panel.getByRole("button", { name: "Add chart to comparison", exact: true }).click();
  }
  const selection = page.getByRole("region", { name: "Chart comparison selection", exact: true });
  await expect(selection).toContainText("2");
  await expect(selection.getByRole("button", { name: "Compare", exact: true })).toBeEnabled();
  await selection.getByRole("button", { name: "Compare", exact: true }).click();
  const comparison = page.getByRole("dialog", { name: "Chart comparison", exact: true });
  await comparison.getByRole("button", { name: "Use over-under layout", exact: true }).click();
  await comparison.getByRole("button", { name: "Save as Storyline", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Storyline Studio authoring", exact: true });
  await expect(editor.getByLabel("Storyline name", { exact: true })).toBeVisible();
  await expect(editor.locator('[data-scene-workflow-id="parent-chrono-group"]')).toHaveCount(0);
  await expect(editor.getByRole("button", { name: "Save Storyline", exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "Discard Storyline", exact: true }).click();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(editor).toHaveCount(0);
});

test("cross-page comparison prepares a cancellable Storyline draft and reopens its saved layouts", async ({ page, request }) => {
  test.setTimeout(90_000);
  const { first, second, originalScenes } = await prepareStorylineSource({ page, request });

  async function compare() {
    await openDashboardPage(page, first.pageId);
    await page.getByRole("button", { name: "Compare charts", exact: true }).click();
    const firstPanel = await revealCanonicalPanel(page, first.chart.id);
    await firstPanel.getByRole("button", { name: "Add chart to comparison", exact: true }).click();
    await openDashboardPage(page, second.pageId);
    await expect(page.locator(".multi-select-count")).toContainText("1");
    const secondPanel = await revealCanonicalPanel(page, second.chart.id);
    await secondPanel.getByRole("button", { name: "Add chart to comparison", exact: true }).click();
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    const comparison = page.getByRole("dialog", { name: "Chart comparison", exact: true });
    await expect(comparison).toBeVisible();
    await comparison.getByRole("button", { name: "Use over-under layout", exact: true }).click();
    await comparison.getByRole("button", { name: "Save as Storyline", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Storyline Studio authoring", exact: true });
    await expect(editor.getByLabel("Storyline name", { exact: true })).toBeVisible();
    await expect(editor.locator('[data-scene-workflow-id="parent-chrono-group"]')).toHaveCount(0);
    return editor;
  }

  const cancelled = await compare();
  const sceneBeforeSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).scenes ?? [], STORAGE_KEY);
  expect(sceneBeforeSave).toEqual(originalScenes);
  await cancelled.getByRole("button", { name: "Discard Storyline", exact: true }).click();
  await cancelled.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).scenes ?? [], STORAGE_KEY)).toEqual(originalScenes);

  const editor = await compare();
  await editor.getByLabel("Storyline name", { exact: true }).fill("Cross-page saved comparison");
  await editor.getByRole("button", { name: /Select charts and frames/ }).click();
  await expect(editor.getByRole("region", { name: "Storyline chart coverage" })).toBeVisible();
  await expect(editor.locator('.storyline-coverage-picker input[type="checkbox"]:checked')).toHaveCount(2);
  await editor.getByRole("button", { name: "Save Storyline", exact: true }).click();
  await expect(editor.getByRole("heading", { name: "Cross-page saved comparison", exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "Edit", exact: true }).click();
  await editor.getByRole("button", { name: /Arrange and configure/ }).click();
  await expect(editor.getByRole("combobox", { name: "View layout", exact: true })).toHaveValue("overUnder");
  await expect(editor.getByRole("combobox", { name: "Present layout", exact: true })).toHaveValue("horizontal-divider");
  await editor.getByRole("button", { name: "Discard Storyline", exact: true }).click();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).scenes.find(scene => scene.name === "Cross-page saved comparison"), STORAGE_KEY);
  expect(saved.members.map(member => member.chartId)).toEqual([first.chart.id, second.chart.id]);
  expect(saved.view.layout).toBe("overUnder");
  expect(saved.present.layout).toBe("horizontal-divider");
  expect(saved.chronoGroupId).toBeUndefined();
  await page.getByLabel("Time scope", { exact: true }).selectOption(`storyline:${saved.id}`);
  const band = page.locator(`[data-storyline-band="${saved.id}"]`);
  await expect(band).toBeVisible();
  await expect(band.locator("[data-scene-chart-id]")).toHaveCount(2);
  await expect(page.locator("[data-canonical-page-id]")).toHaveAttribute("data-canonical-page-id", second.pageId);
  await band.getByRole("button", { name: "Close Storyline", exact: true }).click();
  await expect(band).toHaveCount(0);
  await expect(page.getByLabel("Time scope", { exact: true })).toHaveValue("page");
  await expect(page.locator(`[data-panel-id="${second.chart.id}"]`)).toBeVisible();
});
