import { readFile } from "node:fs/promises";
import { parseCsvText } from "../../src/lib/loadCsv.js";
import { buildStorylineClock } from "../../src/charting/time/playbackPageScope.js";
import { sceneMemberTimeRole } from "../../src/charting/time/sceneSchema.js";
import { collectTemporalAvailability } from "../../src/charting/time/temporalAvailability.js";
import { expect, test } from "@playwright/test";
import { timeCursor, revealCanonicalPanel } from "./support/time-cursor-workflow.js";
import { enterAuthoredDashboard, openDashboardPage } from "./support/landingWorkflow.js";
import { openAudienceSession, installAudienceFaultInstrumentation, readLastAcceptedAudienceState } from "./support/present-audience-workflow.js";

const shipped = JSON.parse(await readFile(new URL("../../public/config/dashboard.json", import.meta.url), "utf8"));
const charts = shipped.pages.flatMap((page) => page.sections.flatMap((section) =>
  section.panels.map((placement) => ({ pageId: page.id, chart: placement.chart ?? placement }))));
const representatives = [...new Map(charts.map((entry) => [entry.chart.typeId, entry])).values()];
const mode = (page, name) => page.getByLabel("Dashboard mode").getByRole("button", { name, exact: true });
const panel = revealCanonicalPanel;
const sourceRows = Object.fromEntries(await Promise.all(Object.entries(shipped.dataSources)
  .filter(([, source]) => source.kind === "csv")
  .map(async ([id, source]) => [id, parseCsvText(await readFile(new URL(`../../public/${source.path}`, import.meta.url), "utf8"), id)])));
const storylineClocks = new Map(shipped.scenes.map(scene => [scene.id, buildStorylineClock({
  storyline: scene, charts: charts.map(entry => entry.chart), loadedData: sourceRows, profiles: shipped.datasetProfiles, timezone: shipped.timezone,
})]));
const clockFor = scene => {
  const clock = storylineClocks.get(scene.id);
  expect(clock.length, `${scene.id} actual eligible source frames`).toBeGreaterThan(2);
  return clock;
};
function lastMeasuredEpoch(chart) {
  let timeRole;
  try { timeRole = sceneMemberTimeRole(chart, {}, shipped.datasetProfiles); } catch { return null; }
  return collectTemporalAvailability({ chart, member: { chartId: chart.id, timeRole }, rows: sourceRows[chart.sourceId], profile: shipped.datasetProfiles[chart.sourceId], period: { start: "0001-01-01", end: "9999-12-31" }, timezone: shipped.timezone }).at(-1) ?? null;
}

test.use({ viewport: { width: 1440, height: 1000 }, storageState: { cookies: [], origins: [] } });

test("selected shipped content renders every authored chart type without a fixture", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = observeErrors(page);
  await openShipped(page);
  expect(representatives).toHaveLength(16);
  for (const { pageId, chart } of representatives) {
    await openDashboardPage(page, pageId);
    const epoch = lastMeasuredEpoch(chart);
    if (epoch !== null) {
      const cursor = timeCursor(page);
      await cursor.selectScope({ kind: "page" });
      await cursor.open();
      await cursor.frame.fill(String(epoch));
    }
    await chartReady(await panel(page, chart.id), chart);
  }
  expect(errors).toEqual([]);
});

test("selected shipped Storylines constrain their source clock to authored coverage and synchronize every member", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = observeErrors(page);
  await openShipped(page);
  await openDashboardPage(page, "biomedical");
  const cursor = timeCursor(page);
  const controls = await cursor.open();
  for (const group of shipped.scenes) {
    await cursor.selectScope({ name: group.name });
    const band = page.getByRole("region", { name: "Storyline", exact: true });
    await expect(band.locator("[data-scene-chart-id]")).toHaveCount(group.members.length);
    const frame = cursor.frame;
    const firstEpoch = await frame.getAttribute("min"), lastEpoch = await frame.getAttribute("max");
    const clock = clockFor(group);
    expect(Number(firstEpoch)).toBe(clock[0]);
    expect(Number(lastEpoch)).toBe(clock.at(-1));
    await frame.fill(firstEpoch);
    await expect(controls).toHaveAttribute("data-time-mode", "at");
    await controls.getByRole("button", { name: "Next time", exact: true }).click();
    const nextDate = new Date(Number(await frame.inputValue())).toISOString();
    expect(Date.parse(nextDate)).toBeGreaterThan(Number(firstEpoch));
    for (const member of group.members) {
      const chart = charts.find((entry) => entry.chart.id === member.chartId).chart;
      const memberCell = band.locator(`[data-scene-chart-id="${chart.id}"]`);
      await chartReady(memberCell, chart);
      await expect(memberCell.locator("[data-chart-active-date]")).toHaveAttribute("data-chart-active-date", nextDate.slice(0, 10));
    }
    await controls.getByRole("button", { name: "Play time", exact: true }).click();
    await expect(frame).not.toHaveValue(String(Date.parse(nextDate)));
    await controls.getByRole("button", { name: "Pause time", exact: true }).click();
    const pausedDate = await frame.inputValue();
    await page.waitForTimeout(1_200); // Longer than the authored one-second cadence: assert pause stability.
    await expect(frame).toHaveValue(pausedDate);
    await frame.fill(lastEpoch);
    await expect(frame).toHaveValue(lastEpoch);
    await expect(controls.getByRole("button", { name: "Next time", exact: true })).toBeDisabled();
    await controls.getByRole("button", { name: "Previous time", exact: true }).click();
    await expect(frame).not.toHaveValue(lastEpoch);
  }
  expect(errors).toEqual([]);
});

test("Whole page opens its latest eligible time, identifies nonconcurrent observations and keeps Collection snapshots outside synchronization", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = observeErrors(page);
  await openShipped(page);
  await openDashboardPage(page, "biomedical");
  const cursor = timeCursor(page);
  await cursor.selectScope({ kind: "page" });
  await cursor.open();
  const frame = cursor.frame;
  await expect(cursor.scope).toHaveValue("page");
  await expect.poll(() => frame.inputValue()).toBe(await frame.getAttribute("max"));
  const biomedical = charts.filter(({ pageId }) => pageId === "biomedical");
  await expect(page.locator("[data-canonical-panel-id]")).toHaveCount(biomedical.length);
  for (const id of ["bio_confirmed_cases", "bio_hospital_capacity_bullet", "bio_vaccination_current", "bio_municipality_aggregate"]) {
    const chart = charts.find((entry) => entry.chart.id === id)?.chart;
    expect(chart).toBeDefined();
    const target = await panel(page, id);
    if (id === "bio_municipality_aggregate") {
      await expect(target.locator(".chart-time-chip")).toHaveAttribute("data-chart-time-kind", "nonconcurrent");
      await chartReady(target, chart);
      continue;
    }
    await chartReady(target, chart);
    if (chart.presentation?.collection) {
      const ledger = JSON.parse(await target.locator("[data-canonical-runtime-ledger]").getAttribute("data-canonical-runtime-ledger"));
      expect(ledger.time?.activeEpochMs ?? null).toBeNull();
    }
    await expect(target).not.toContainText(/No measurement at this time|does not have a bound temporal role/);
  }
  await expect(page.getByText("This synchronized chart does not have a bound temporal role.", { exact: true })).toHaveCount(0);
  await frame.fill(await frame.getAttribute("min"));
  await expect((await panel(page, "bio_confirmed_cases")).locator(".chart-time-chip")).toHaveAttribute("data-chart-time-kind", "nonconcurrent");
  await chartReady(await panel(page, "bio_hospital_capacity_bullet"), charts.find(({ chart }) => chart.id === "bio_hospital_capacity_bullet").chart);
  const national = shipped.scenes.find(group => group.id === "national_outbreak");
  await cursor.selectScope({ name: national.name });
  await expect(page.getByRole("region", { name: "Storyline", exact: true }).locator("[data-scene-chart-id]")).toHaveCount(national.members.length);
  await expect(page.locator("[data-canonical-panel-id]")).toHaveCount(biomedical.length);
  expect(errors).toEqual([]);
});

test("selected shipped scopes play pause seek and change period in a real Audience display", async ({ page, context }) => {
  // Cold hydration and both authored periods share this journey budget;
  // individual readiness, connection and playback assertions keep their limits.
  test.setTimeout(180_000);
  const errors = observeErrors(page);
  await installAudienceFaultInstrumentation(context);
  await openShipped(page);
  await openDashboardPage(page, "biomedical");
  await mode(page, "Present").click();
  const cursor = timeCursor(page);
  const controller = await cursor.open();
  const seek = cursor.frame;
  const municipal = shipped.scenes.find(({ id }) => id === "municipal_outbreak");
  const national = shipped.scenes.find(({ id }) => id === "national_outbreak");
  await cursor.selectScope({ name: municipal.name });
  for (const { chartId } of municipal.members) await page.locator(`[data-presentable-item-id="${chartId}"]`).getByRole("checkbox").check();
  // The source server can still be loading the popup graph when the page event
  // fires. Establish its destination and DOM before timing the connection.
  page.context().once("page", (popup) => observeErrors(popup, errors));
  const { popup: audience } = await openAudienceSession(page, { waitForBaseline: false });
  // Audience hydrates the full shipped dashboard before starting its channel.
  // DOMContentLoaded alone also admits the bootstrap waiting surface.
  // Hosted Windows can still be fetching authored CSVs after 45 seconds.
  await expect(audience.locator(".audience-theme-root")).toBeVisible({ timeout: 90_000 });
  const output = audience.locator(".audience-display");
  await expect(output).toHaveAttribute("data-connection-status", "connected");
  await expect(output).toHaveAttribute("data-output-mode", "active");
  for (const group of [municipal, national]) {
    await cursor.selectScope({ name: group.name });
    const displayed = group.id === municipal.id ? municipal.present.chartIds
      : ["bio_confirmed_cases", "bio_daily_cases_bar", "bio_new_cases_deaths", "bio_admissions"];
    // Explicitly compose the four national witnesses while retaining the saved
    // Storyline's independent clock; its authored subset is not edited.
    const selected = await page.locator(".present-chart-choice:has(input:checked)").evaluateAll(nodes => nodes.map(node => node.dataset.presentableItemId));
    for (const id of selected) if (!displayed.includes(id)) await page.locator(`[data-presentable-item-id="${id}"]`).getByRole("checkbox").uncheck();
    for (const id of displayed) await page.locator(`[data-presentable-item-id="${id}"]`).getByRole("checkbox").check();
    const clock = clockFor(group);
    await cursor.seekFrameIndex(0);
    await expect(output).toHaveAttribute("data-frame-index", "0");
    await audienceChartsAt(audience, displayed, clock[0]);
    await cursor.play.click();
    await expect.poll(async () => Number(await output.getAttribute("data-frame-index"))).toBeGreaterThan(0);
    await cursor.pause.click();
    const pausedEpoch = await seek.inputValue();
    const pausedIndex = await output.getAttribute("data-frame-index");
    await expect(output).toHaveAttribute("data-frame-index", pausedIndex);
    await page.waitForTimeout(1_200);
    await expect(seek).toHaveValue(pausedEpoch);
    await expect(output).toHaveAttribute("data-frame-index", pausedIndex);
    const lastIndex = (await readLastAcceptedAudienceState(audience)).time.frame_epochs.length - 1;
    await seek.press("End");
    await expect(output).toHaveAttribute("data-frame-index", String(lastIndex));
    await audienceChartsAt(audience, displayed, clock.at(-1));
    await expect(cursor.next).toBeDisabled();
    await cursor.previous.click();
    await expect(output).toHaveAttribute("data-frame-index", String(lastIndex - 1));
  }
  await expect(output).toHaveAttribute("data-render-status", "current");
  expect(errors).toEqual([]);
  await audience.close();
  await expect(page.getByRole("button", { name: "Open audience display", exact: true })).toBeVisible();
  await expect(cursor.pause).toHaveCount(0);
});

async function openShipped(page) {
  await page.goto("/");
  const response = await page.request.get("/config/dashboard.json");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual(shipped);
  expect((await page.context().cookies()).some(({ name }) => name === "simex-e2e-fixture")).toBe(false);
  await enterAuthoredDashboard(page);
}

async function chartReady(target, chart) {
  await target.scrollIntoViewIfNeeded();
  const ledger = target.locator("[data-canonical-runtime-ledger]");
  await expect(ledger).toBeVisible();
  await expect.poll(async () => JSON.parse(await ledger.getAttribute("data-canonical-runtime-ledger")))
    .toMatchObject({ panelId: chart.id, render: { status: chart.typeId === "freeText" ? null : "ready", resolution: "available", typeId: chart.typeId } });
  if (chart.typeId === "freeText") {
    await expect(target.locator('[data-static-content-kind="freeText"]')).toHaveAttribute("data-static-source-id", chart.sourceId);
    await expect(target.locator(".free-text-chart-view__content")).not.toHaveText("");
    await expect(target.locator("[data-static-failure]")).toHaveCount(0);
  }
  await expect(target.getByRole("heading", { name: chart.title, exact: true })).toBeVisible();
}

async function audienceChartsAt(audience, ids, epoch) {
  const date = new Date(epoch).toISOString().slice(0, 10);
  await expect(audience.locator("[data-displayed-chart-id]")).toHaveCount(ids.length);
  for (const id of ids) {
    const target = audience.locator(`[data-displayed-chart-id="${id}"]`);
    const chart = charts.find((entry) => entry.chart.id === id).chart;
    await chartReady(target, chart);
    await expect(target.locator("[data-chart-active-date]")).toHaveAttribute("data-chart-active-date", date);
    await expect.poll(async () => JSON.parse(await target.locator("[data-canonical-runtime-ledger]").getAttribute("data-canonical-runtime-ledger")))
      .toMatchObject({ time: { activeEpochMs: epoch } });
  }
}

function observeErrors(page, errors = []) {
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
