import { expect, test } from "@playwright/test";
import { timeCursor } from "./support/time-cursor-workflow.js";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { REMOVED_PAGE_GROUP_ID, withPageRemovalGroups, installPageRemovalGroups } from "./support/layoutReviewFixture.js";
import { openAudienceSession } from "./support/present-audience-workflow.js";

import { parseCsvText } from "../../src/lib/loadCsv.js";
import { buildStorylineCoverage } from "../../src/components/time/storylineAuthoring.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request, page }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
  await page.setViewportSize({ width: 1200, height: 900 });
  await installPageRemovalGroups(page);
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
});

test("005-storyline-authoring: native coverage evidence, matching validation and footer remain usable at desktop and tablet", async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await readTemporalFixture(page, { loadRows: true });
  const seed = fixture.scenes.find(scene => scene.id === REMOVED_PAGE_GROUP_ID);
  const expectedCoverage = buildStorylineCoverage(fixture, seed.period, { calendarPeriod: true }).find(candidate => candidate.id === seed.members[0].chartId);
  expect(expectedCoverage.reason).toBe("");
  expect(expectedCoverage.inWindowCount).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Storyline Studio", exact: true }).click();
  const auxiliary = page.getByRole("dialog", { name: "Storyline Studio authoring", exact: true });
  await expect(auxiliary.getByRole("heading", { name: "Storyline Studio", exact: true })).toBeVisible();
  await auxiliary.getByRole("button", { name: new RegExp(seed.name) }).click();
  await expect(auxiliary.getByRole("button", { name: "Back to Storyline Studio", exact: true })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Edit", exact: true }).click();
  const stages = auxiliary.getByRole("navigation", { name: "Storyline authoring stages", exact: true });
  await expect(stages.getByRole("button")).toHaveCount(3);
  await expect(stages.getByRole("button")).toContainText(["Storyline details", "Select charts and frames", "Arrange and configure"]);
  await expect(auxiliary.getByRole("radio", { name: "All member observations", exact: true })).toBeChecked();
  await stages.getByRole("button", { name: /Select charts and frames/ }).click();
  const picker = auxiliary.getByRole("region", { name: "Storyline chart coverage", exact: true });
  const row = picker.locator(".storyline-coverage-row").filter({ has: page.getByRole("checkbox", { name: expectedCoverage.title, exact: true }) });
  await expect(row).toContainText(`${expectedCoverage.inWindowCount} observations in period (${expectedCoverage.count} total)`);
  await expect(row.locator(".storyline-coverage-track i")).toHaveCount(expectedCoverage.inWindowCount);
  await row.getByRole("button", { name: "Inspect observations", exact: true }).click();
  const observations = page.getByRole("dialog", { name: new RegExp("observations$") });
  await expect(observations.getByRole("checkbox")).toHaveCount(expectedCoverage.count);
  await expect(observations.getByRole("checkbox").first()).toHaveAccessibleName(new Date(expectedCoverage.epochs[0]).toISOString());
  await observations.getByRole("button", { name: "Close", exact: true }).click();
  // Filters retain the selected members even when their rows are hidden.
  await picker.getByLabel("Search charts", { exact: true }).fill("does-not-match-a-chart");
  await expect(picker.getByText("No temporal charts match these filters.", { exact: true })).toBeVisible();
  await expect(picker.getByRole("status").first()).toContainText(`${seed.members.length} selected`);
  await picker.getByLabel("Search charts", { exact: true }).fill("");
  await expect(row.getByRole("checkbox")).toBeChecked();
  // Membership cannot become empty through the final remaining checkbox.
  const other = seed.members[1];
  const charts = fixture.pages.flatMap(p => p.sections.flatMap(s => s.panels.map(p => p.chart ?? p)));
  const second = picker.getByRole("checkbox", { name: charts.find(chart => chart.id === other.chartId).title, exact: true });
  await second.uncheck();
  await expect(row.getByRole("checkbox")).toBeDisabled();
  await second.check();
  await stages.getByRole("button", { name: /Storyline details/ }).click();
  const matching = auxiliary.getByRole("combobox", { name: "Default matching", exact: true });
  await expect(matching).toBeVisible();
  expect(await matching.locator("option").evaluateAll(options => options.filter(option => option.value !== "authored").map(option => option.value))).toEqual(["exact", "lastKnown", "nearest", "interpolate"]);
  await matching.selectOption("nearest");
  const bound = auxiliary.getByRole("spinbutton", { name: /^Default matching maximum distance \(hours\)/ });
  await bound.fill("-1");
  await auxiliary.getByRole("button", { name: "Save Storyline", exact: true }).click();
  await expect(auxiliary.getByRole("alert")).toContainText(/non-negative|tolerance|distance/i);
  await bound.fill("2");
  await auxiliary.getByLabel("Seconds per frame", { exact: true }).fill("0.75");
  await expect(auxiliary.locator(".scene-transaction-footer").getByText("Save readiness", { exact: true })).toBeVisible();
  await stages.getByRole("button", { name: /Arrange and configure/ }).click();
  await expect(auxiliary.locator(".scene-arrangement-board")).toHaveCount(2);
  const clearance = () => auxiliary.evaluate(node => {
    const body = node.querySelector(".scene-studio__main").getBoundingClientRect();
    const footer = node.querySelector(".scene-transaction-footer").getBoundingClientRect();
    return { gap: footer.top - body.bottom, bodyHeight: body.height };
  });
  expect((await clearance()).gap).toBeGreaterThanOrEqual(-1);
  await page.setViewportSize({ width: 1280, height: 720 });
  expect((await clearance()).gap).toBeGreaterThanOrEqual(-1);
  expect((await clearance()).bodyHeight).toBeGreaterThanOrEqual(250);
  await page.setViewportSize({ width: 768, height: 1024 });
  const geometry = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, footerVisible: Boolean(document.querySelector(".scene-transaction-footer")?.getBoundingClientRect().height) }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.footerVisible).toBe(true);
  await page.setViewportSize({ width: 1200, height: 900 });
  await auxiliary.getByRole("button", { name: "Discard Storyline", exact: true }).click();
  await expect(auxiliary.getByRole("heading", { name: seed.name, exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("simex-dashboard-config-v3-three-mode-v1")));
  expect(saved.scenes.find(scene => scene.id === seed.id)).toEqual(seed);
});

test("012-storyline-studio: direct reopening starts on All pages and does not hide saved Storylines", async ({ page }) => {
  await page.getByRole("button", { name: "Storyline Studio", exact: true }).click();
  const auxiliary = page.getByRole("dialog", { name: "Storyline Studio authoring" });
  await expect(auxiliary.getByLabel("Page")).toHaveValue("");
  const count = auxiliary.locator(".temporal-studio__count");
  await expect(count).not.toHaveText(/Showing 0 of [1-9]/);
  await expect(auxiliary.locator("[data-action='open-content']").first()).toBeVisible();
});

test("005-storyline-suspension: closing an unfinished create draft exposes Resume without locking Build pages", async ({ page }) => {
  await page.getByRole("button", { name: "Storyline Studio", exact: true }).click();
  const auxiliary = page.getByRole("dialog", { name: "Storyline Studio authoring" });
  await auxiliary.getByRole("button", { name: "Create Storyline", exact: true }).click();
  await auxiliary.getByRole("textbox", { name: "Storyline name" }).fill("Unfinished response group");

  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();
  await expect(auxiliary).toBeHidden();
  const pendingWork = page.getByRole("navigation", { name: "Pending Build work" });
  const resumeDraft = pendingWork.getByRole("button", { name: "Resume Storyline Studio changes", exact: true });
  await expect(resumeDraft).toBeVisible();

  const pageNavigation = page.locator(".dashboard-command-page-scroller");
  const socioEconomic = pageNavigation.getByRole("button", { name: "Socio-economic", exact: true });
  await expect(socioEconomic).toBeEnabled();
  await socioEconomic.click();
  await expect(socioEconomic).toHaveAttribute("aria-current", "page");

  await resumeDraft.click();
  await expect(auxiliary).toBeVisible();
  await expect(auxiliary.getByRole("textbox", { name: "Storyline name" })).toHaveValue("Unfinished response group");
});

test("006-storyline-authoring: three full-width stages and Unit Orbit are live", async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await readTemporalFixture(page);
  const seed = fixture.scenes.find(scene => scene.id === REMOVED_PAGE_GROUP_ID);
  const sceneName = "Runtime composition fidelity Storyline";
  await page.locator('[data-build-command-action="scene-studio"]').click();
  const auxiliary = page.getByRole("dialog", { name: "Storyline Studio authoring" });
  await auxiliary.getByRole("button", { name: "Create Storyline", exact: true }).click();

  const details = auxiliary.locator(".scene-details-stage");
  await expect(details).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: /Storyline details/ })).toHaveAttribute("aria-current", "step");
  await expect(details.getByRole("textbox", { name: "Storyline name" })).toBeVisible();
  await details.getByRole("textbox", { name: "Storyline name" }).fill(sceneName);
  await details.getByRole("radio", { name: "All member observations", exact: true }).check();
  await details.getByLabel("Start date", { exact: true }).fill(seed.period.start.slice(0, 10));
  await details.getByLabel("End date", { exact: true }).fill(seed.period.end.slice(0, 10));
  await details.getByLabel("Seconds per frame", { exact: true }).fill("0.75");
  for (const label of ["Owning page", "Default matching"]) await expect(details.getByRole("combobox", { name: label })).toBeVisible();
  await expect(details.getByRole("spinbutton", { name: "Seconds per frame" })).toBeVisible();
  await expect(details.getByLabel("Start date")).toBeVisible();
  await expect(details.getByLabel("End date")).toBeVisible();
  await details.getByRole("radio", { name: "Calendar interval", exact: true }).check();
  await expect(details.getByRole("spinbutton", { name: "Calendar interval value" })).toBeVisible();
  await expect(details.getByRole("combobox", { name: "Calendar interval unit" })).toBeVisible();
  await details.getByRole("radio", { name: "All member observations", exact: true }).check();
  for (const label of ["Period", "Time mode"]) await expect(details.getByText(label, { exact: true })).toBeVisible();
  await expect(auxiliary.locator(".scene-transaction-footer").getByText("Save readiness", { exact: true })).toBeVisible();

  await auxiliary.getByRole("button", { name: /Select charts and frames/ }).click();
  await expect(auxiliary.getByRole("button", { name: /Select charts and frames/ })).toHaveAttribute("aria-current", "step");
  await expect(auxiliary.locator(".storyline-coverage-row").first()).toContainText("observations in period");
  await expect(auxiliary.locator(".storyline-coverage-track").first()).toBeVisible();
  await selectExactMembers(auxiliary, fixture, seed.members.map(member => member.chartId));
  const selectWidth = await auxiliary.locator(".scene-stage-body[data-stage='select']").evaluate((node) => ({
    stage: node.getBoundingClientRect().width,
    workspace: node.closest(".scene-studio__workspace").getBoundingClientRect().width,
    hasSidebar: Boolean(node.closest(".scene-studio")?.querySelector(".scene-draft-panel")),
  }));
  expect(selectWidth.stage / selectWidth.workspace).toBeGreaterThan(0.95);
  expect(selectWidth.hasSidebar).toBe(false);

  await auxiliary.getByRole("button", { name: /Arrange and configure/ }).click();
  await expect(auxiliary.getByRole("button", { name: /Arrange and configure/ })).toHaveAttribute("aria-current", "step");
  const boards = auxiliary.locator(".scene-arrangement-board");
  await expect(boards).toHaveCount(2);
  await expect(boards.nth(0).locator(".chart-view-frame")).toHaveCount(2);
  await expect(boards.nth(1).locator(".chart-view-frame")).toHaveCount(2);
  await expect(auxiliary.getByText("Storyline preview frame", { exact: false })).toBeVisible();
  const widths = await boards.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));
  expect(Math.abs(widths[0] - widths[1])).toBeLessThanOrEqual(2);
  await expect(auxiliary.getByRole("button", { name: /Drop (before|after)/ }).first()).toBeAttached();
  await expect(auxiliary.locator(".scene-present-corner-action").first()).toBeVisible();
  await auxiliary.locator(".scene-arrangement-board[data-board='scene'] .scene-chart-title").first().click();
  const orbitShell = page.locator(".unit-orbit:has(.scene-unit-orbit)");
  const orbit = orbitShell.locator(".scene-unit-orbit");
  await expect(orbitShell).toBeVisible();
  await expect(orbit).toContainText("Unit Orbit");
  const readOrbitRelationship = () => page.evaluate(() => {
    const selectedChart = document.querySelector(
      ".scene-arrangement-board[data-board='scene'] .scene-view-composition-cell:has(.scene-chart-authoring-overlay[data-selected='true'])",
    );
    const orbitNode = [...document.querySelectorAll(".unit-orbit")]
      .find((node) => node.querySelector(".scene-unit-orbit"));
    const chartRect = selectedChart?.getBoundingClientRect();
    const orbitRect = orbitNode?.getBoundingClientRect();
    const visibleChartHeight = chartRect
      ? Math.max(0, Math.min(chartRect.bottom, window.innerHeight) - Math.max(chartRect.top, 0))
      : 0;
    return {
      visibleChartHeight,
      orbitInsideViewport: Boolean(
        orbitRect
        && orbitRect.top >= 0
        && orbitRect.left >= 0
        && orbitRect.right <= window.innerWidth
        && orbitRect.bottom <= window.innerHeight,
      ),
      overlap: Boolean(
        chartRect
        && orbitRect
        && orbitRect.left < chartRect.right
        && orbitRect.right > chartRect.left
        && orbitRect.top < chartRect.bottom
        && orbitRect.bottom > chartRect.top,
      ),
    };
  });
  await expect.poll(readOrbitRelationship).toMatchObject({
    orbitInsideViewport: true,
    overlap: false,
  });
  const orbitRelationship = await readOrbitRelationship();
  expect(orbitRelationship.visibleChartHeight).toBeGreaterThanOrEqual(240);
  await expect(orbit.getByText("Include in Present", { exact: true })).toBeVisible();
  await expect(orbit.getByRole("button", { name: "Move first" })).toBeVisible();
  await orbit.getByRole("radio", { name: "1", exact: true }).check();
  await boards.nth(0).locator(".scene-chart-title").last().click();
  await orbit.getByRole("radio", { name: "3", exact: true }).check();
  await orbit.getByRole("button", { name: "Move first" }).click();
  await boards.nth(1).locator(".scene-chart-title").last().click();
  await orbit.getByRole("button", { name: "Move first" }).click();
  await boards.nth(1).locator("select").selectOption("horizontal-divider");
  await orbit.getByRole("button", { name: "Done", exact: true }).click();
  await expect(orbitShell).toBeHidden();
  await expect(auxiliary.locator(".scene-draft-panel")).toHaveCount(0);

  await page.setViewportSize({ width: 1600, height: 900 });
  const fullWidthGeometry = await auxiliary.evaluate((node) => {
    const dialog = node.getBoundingClientRect();
    const sceneBoard = node.querySelector('.scene-arrangement-board[data-board="scene"]').getBoundingClientRect();
    const presentBoard = node.querySelector('.scene-arrangement-board[data-board="present"]').getBoundingClientRect();
    const canonicalCanvasMax = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--simex-canonical-canvas-max-width"),
    );
    return {
      viewportWidth: window.innerWidth,
      dialogLeft: dialog.left,
      dialogRight: dialog.right,
      dialogWidth: dialog.width,
      sceneWidth: sceneBoard.width,
      sceneBottom: sceneBoard.bottom,
      presentWidth: presentBoard.width,
      presentTop: presentBoard.top,
      canonicalCanvasMax,
    };
  });
  expect(fullWidthGeometry.dialogLeft).toBeLessThanOrEqual(17);
  expect(fullWidthGeometry.viewportWidth - fullWidthGeometry.dialogRight).toBeLessThanOrEqual(17);
  expect(fullWidthGeometry.dialogWidth).toBeGreaterThanOrEqual(fullWidthGeometry.viewportWidth - 34);
  expect(fullWidthGeometry.sceneWidth).toBeGreaterThanOrEqual(fullWidthGeometry.canonicalCanvasMax - 2);
  expect(fullWidthGeometry.sceneWidth).toBeLessThanOrEqual(fullWidthGeometry.canonicalCanvasMax + 2);
  expect(Math.abs(fullWidthGeometry.sceneWidth - fullWidthGeometry.presentWidth)).toBeLessThanOrEqual(2);
  expect(fullWidthGeometry.presentTop).toBeGreaterThanOrEqual(fullWidthGeometry.sceneBottom + 13);

  const arrangeWidth = await auxiliary.locator(".scene-stage-body[data-stage='arrange']").evaluate((node) => ({
    stage: node.getBoundingClientRect().width,
    workspace: node.closest(".scene-studio__workspace").getBoundingClientRect().width,
  }));
  expect(arrangeWidth.stage / arrangeWidth.workspace).toBeGreaterThan(0.95);

  await page.setViewportSize({ width: 768, height: 1024 });
  const tabletGeometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    transactionFooterVisible: Boolean(document.querySelector(".scene-transaction-footer")?.getBoundingClientRect().height),
    boardsVisible: document.querySelectorAll(".scene-arrangement-board").length === 2,
  }));
  expect(tabletGeometry.scrollWidth).toBeLessThanOrEqual(tabletGeometry.clientWidth);
  expect(tabletGeometry.transactionFooterVisible).toBe(true);
  expect(tabletGeometry.boardsVisible).toBe(true);

  await page.setViewportSize({ width: 1200, height: 900 });
  const authoringSceneGeometry = await boards.nth(0).locator("[data-scene-chart-id]").evaluateAll((cells) => cells.map((cell) => {
    const rect = cell.getBoundingClientRect();
    return {
      id: cell.getAttribute("data-scene-chart-id"),
      width: cell.getAttribute("data-scene-width"),
      left: Math.round(rect.left),
      top: Math.round(rect.top),
    };
  }));
  const authoringPresentIds = await boards.nth(1).locator("[data-displayed-chart-id]").evaluateAll((cells) => cells.map((cell) => cell.getAttribute("data-displayed-chart-id")));
  await auxiliary.getByRole("button", { name: "Save Storyline", exact: true }).click();
  await expect(auxiliary.getByRole("heading", { name: sceneName, exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(name => JSON.parse(localStorage.getItem("simex-dashboard-config-v3-three-mode-v1")).scenes.find(scene => scene.name === name)?.secondsPerFrame, sceneName)).toBe(0.75);
  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await timeCursor(page).selectScope({ name: sceneName });
  await timeCursor(page).seekFrameIndex(0);
  const viewComposition = page.locator('[data-scene-composition-surface="view-scene"]');
  await expect(viewComposition.locator(".chart-view-frame")).toHaveCount(2);
  const viewSceneGeometry = await viewComposition.locator("[data-scene-chart-id]").evaluateAll((cells) => cells.map((cell) => ({
    id: cell.getAttribute("data-scene-chart-id"),
    width: cell.getAttribute("data-scene-width"),
  })));
  expect(viewSceneGeometry).toEqual(authoringSceneGeometry.map(({ id, width }) => ({ id, width })));
  await expect(page.locator(".scene-chart-authoring-overlay")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Chart comparison" })).toHaveCount(0);

  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click();
  const presentSource = timeCursor(page).scope;
  await expect(presentSource.locator("option:checked")).toHaveText(sceneName);
  await timeCursor(page).selectScope({ name: sceneName });
  await expect(page.locator(".present-workspace")).not.toHaveAttribute("data-active-scene-id", "");
  await expect(page.locator(".present-selected-chart")).toHaveCount(2);
  const presentIds = await page.locator(".present-selected-chart").evaluateAll((cells) => cells.map((cell) => cell.getAttribute("data-displayed-chart-id")));
  expect(presentIds).toEqual(authoringPresentIds);
  await expect(page.getByLabel("Storyline layout")).toHaveValue("overUnder");
  await page.getByLabel("Storyline layout").selectOption("sideBySide");
  const { popup } = await openAudienceSession(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.getByLabel("Storyline layout")).toHaveValue("sideBySide");

  await popup.close();
  await expect(page.getByRole("button", { name: "Open audience display", exact: true })).toBeVisible();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click();
  await timeCursor(page).selectScope({ kind: "page" });
  await timeCursor(page).selectScope({ name: sceneName });
  await expect(page.getByLabel("Storyline layout")).toHaveValue("overUnder");
  await expect(page.locator(".scene-chart-authoring-overlay")).toHaveCount(0);
});

test("012-temporal-content: native library filtering, cancel, duplicate and draft context are retained", async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await readTemporalFixture(page);
  const seed = fixture.scenes.find(scene => scene.id === REMOVED_PAGE_GROUP_ID);
  await page.locator('[data-build-command-action="scene-studio"]').click();
  const auxiliary = page.getByRole("dialog", { name: "Storyline Studio authoring", exact: true });
  await expect(auxiliary.getByRole("searchbox", { name: "Search", exact: true })).toBeVisible();
  for (const name of ["Status", "Page"]) {
    await expect(auxiliary.getByRole("combobox", { name, exact: true })).toBeVisible();
  }
  await expect(auxiliary.getByText(`Showing ${fixture.scenes.length} of ${fixture.scenes.length}`, { exact: true })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Create Storyline", exact: true }).click();
  const name = "Fidelity response Storyline";
  await auxiliary.getByRole("textbox", { name: "Storyline name", exact: true }).fill(name);
  await auxiliary.getByRole("radio", { name: "All member observations", exact: true }).check();
  await auxiliary.getByRole("button", { name: /Select charts and frames/ }).click();
  await selectExactMembers(auxiliary, fixture, seed.members.map(member => member.chartId));
  await auxiliary.getByRole("button", { name: "Save Storyline", exact: true }).click();
  await expect(auxiliary.getByRole("heading", { name, exact: true })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Back to Storyline Studio", exact: true }).click();
  const query = name.slice(0, 8);
  await auxiliary.getByLabel("Search", { exact: true }).fill(query);
  await expect(auxiliary.locator("[data-action='open-content']")).toHaveCount(1);
  await auxiliary.locator("[data-action='open-content']").click();
  for (const action of ["Edit", "Duplicate", "Remove"]) await expect(auxiliary.getByRole("button", { name: action, exact: true })).toBeVisible();
  page.once("dialog", dialog => dialog.dismiss());
  await auxiliary.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(auxiliary.getByRole("heading", { name, exact: true })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Back to Storyline Studio", exact: true }).click();
  await expect(auxiliary.getByLabel("Search", { exact: true })).toHaveValue(query);
  await page.setViewportSize({ width: 768, height: 1024 });
  const libraryGeometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    searchVisible: Boolean(document.querySelector(".temporal-studio__filters")?.getBoundingClientRect().height),
  }));
  expect(libraryGeometry.scrollWidth).toBeLessThanOrEqual(libraryGeometry.clientWidth);
  expect(libraryGeometry.searchVisible).toBe(true);
  await page.setViewportSize({ width: 1200, height: 900 });
  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Storyline Studio", exact: true }).click();
  await expect(auxiliary.getByLabel("Search", { exact: true })).toHaveValue(query);
  await auxiliary.locator("[data-action='open-content']").click();
  await auxiliary.getByRole("button", { name: "Duplicate", exact: true }).click();
  const pendingName = "Suspended duplicate Storyline";
  await auxiliary.getByLabel("Storyline name", { exact: true }).fill(pendingName);
  await expect(auxiliary.locator('[data-scene-workflow-id="parent-chrono-group"]')).toHaveCount(0);
  await auxiliary.getByRole("button", { name: /Arrange and configure/ }).click();
  await expect(auxiliary.locator(".scene-arrangement-board")).toHaveCount(2);
  await expect(auxiliary.locator(".scene-arrangement-board").first().locator(".chart-view-frame")).toHaveCount(2);
  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Theme", exact: true })).toBeEnabled();
  const resume = page.getByRole("navigation", { name: "Pending Build work", exact: true }).getByRole("button", { name: "Resume Storyline Studio changes", exact: true });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(auxiliary.getByRole("button", { name: /Arrange and configure/ })).toHaveAttribute("aria-current", "step");
  await expect(auxiliary.locator(".scene-arrangement-board")).toHaveCount(2);
  await auxiliary.getByRole("button", { name: /Storyline details/ }).click();
  await expect(auxiliary.getByLabel("Storyline name", { exact: true })).toHaveValue(pendingName);
  await auxiliary.getByRole("button", { name: "Discard Storyline", exact: true }).click();
  await expect(auxiliary.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(resume).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("simex-dashboard-config-v3-three-mode-v1")));
  expect(saved.scenes.some(scene => scene.name === name)).toBe(true);
  expect(saved.scenes.some(scene => scene.name === pendingName)).toBe(false);
});

async function readTemporalFixture(page, { loadRows = false } = {}) {
  const response = await page.request.get("/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const fixture = withPageRemovalGroups(await response.json());
  if (loadRows) {
    fixture.loadedData = {};
    for (const [id, source] of Object.entries(fixture.dataSources)) {
      if (source.kind !== "csv") continue;
      const csv = await page.request.get(`/${source.path}`);
      expect(csv.ok(), source.path).toBe(true);
      fixture.loadedData[id] = parseCsvText(await csv.text());
    }
  }
  return fixture;
}

async function selectExactMembers(auxiliary, fixture, ids) {
  const charts = fixture.pages.flatMap(p => p.sections.flatMap(s => s.panels.map(p => p.chart ?? p)));
  const titles = ids.map(id => charts.find(chart => chart.id === id).title);
  const picker = auxiliary.getByRole("region", { name: "Storyline chart coverage", exact: true });
  for (const title of titles) await picker.getByRole("checkbox", { name: title, exact: true }).check();
  for (const checkbox of await picker.getByRole("checkbox").all()) {
    const title = await checkbox.evaluate(input => input.parentElement.textContent.trim());
    if (!titles.includes(title) && await checkbox.isChecked()) await checkbox.uncheck();
  }
  await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(ids.length);
}
