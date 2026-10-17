import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { enterAuthoredDashboard, openDashboardPage } from "./support/landingWorkflow.js";
import { openAudienceSession } from "./support/present-audience-workflow.js";

const shipped = JSON.parse(await readFile(new URL("../../public/config/dashboard.json", import.meta.url), "utf8"));
const charts = shipped.pages.flatMap((page) => page.sections.flatMap((section) =>
  section.panels.map((placement) => ({ pageId: page.id, chart: placement.chart ?? placement }))));
const representatives = [...new Map(charts.map((entry) => [entry.chart.typeId, entry])).values()];
const mode = (page, name) => page.getByLabel("Dashboard mode").getByRole("button", { name, exact: true });
const panel = (page, id) => page.locator(`[data-panel-id="${id}"]`);
const iso = (date) => `${date}T00:00:00.000Z`;

test.use({ viewport: { width: 1440, height: 1000 }, storageState: { cookies: [], origins: [] } });

test("selected shipped content renders every authored chart type without a fixture", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = observeErrors(page);
  await openShipped(page);
  expect(representatives).toHaveLength(15);
  for (const { pageId, chart } of representatives) {
    await openDashboardPage(page, pageId);
    await chartReady(panel(page, chart.id), chart);
  }
  expect(errors).toEqual([]);
});

test("selected shipped Chrono groups retain authored periods and synchronize every member", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = observeErrors(page);
  await openShipped(page);
  await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  const controls = page.getByRole("region", { name: "Chrono playback controls" });
  for (const group of shipped.chronoGroups) {
    await page.getByRole("combobox", { name: "Chrono Group", exact: true }).selectOption(group.id);
    await expect(controls.getByRole("combobox", { name: "Chrono chart scope" })).toHaveValue("group-only");
    await expect(page.locator("[data-panel-id]")).toHaveCount(group.members.length);
    const frame = controls.getByRole("slider", { name: "Playback frame" });
    await expect(frame).toHaveAttribute("min", String(Date.parse(iso(group.period.start))));
    await expect(frame).toHaveAttribute("max", String(Date.parse(iso(group.period.end))));
    await expect(controls.locator("time")).toHaveAttribute("datetime", iso(group.period.start));
    await controls.getByRole("button", { name: "Next frame", exact: true }).click();
    const nextDate = await controls.locator("time").getAttribute("datetime");
    expect(nextDate).not.toBe(iso(group.period.start));
    for (const member of group.members) {
      const chart = charts.find((entry) => entry.chart.id === member.chartId).chart;
      await chartReady(panel(page, chart.id), chart);
      await expect(panel(page, chart.id).locator("[data-chart-active-date]")).toHaveAttribute("data-chart-active-date", nextDate.slice(0, 10));
    }
    await controls.getByRole("button", { name: "Play Chrono", exact: true }).click();
    await expect(controls.locator("time")).not.toHaveAttribute("datetime", nextDate);
    await controls.getByRole("button", { name: "Pause Chrono", exact: true }).click();
    const pausedDate = await controls.locator("time").getAttribute("datetime");
    await page.waitForTimeout(1_200); // Longer than the authored one-second cadence: assert pause stability.
    await expect(controls.locator("time")).toHaveAttribute("datetime", pausedDate);
    await frame.fill(String(Date.parse(iso(group.period.end))));
    await expect(controls.locator("time")).toHaveAttribute("datetime", iso(group.period.end));
    await expect(controls.getByRole("button", { name: "Next frame", exact: true })).toBeDisabled();
    await controls.getByRole("button", { name: "Previous frame", exact: true }).click();
    await expect(controls.locator("time")).not.toHaveAttribute("datetime", iso(group.period.end));
  }
  expect(errors).toEqual([]);
});

test("Whole page opens latest temporal observations and keeps Collection snapshots outside synchronization", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = observeErrors(page);
  await openShipped(page);
  await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  const controls = page.getByRole("region", { name: "Chrono playback controls" });
  await controls.getByRole("combobox", { name: "Chrono source" }).selectOption("page:");
  const frame = controls.getByRole("slider", { name: "Playback frame" });
  await expect(controls.getByRole("combobox", { name: "Chrono chart scope" })).toHaveValue("all-page");
  await expect.poll(() => frame.inputValue()).toBe(await frame.getAttribute("max"));
  const biomedical = charts.filter(({ pageId }) => pageId === "biomedical");
  await expect(page.locator("[data-panel-id]")).toHaveCount(biomedical.length);
  for (const id of ["bio_confirmed_cases", "bio_hospital_capacity_bullet", "bio_vaccination_current", "bio_municipality_aggregate"]) {
    const chart = charts.find((entry) => entry.chart.id === id)?.chart;
    expect(chart).toBeDefined();
    const target = panel(page, id);
    await chartReady(target, chart);
    if (chart.presentation?.collection) {
      const ledger = JSON.parse(await target.locator("[data-canonical-runtime-ledger]").getAttribute("data-canonical-runtime-ledger"));
      expect(ledger.time?.activeEpochMs ?? null).toBeNull();
    }
    await expect(target).not.toContainText(/No measurement at this time|does not have a bound temporal role/);
  }
  await expect(page.getByText("This synchronized chart does not have a bound temporal role.", { exact: true })).toHaveCount(0);
  // Seeking before the national data begins must retain a truthful missing state.
  await frame.fill(await frame.getAttribute("min"));
  await expect(panel(page, "bio_confirmed_cases")).toContainText("No measurement at this time");
  await chartReady(panel(page, "bio_hospital_capacity_bullet"), charts.find(({ chart }) => chart.id === "bio_hospital_capacity_bullet").chart);
  // Both source selectors must restore group scope after Whole page.
  await controls.getByRole("combobox", { name: "Chrono source" }).selectOption("group:national_outbreak");
  await expect(controls.getByRole("combobox", { name: "Chrono chart scope" })).toHaveValue("group-only");
  await expect(page.locator("[data-panel-id]")).toHaveCount(5);
  expect(errors).toEqual([]);
});

test("selected shipped groups play pause seek and change period in a real Audience display", async ({ page }) => {
  // Cold hydration and both authored periods share this journey budget;
  // individual readiness, connection and playback assertions keep their limits.
  test.setTimeout(180_000);
  const errors = observeErrors(page);
  await openShipped(page);
  await mode(page, "Present").click();
  await page.getByRole("button", { name: "Chrono Groups", exact: true }).click();
  const controller = page.getByRole("region", { name: "Presenter controller" });
  const source = controller.getByRole("combobox", { name: "Presentation source" });
  const seek = controller.getByRole("slider", { name: "Presentation time" });
  const municipal = shipped.chronoGroups.find(({ id }) => id === "municipal_outbreak");
  const national = shipped.chronoGroups.find(({ id }) => id === "national_outbreak");
  await source.selectOption(`group:${municipal.id}`);
  for (const { chartId } of municipal.members) await page.locator(`[data-presentable-item-id="${chartId}"]`).getByRole("checkbox").check();
  // The source server can still be loading the popup graph when the page event
  // fires. Establish its destination and DOM before timing the connection.
  page.context().once("page", (popup) => observeErrors(popup, errors));
  const { popup: audience } = await openAudienceSession(page, { waitForBaseline: false });
  // Audience hydrates the full shipped dashboard before starting its channel.
  // DOMContentLoaded alone also admits the bootstrap waiting surface.
  await expect(audience.locator(".audience-theme-root")).toBeVisible({ timeout: 45_000 });
  const output = audience.locator(".audience-display");
  await expect(output).toHaveAttribute("data-connection-status", "connected");
  await expect(output).toHaveAttribute("data-output-mode", "active");
  for (const group of [municipal, national]) {
    if (group.id !== municipal.id) {
      for (const { chartId } of municipal.members) await page.locator(`[data-presentable-item-id="${chartId}"]`).getByRole("checkbox").uncheck();
      await source.selectOption(`group:${group.id}`);
      // Present permits four simultaneous charts. Exercise the group's line, bar, mixed and admissions members.
      for (const chartId of ["bio_confirmed_cases", "bio_daily_cases_bar", "bio_new_cases_deaths", "bio_admissions"]) {
        await page.locator(`[data-presentable-item-id="${chartId}"]`).getByRole("checkbox").check();
      }
    }
    await seek.fill("0");
    await expect(output).toHaveAttribute("data-frame-index", "0");
    const displayed = group.id === municipal.id ? municipal.members.map(({ chartId }) => chartId)
      : ["bio_confirmed_cases", "bio_daily_cases_bar", "bio_new_cases_deaths", "bio_admissions"];
    await audienceChartsAt(audience, displayed, group.period.start);
    await controller.getByRole("button", { name: "Play", exact: true }).click();
    await expect.poll(async () => Number(await output.getAttribute("data-frame-index"))).toBeGreaterThan(0);
    await controller.getByRole("button", { name: "Pause", exact: true }).click();
    const pausedIndex = await seek.inputValue();
    await expect(output).toHaveAttribute("data-frame-index", pausedIndex);
    await page.waitForTimeout(1_200);
    await expect(seek).toHaveValue(pausedIndex);
    await expect(output).toHaveAttribute("data-frame-index", pausedIndex);
    const lastIndex = await seek.getAttribute("max");
    await seek.fill(lastIndex);
    await expect(output).toHaveAttribute("data-frame-index", lastIndex);
    await audienceChartsAt(audience, displayed, group.period.end);
    await expect(controller.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    await controller.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(output).toHaveAttribute("data-frame-index", String(Number(lastIndex) - 1));
  }
  await expect(output).toHaveAttribute("data-render-status", "current");
  expect(errors).toEqual([]);
  const closed = audience.waitForEvent("close");
  await controller.getByRole("button", { name: "End presentation", exact: true }).click();
  await closed;
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
    .toMatchObject({ panelId: chart.id, render: { status: "ready", typeId: chart.typeId } });
  await expect(target.getByRole("heading", { name: chart.title, exact: true })).toBeVisible();
}

async function audienceChartsAt(audience, ids, date) {
  await expect(audience.locator("[data-displayed-chart-id]")).toHaveCount(ids.length);
  for (const id of ids) {
    const target = audience.locator(`[data-displayed-chart-id="${id}"]`);
    const chart = charts.find((entry) => entry.chart.id === id).chart;
    await chartReady(target, chart);
    await expect(target.locator("[data-chart-active-date]")).toHaveAttribute("data-chart-active-date", date);
    await expect.poll(async () => JSON.parse(await target.locator("[data-canonical-runtime-ledger]").getAttribute("data-canonical-runtime-ledger")))
      .toMatchObject({ time: { activeEpochMs: Date.parse(iso(date)) } });
  }
}

function observeErrors(page, errors = []) {
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
