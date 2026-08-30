import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request, page }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
});

test("005-chrono-group-authoring: staged ledger and review remain usable at desktop and tablet", async ({ page }) => {
  test.setTimeout(120_000);
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  const auxiliary = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await expect(auxiliary.getByRole("heading", { name: "Chrono Studio", exact: true })).toBeVisible();
  await auxiliary.locator("[data-action='open-content']").first().click();
  await expect(auxiliary.getByRole("button", { name: "Back to Chrono Studio", exact: true })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Edit", exact: true }).click();

  const stages = auxiliary.getByRole("navigation", { name: "Chrono Group stages" });
  await expect(stages.getByRole("button")).toContainText(["Name and period", "Choose charts", "Set defaults", "Review"]);
  await expect(stages.getByRole("button")).toContainText(["Complete", "Complete", "Complete", "Complete"]);
  expect(await stages.getByRole("button").first().evaluate((node) => getComputedStyle(node).display)).toBe("grid");
  await stages.getByRole("button", { name: /Choose charts/ }).click();
  await expect(auxiliary.getByText(/inclusive/).first()).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: "Edit period", exact: true })).toBeVisible();
  await expect(auxiliary.getByRole("heading", { name: "Selected for this Chrono Group" })).toBeVisible();
  await expect(auxiliary.getByRole("heading", { name: "Needs attention" })).toHaveCount(0);
  await expect(auxiliary.getByRole("heading", { name: "Available", exact: true })).toBeVisible();
  const firstRecord = auxiliary.locator(".availability-record").first();
  expect(await firstRecord.locator(".availability-record__summary").evaluate((node) => getComputedStyle(node).display)).toBe("grid");
  await expect(firstRecord).toContainText(/Full chart range/);
  await expect(firstRecord).toContainText(/plotted variable/);
  const firstProofBand = firstRecord.locator(".availability-ticks").first();
  await firstProofBand.hover({ position: { x: 2, y: 12 } });
  const proofTooltip = firstRecord.getByRole("tooltip");
  await expect(proofTooltip).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
  expect(await proofTooltip.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  await firstRecord.getByText("Inspect evidence", { exact: true }).click();
  await expect(firstRecord).toContainText(/Other Chrono Groups/);
  await expect(firstRecord.locator(".availability-calendar")).toBeVisible();

  await stages.getByRole("button", { name: /Review/ }).click();
  for (const label of ["affected pages", "derived Default Chrono frames", "Member evidence", "Availability gaps", "Review is ready"]) await expect(auxiliary.getByText(label, { exact: true })).toBeVisible();
  for (const action of ["Edit period", "Edit chart selection", "Edit matching defaults"]) await expect(auxiliary.getByRole("button", { name: action, exact: true })).toBeVisible();
  const proofGeometry = await auxiliary.locator(".chrono-review-proof-list > li").evaluateAll((rows) => rows.map((row) => ({
    display: getComputedStyle(row).display,
    textX: row.children[1]?.getBoundingClientRect().x,
    actionRight: row.children[2]?.getBoundingClientRect().right ?? null,
  })));
  expect(proofGeometry.map(({ display }) => display)).toEqual(["grid", "grid", "grid", "grid"]);
  const textStarts = proofGeometry.map(({ textX }) => textX);
  expect(Math.max(...textStarts) - Math.min(...textStarts)).toBeLessThanOrEqual(1);
  const actionEdges = proofGeometry.map(({ actionRight }) => actionRight).filter(Number.isFinite);
  expect(Math.max(...actionEdges) - Math.min(...actionEdges)).toBeLessThanOrEqual(1);
  const body = auxiliary.locator(".chrono-group-studio__body");
  await body.evaluate((node) => { node.scrollTop = node.scrollHeight; });
  const clearance = await auxiliary.evaluate((node) => {
    const bodyNode = node.querySelector(".chrono-group-studio__body");
    const footer = node.querySelector(".chrono-group-studio > footer");
    return footer.getBoundingClientRect().top - bodyNode.getBoundingClientRect().bottom;
  });
  expect(clearance).toBeGreaterThanOrEqual(-1);

  await page.setViewportSize({ width: 1280, height: 720 });
  const compactClearance = await auxiliary.evaluate((node) => {
    const bodyNode = node.querySelector(".chrono-group-studio__body");
    const footer = node.querySelector(".chrono-group-studio > footer");
    return footer.getBoundingClientRect().top - bodyNode.getBoundingClientRect().bottom;
  });
  expect(compactClearance).toBeGreaterThanOrEqual(-1);
  await expect.poll(() => body.evaluate((node) => node.clientHeight)).toBeGreaterThanOrEqual(250);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(auxiliary).toBeVisible();
  const geometry = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, footerVisible: Boolean(document.querySelector(".chrono-group-studio > footer")?.getBoundingClientRect().height) }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.footerVisible).toBe(true);
});

test("012-chrono-studio: direct reopening starts on All pages and does not hide saved groups", async ({ page }) => {
  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  const auxiliary = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await expect(auxiliary.getByLabel("Page")).toHaveValue("");
  const count = auxiliary.locator(".temporal-studio__count");
  await expect(count).not.toHaveText(/Showing 0 of [1-9]/);
  await expect(auxiliary.locator("[data-action='open-content']").first()).toBeVisible();
});

test("005-chrono-group-suspension: closing an unfinished create draft exposes Resume without locking Build pages", async ({ page }) => {
  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  const auxiliary = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await auxiliary.getByRole("button", { name: "Create Chrono Group", exact: true }).click();
  await auxiliary.getByRole("textbox", { name: "Chrono Group name" }).fill("Unfinished response group");

  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();
  await expect(auxiliary).toBeHidden();
  const pendingWork = page.getByRole("navigation", { name: "Pending Build work" });
  const resumeDraft = pendingWork.getByRole("button", { name: "Resume Chrono Studio changes", exact: true });
  await expect(resumeDraft).toBeVisible();

  const pageNavigation = page.locator(".dashboard-command-page-scroller");
  const socioEconomic = pageNavigation.getByRole("button", { name: "Socio-economic", exact: true });
  await expect(socioEconomic).toBeEnabled();
  await socioEconomic.click();
  await expect(socioEconomic).toHaveAttribute("aria-current", "page");

  await resumeDraft.click();
  await expect(auxiliary).toBeVisible();
  await expect(auxiliary.getByRole("textbox", { name: "Chrono Group name" })).toHaveValue("Unfinished response group");
});

test("006-scene-authoring amendment: three full-width stages and Unit Orbit are live", async ({ page }) => {
  test.setTimeout(120_000);
  const sceneName = "Runtime composition fidelity scene";
  await page.getByRole("button", { name: "Scene Studio", exact: true }).click();
  const auxiliary = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await auxiliary.getByRole("button", { name: "Create Scene", exact: true }).click();

  const details = auxiliary.locator(".scene-details-stage");
  await expect(details).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: /Scene details/ })).toHaveAttribute("aria-current", "step");
  await expect(details.getByRole("textbox", { name: "Scene name" })).toBeVisible();
  await details.getByRole("textbox", { name: "Scene name" }).fill(sceneName);
  for (const label of ["Owning page", "Parent Chrono Group", "Default matching"]) await expect(details.getByRole("combobox", { name: label })).toBeVisible();
  await expect(details.getByRole("spinbutton", { name: "Seconds per frame" })).toBeVisible();
  await expect(details.getByLabel("Start date")).toBeVisible();
  await expect(details.getByLabel("End date")).toBeVisible();
  if (await details.getByRole("radio", { name: "Calendar interval" }).isChecked()) {
    await expect(details.getByRole("spinbutton", { name: "Calendar interval value" })).toBeVisible();
    await expect(details.getByRole("combobox", { name: "Calendar interval unit" })).toBeVisible();
  }
  for (const label of ["Period", "Time mode"]) await expect(details.getByText(label, { exact: true })).toBeVisible();
  await expect(auxiliary.locator(".scene-transaction-footer").getByText("Save readiness", { exact: true })).toBeVisible();

  await auxiliary.getByRole("button", { name: /Select charts and frames/ }).click();
  await expect(auxiliary.getByRole("button", { name: /Select charts and frames/ })).toHaveAttribute("aria-current", "step");
  await expect(auxiliary.locator(".scene-variable-evidence").first()).toContainText("Full data");
  await expect(auxiliary.locator(".scene-availability-calendar").first()).toBeVisible();
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
  await expect(auxiliary.getByText("Scene preview frame", { exact: false })).toBeVisible();
  const widths = await boards.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));
  expect(Math.abs(widths[0] - widths[1])).toBeLessThanOrEqual(2);
  await expect(auxiliary.getByRole("button", { name: /Drop (before|after)/ }).first()).toBeAttached();
  await expect(auxiliary.locator(".scene-present-corner-action").first()).toBeVisible();
  await auxiliary.locator(".scene-arrangement-board[data-board='scene'] .scene-chart-title").first().click();
  const orbitShell = page.locator(".unit-orbit:has(.scene-unit-orbit)");
  const orbit = orbitShell.locator(".scene-unit-orbit");
  await expect(orbitShell).toBeVisible();
  await expect(orbit).toContainText("Unit Orbit");
  const orbitRelationship = await page.evaluate(() => {
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
  expect(orbitRelationship.visibleChartHeight).toBeGreaterThanOrEqual(240);
  expect(orbitRelationship.orbitInsideViewport).toBe(true);
  expect(orbitRelationship.overlap).toBe(false);
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
  await auxiliary.getByRole("button", { name: "Save Scene", exact: true }).click();
  await expect(auxiliary.getByRole("heading", { name: sceneName, exact: true })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  const chrono = page.getByRole("region", { name: "Chrono playback controls" });
  await chrono.getByLabel("Chrono source").selectOption({ label: sceneName });
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
  await expect(page.locator(".present-workspace")).not.toHaveAttribute("data-active-scene-id", "");
  await expect(page.locator(".present-selected-chart")).toHaveCount(2);
  const presentIds = await page.locator(".present-selected-chart").evaluateAll((cells) => cells.map((cell) => cell.getAttribute("data-displayed-chart-id")));
  expect(presentIds).toEqual(authoringPresentIds);
  await expect(page.getByLabel("Scene layout")).toHaveValue("overUnder");
  await page.getByLabel("Scene layout").selectOption("sideBySide");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.getByLabel("Scene layout")).toHaveValue("sideBySide");

  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await chrono.getByLabel("Chrono source").selectOption({ label: "Municipal outbreak playback" });
  await chrono.getByLabel("Chrono source").selectOption({ label: sceneName });
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.getByLabel("Scene layout")).toHaveValue("overUnder");
  await expect(page.locator(".scene-chart-authoring-overlay")).toHaveCount(0);
});

test("012-temporal-content: libraries filter, open read-first pages, and restore context", async ({ page }) => {
  test.setTimeout(120_000);
  await page.getByRole("button", { name: "Scene Studio", exact: true }).click();
  let auxiliary = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await expect(auxiliary.getByLabel("Search")).toBeVisible();
  await expect(auxiliary.getByLabel("Status")).toBeVisible();
  await expect(auxiliary.getByLabel("Page")).toBeVisible();
  await expect(auxiliary.getByText(/Showing \d+ of \d+/)).toBeVisible();
  await expect(auxiliary.getByText("No Scenes have been created yet.")).toBeVisible();
  await auxiliary.getByRole("button", { name: "Create Scene", exact: true }).click();
  const sceneName = "Fidelity response scene";
  await auxiliary.getByRole("textbox", { name: "Scene name" }).fill(sceneName);
  await auxiliary.getByRole("button", { name: "Save Scene" }).click();
  await expect(auxiliary.getByRole("heading", { name: sceneName })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Back to Scene Studio" }).click();
  let card = auxiliary.locator("[data-action='open-content']").first();
  await auxiliary.getByLabel("Search").fill(sceneName.slice(0, Math.min(8, sceneName.length)));
  card = auxiliary.locator("[data-action='open-content']").first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(auxiliary.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: "Duplicate", exact: true })).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: "Remove", exact: true })).toBeVisible();

  await auxiliary.getByRole("button", { name: "Back to Scene Studio" }).click();
  await expect(auxiliary.getByLabel("Search")).toHaveValue(sceneName.slice(0, Math.min(8, sceneName.length)));
  await page.setViewportSize({ width: 768, height: 1024 });
  const libraryGeometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    searchVisible: Boolean(document.querySelector(".temporal-studio__filters")?.getBoundingClientRect().height),
  }));
  expect(libraryGeometry.scrollWidth).toBeLessThanOrEqual(libraryGeometry.clientWidth);
  expect(libraryGeometry.searchVisible).toBe(true);

  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  auxiliary = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await auxiliary.locator("[data-action='open-content']").first().click();
  await expect(auxiliary.getByRole("button", { name: "Create Scene", exact: true })).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: "Duplicate", exact: true })).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: "Remove", exact: true })).toBeVisible();

  await auxiliary.getByRole("button", { name: "Create Scene", exact: true }).click();
  const sceneAuxiliary = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await expect(sceneAuxiliary).toBeVisible();
  await expect(auxiliary).toBeHidden();
  await expect(sceneAuxiliary.getByRole("combobox", { name: "Parent Chrono Group" })).not.toHaveValue("");
  await sceneAuxiliary.getByRole("button", { name: /Arrange and configure/ }).click();
  await expect(sceneAuxiliary.locator(".scene-arrangement-board")).toHaveCount(2);
  await sceneAuxiliary.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dashboard look", exact: true })).toBeEnabled();
  const pausedWork = page.getByRole("navigation", { name: "Paused Build work" });
  const resumeScene = pausedWork.getByRole("button", { name: "Resume Scene draft", exact: true });
  await expect(resumeScene).toBeVisible();
  await resumeScene.click();
  await expect(sceneAuxiliary).toBeVisible();
  await expect(sceneAuxiliary.locator(".scene-arrangement-board")).toHaveCount(2);
});
