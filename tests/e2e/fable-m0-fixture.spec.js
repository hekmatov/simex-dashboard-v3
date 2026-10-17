import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { choosePanelAction } from "./support/buildWorkflow.js";
import { enterAuthoredDashboard } from "./support/landingWorkflow.js";
import { resetSourceDashboard } from "./support/dashboardFixture.js";

const fixture = JSON.parse(await readFile(new URL("../fixtures/fable-m0-dashboard.json", import.meta.url), "utf8"));
const CASES_ID = "upload-cases-wcph-eldoria-3";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const originalBriefing = "Eldoria confirmed its first 2 cases";
const editedBriefing = "M0 saved briefing: exercise team ready.";
const mode = (page, name) => page.getByLabel("Dashboard mode").getByRole("button", { name, exact: true });
const panel = (page, id) => page.locator(`[data-panel-id="${id}"]`);

test.use({ viewport: { width: 1440, height: 1000 }, storageState: { cookies: [], origins: [] } });

test("M0 fixture launches, saves QMD through reload, reaches Present and resets without changing shipped files", async ({ page }) => {
  test.setTimeout(60_000);
  const shippedBefore = await shippedDigests();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await resetSourceDashboard(page, { fixture: "fable-m0" });
  await expect(page.locator('[data-canonical-mode="view"]')).toBeVisible();
  await expect(page.locator('[data-canonical-page-id="m0-dashboard"]')).toBeVisible();
  expect(await page.request.get("/config/dashboard.json").then((response) => response.json())).toEqual(fixture);
  await expectChartReady(panel(page, "m0-cases"));
  await expectChartReady(panel(page, "m0-sectors"));
  const briefing = panel(page, "m0-briefing");
  await briefing.scrollIntoViewIfNeeded();
  await expect(briefing).toContainText(originalBriefing);
  await expectLoadedImage(panel(page, "m0-image"));

  await mode(page, "Build").click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
  await briefing.scrollIntoViewIfNeeded();
  await briefing.hover();
  await choosePanelAction(page, "m0-briefing", "edit");
  await page.locator(".chart-quick-editor").getByRole("button", { name: "Open full editor", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Text/Image editor" });
  await expect(editor.getByLabel("Portable QMD Composer editing area")).toBeVisible();
  await editor.getByRole("button", { name: "Raw text", exact: true }).click();
  await editor.getByLabel("Portable QMD raw source").fill(editedBriefing);
  await editor.getByRole("button", { name: "Continue", exact: true }).click();
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(briefing).toContainText(editedBriefing);
  await expect.poll(() => page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    return saved?.dataSources?.["m0-briefing-source"]?.qmd;
  }, STORAGE_KEY)).toBe(editedBriefing);
  await page.reload();
  await briefing.scrollIntoViewIfNeeded();
  await expect(briefing).toContainText(editedBriefing);

  await mode(page, "Present").click();
  await expect(mode(page, "Present")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "Choose charts for the audience scene" })).toBeVisible();
  for (const id of ["m0-cases", "m0-sectors", "m0-image"]) {
    await expect(page.locator(`[data-presentable-item-id="${id}"]`).getByRole("checkbox")).toBeEnabled();
  }
  await expect(page.locator('[data-presentable-item-id="m0-briefing"]')).toHaveCount(0);
  const selection = page.locator('[data-presentable-item-id="m0-image"]').getByRole("checkbox");
  await selection.check();
  await expect(selection).toBeChecked();

  await resetSourceDashboard(page, { fixture: "fable-m0" });
  await briefing.scrollIntoViewIfNeeded();
  await expect(briefing).toContainText(originalBriefing);
  await expect(briefing).not.toContainText(editedBriefing);
  await expect(mode(page, "View")).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  expect(await shippedDigests()).toEqual(shippedBefore);
  expect(errors).toEqual([]);
});

test("M0 missing fixture source shows visible recovery while other content stays usable", async ({ page }) => {
  await page.route(`**/${fixture.dataSources[CASES_ID].path}`, (route) => route.fulfill({ status: 404, body: "Missing fixture source" }));
  await resetSourceDashboard(page, { fixture: "fable-m0" });
  const unavailable = panel(page, "m0-cases").locator('figure[data-chart-state="error"]');
  await expect(unavailable).toBeVisible();
  await expect(unavailable).toContainText("Couldn’t load Fixture cases");
  await expectChartReady(panel(page, "m0-sectors"));
  await mode(page, "Build").click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
  await panel(page, "m0-briefing").scrollIntoViewIfNeeded();
  await expect(panel(page, "m0-briefing")).toContainText(originalBriefing);
});

test("M0 default harness launches the actual shipped dashboard without fixture selection", async ({ page }) => {
  const shipped = JSON.parse(await readFile(new URL("../../public/config/dashboard.json", import.meta.url), "utf8"));
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  expect(await page.request.get("/config/dashboard.json").then((response) => response.json())).toEqual(shipped);
  expect((await page.context().cookies()).some(({ name }) => name === "simex-e2e-fixture")).toBe(false);
  await enterAuthoredDashboard(page);
  await expect(page.locator(`[data-canonical-page-id="${shipped.pages[0].id}"]`)).toBeVisible();
  const firstChart = shipped.pages[0].sections.flatMap((section) => section.panels)
    .map((placement) => placement.chart ?? placement)[0];
  await expectChartReady(panel(page, firstChart.id));
  expect(errors).toEqual([]);
});

async function expectChartReady(target) {
  await target.scrollIntoViewIfNeeded();
  const ledger = target.locator("[data-canonical-runtime-ledger]");
  await expect(ledger).toBeVisible();
  await expect.poll(async () => JSON.parse(await ledger.getAttribute("data-canonical-runtime-ledger")))
    .toMatchObject({ render: { status: "ready" } });
}

async function expectLoadedImage(target) {
  await target.scrollIntoViewIfNeeded();
  const image = target.locator("img");
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
}

async function shippedDigests() {
  const paths = ["config/dashboard.json", "config/dataset-profiles.json",
    ...Object.values(fixture.dataSources).flatMap((source) => source.path ? [source.path] : []),
    ...Object.values(fixture.contentLibrary.mediaItems).map((item) => item.current.path),
  ];
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path,
    createHash("sha256").update(await readFile(new URL(`../../public/${path}`, import.meta.url))).digest("hex"),
  ])));
}
