import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { enterAuthoredDashboard } from "./support/landingWorkflow.js";
import { parseCsvText } from "../../src/lib/loadCsv.js";
import { buildStorylineCoverage } from "../../src/components/time/storylineAuthoring.js";

const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const shipped = JSON.parse(await readFile(new URL("../../public/config/dashboard.json", import.meta.url), "utf8"));
const charts = shipped.pages.flatMap(page => page.sections.flatMap(section => section.panels.map(placement => placement.chart ?? placement)));
const national = shipped.scenes.find(scene => scene.id === "national_outbreak");
const vaccination = charts.find(chart => chart.id === "bio_vaccination_rate");
const originalMemberIds = ["bio_confirmed_cases", "bio_daily_cases_bar", "bio_new_cases_deaths", "bio_r_values", "bio_admissions"];
const shortPeriod = { start: "2027-02-20", end: "2027-03-01" };

test.use({ viewport: { width: 1440, height: 900 }, storageState: { cookies: [], origins: [] } });

async function openNationalEditor(page, request) {
  expect(shipped.configVersion).toBe(7);
  expect(Object.hasOwn(shipped, "chronoGroups")).toBe(false);
  expect(national.members.map(member => member.chartId)).toEqual(originalMemberIds);
  const response = await request.get("/config/dashboard.json");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual(shipped);
  await page.addInitScript(({ key, config }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(config));
  }, { key: STORAGE_KEY, config: shipped });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.locator('[data-build-command-action="scene-studio"]').click();
  const studio = page.getByRole("dialog", { name: "Storyline Studio authoring", exact: true });
  await studio.getByRole("button", { name: new RegExp(national.name) }).click();
  await studio.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(studio.getByLabel("End date", { exact: true })).toBeVisible();
  return studio;
}

async function coveragePicker(studio) {
  await studio.getByRole("button", { name: /Select charts and frames/ }).click();
  const picker = studio.getByRole("region", { name: "Storyline chart coverage", exact: true });
  await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(5);
  for (const id of originalMemberIds) {
    await expect(picker.getByRole("checkbox", { name: charts.find(chart => chart.id === id).title, exact: true })).toBeChecked();
  }
  for (const chart of charts.filter(chart => chart.presentation?.collection != null)) {
    await expect(picker.getByRole("checkbox", { name: chart.title, exact: true })).toBeDisabled();
  }
  return picker;
}

async function fixtureCoverage() {
  const dashboard = { ...shipped, datasetProfiles: JSON.parse(await readFile(new URL("../../public/config/dataset-profiles.json", import.meta.url), "utf8")), loadedData: {} };
  for (const sourceId of new Set([...originalMemberIds, vaccination.id].map(id => charts.find(chart => chart.id === id).sourceId))) {
    const source = dashboard.dataSources[sourceId];
    dashboard.loadedData[sourceId] = source.rows ?? parseCsvText(source.csvText ?? await readFile(new URL(`../../public/${source.path}`, import.meta.url), "utf8"), source.fileName ?? sourceId);
  }
  const candidates = buildStorylineCoverage(dashboard, shortPeriod, { calendarPeriod: true });
  for (const id of originalMemberIds) expect(candidates.find(candidate => candidate.id === id).inWindowCount).toBe(10);
  const candidate = candidates.find(candidate => candidate.id === vaccination.id);
  expect(candidate.inWindowCount).toBe(0);
  expect(candidate.count).toBe(9);
  expect(new Date(candidate.start).toISOString()).toBe("2027-06-20T00:00:00.000Z");
  return candidate;
}

test("native Storyline membership controls preflight keeps all five national members and disables Collections", async ({ page, request }) => {
  await fixtureCoverage();
  const studio = await openNationalEditor(page, request);
  await coveragePicker(studio);
  await studio.getByRole("button", { name: "Discard Storyline", exact: true }).click();
  await studio.getByRole("button", { name: "Close", exact: true }).click();
});

test("Storyline coverage names the vaccination gap and inspects actual dates while save and cancel preserve membership", async ({ page, request }) => {
  test.setTimeout(120_000);
  const candidate = await fixtureCoverage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  let studio = await openNationalEditor(page, request);
  const originalText = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  const original = JSON.parse(originalText);
  await studio.getByLabel("End date", { exact: true }).fill(shortPeriod.end);
  const picker = await coveragePicker(studio);
  const checkbox = picker.getByRole("checkbox", { name: vaccination.title, exact: true });
  const row = checkbox.locator("xpath=../..");
  await expect(row).toHaveAttribute("data-coverage", "none");
  await expect(row).toContainText(`${candidate.inWindowCount} observations in period (${candidate.count} total)`);
  await expect(row).toContainText("No coverage in this period");
  await checkbox.check();
  await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(6);
  const inspect = row.getByRole("button", { name: "Inspect observations", exact: true });
  await inspect.focus();
  await expect(inspect).toBeFocused();
  await page.keyboard.press("Enter");
  const observations = page.getByRole("dialog", { name: `${vaccination.title} observations`, exact: true });
  await expect(observations).toBeVisible();
  await expect(observations.getByRole("listitem")).toHaveCount(candidate.count);
  await expect(observations.getByRole("listitem").first()).toHaveText("2027-06-20T00:00:00.000Z");
  await observations.getByRole("button", { name: "Close", exact: true }).click();
  await checkbox.uncheck();
  await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(5);
  await studio.getByRole("button", { name: "Discard Storyline", exact: true }).click();
  await studio.getByRole("button", { name: "Close", exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(originalText);

  studio = await openNationalEditor(page, request);
  await studio.getByLabel("End date", { exact: true }).fill(shortPeriod.end);
  await coveragePicker(studio);
  await studio.getByRole("button", { name: "Save Storyline", exact: true }).click();
  await expect(studio.getByRole("heading", { name: national.name, exact: true })).toBeVisible();
  await expect.poll(async () => page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)).scenes.find(scene => scene.id === id).period, { key: STORAGE_KEY, id: national.id })).toEqual(shortPeriod);
  const savedText = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  const saved = JSON.parse(savedText), savedScene = saved.scenes.find(scene => scene.id === national.id);
  expect(savedScene).toEqual({ ...original.scenes.find(scene => scene.id === national.id), period: shortPeriod });
  expect(savedScene.members.map(member => member.chartId)).toEqual(originalMemberIds);
  expect(savedScene.present).toEqual(national.present); // Present's four-chart subset must never truncate the five authored members.
  expect(saved.scenes.filter(scene => scene.id !== national.id)).toEqual(original.scenes.filter(scene => scene.id !== national.id));
  expect(saved.pages).toEqual(original.pages); // Storyline changes do not rewrite chart-owned matching defaults.
  await studio.getByRole("button", { name: "Close", exact: true }).click();

  studio = await openNationalEditor(page, request);
  await expect(studio.getByLabel("End date", { exact: true })).toHaveValue(shortPeriod.end);
  await coveragePicker(studio);
  await studio.getByRole("button", { name: /Storyline details/ }).click();
  await studio.getByLabel("End date", { exact: true }).fill(national.period.end);
  await studio.getByRole("button", { name: "Discard Storyline", exact: true }).click();
  await studio.getByRole("button", { name: "Close", exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(savedText);
  expect(errors).toEqual([]);
});
