import { expect, test } from "@playwright/test";

import { openChartAuthoring } from "./support/chart-authoring-workflow.js";
import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("playback entry preserves editor and wizard authoring until each workflow is resolved", async ({
  page,
}) => {
  await openDashboard(page);
  const viewMode = page.getByRole("button", { name: "View", exact: true });
  await page.getByRole("button", { name: "Build" }).click();

  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await panel.getByRole("button", { name: "Edit chart" }).click();
  let quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  let editor = page.getByRole("dialog", { name: "Edit chart" });
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  let editorTitle = editor.getByRole("textbox", { name: "Chart title", exact: true });
  await editorTitle.fill("Playback-safe unsaved editor title");

  await expect(viewMode).toBeDisabled();
  await viewMode.evaluate((button) => button.click());
  await expect(page.locator(".playback-view")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Build", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(editor).toBeVisible();
  await expect(editorTitle).toHaveValue("Playback-safe unsaved editor title");

  await editor.getByRole("button", { name: "Discard changes", exact: true }).click();
  let reset = page.getByRole("dialog", { name: "Discard changes?" });
  await reset.getByRole("button", { name: "Continue editing", exact: true }).click();
  await expect(editorTitle).toHaveValue("Playback-safe unsaved editor title");
  await editor.getByRole("button", { name: "Discard changes", exact: true }).click();
  reset = page.getByRole("dialog", { name: "Discard changes?" });
  await reset.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(viewMode).toBeEnabled();

  await panel.getByRole("button", { name: "Edit chart" }).click();
  quick = page.locator(".chart-quick-editor");
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  editor = page.getByRole("dialog", { name: "Edit chart" });
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  editorTitle = editor.getByRole("textbox", { name: "Chart title", exact: true });
  await expect(editorTitle).toHaveValue("Confirmed cases");
  await editorTitle.fill("Playback-safe saved editor title");
  await editor.getByRole("button", { name: /^Review\./ }).click();
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(viewMode).toBeEnabled();

  const flow = await openChartAuthoring(page);
  const { wizard } = flow;
  await flow.selectExistingSource("Biomedical mortality by age");
  await flow.chooseChartType("pie", /^Pie\b/i);
  await flow.goToMapAndPrepare();
  await flow.selectRole("category", "Age group");
  await flow.selectRole("value", "deaths");
  await flow.goToConfigure();
  const wizardTitle = wizard.getByRole("textbox", { name: "Chart title", exact: true });
  await wizardTitle.fill("Playback-safe unsaved wizard title");

  await expect(viewMode).toBeEnabled();
  await viewMode.evaluate((button) => button.click());
  await expect(wizard).toBeHidden();
  await expect(viewMode).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Resume New chart draft", exact: true }).click();
  await expect(wizard).toBeVisible();
  await expect(wizardTitle).toHaveValue("Playback-safe unsaved wizard title");

  await wizard.getByRole("button", { name: "Discard chart draft" }).click();
  const discard = page.getByRole("dialog", { name: "Discard chart?" });
  await discard.getByRole("button", { name: "Continue editing" }).click();
  await expect(wizardTitle).toHaveValue("Playback-safe unsaved wizard title");
  await wizard.getByRole("button", { name: "Discard chart draft" }).click();
  await discard.getByRole("button", { name: "Discard" }).click();
  await expect(wizard).toHaveCount(0);
  await expect(viewMode).toBeEnabled();
});

test("default synchronized playback keeps line history, bar and map snapshots, and reopens at the same time", async ({
  page,
}) => {
  await openDashboard(page);
  const chronoButton = page.getByRole("button", { name: "Chrono view", exact: true });
  await chronoButton.click();
  const controls = page.getByRole("region", { name: "Chrono playback controls" });
  await controls.getByLabel("Chrono source").selectOption("group:municipal_outbreak");
  const frame = controls.getByLabel("Playback frame");
  const frameValues = await controls.locator("datalist option")
    .evaluateAll((options) => options.map((option) => option.value));
  await frame.fill(frameValues[0]);
  const firstEpochMs = Number(frameValues[0]);
  const firstTime = (await controls.locator(".playback-current-time time").textContent()).trim();
  await expect(page.locator(".dashboard-workspace")).toBeVisible();

  let view = page.locator('[data-chrono-section="municipal_outbreak"]');
  const map = view.locator(
    '[data-panel-id="bio_municipality_choropleth_animation"]',
  );
  const line = view.locator(
    '[data-panel-id="bio_municipality_aggregate"]',
  );
  await expectRuntimeTime(map, firstEpochMs);
  await expectRuntimeTime(line, firstEpochMs);

  await controls.getByRole("button", { name: "Next frame" }).click();
  const secondEpochMs = Number(await frame.inputValue());
  const secondTime = (await controls.locator(".playback-current-time time").textContent()).trim();
  expect(secondTime).not.toBe(firstTime);
  await expectRuntimeTime(map, secondEpochMs);
  await expectRuntimeTime(line, secondEpochMs);

  await chronoButton.click();
  await expect(controls).toHaveCount(0);
  await expect(page.locator(".dashboard-workspace")).toBeVisible();
  await expect(chronoButton).toBeFocused();
  await chronoButton.click();
  view = page.locator('[data-chrono-section="municipal_outbreak"]');
  await expect(view).toBeVisible();
  await expect(controls.locator(".playback-current-time time")).toHaveText(secondTime);

  await controls.getByLabel("Chrono source").selectOption("group:national_outbreak");
  const nationalFrameValues = await controls.locator("datalist option")
    .evaluateAll((options) => options.map((option) => option.value));
  await frame.fill(nationalFrameValues[0]);
  const nationalEpochMs = Number(nationalFrameValues[0]);
  const nationalTime = (await controls.locator(".playback-current-time time").textContent()).trim();
  const national = page.locator('[data-chrono-section="national_outbreak"]');
  await expectRuntimeTime(
    national.locator('[data-panel-id="bio_confirmed_cases"]'),
    nationalEpochMs,
  );
  await expectRuntimeTime(
    national.locator('[data-panel-id="bio_daily_cases_bar"]'),
    nationalEpochMs,
  );
  await expect(controls.locator(".playback-current-time time")).toHaveText(nationalTime);
});

test("zoom requires Ctrl in both dashboard and fullscreen contexts", async ({
  page,
}) => {
  await openDashboard(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  let guard = panel.locator(".chart-zoom-guard");
  await guard.scrollIntoViewIfNeeded();
  await guard.hover();
  const beforePlainWheel = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 240);
  await expect(guard.getByText("Hold Ctrl while scrolling to zoom"))
    .toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(beforePlainWheel);

  await guard.scrollIntoViewIfNeeded();
  await guard.hover();
  const beforeCtrlWheel = await page.evaluate(() => window.scrollY);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, 240);
  await page.keyboard.up("Control");
  await expect.poll(() => page.evaluate(() => window.scrollY))
    .toBe(beforeCtrlWheel);
  await expect(guard.locator('[data-zoom-modifier="Control"]')).toBeVisible();

  await panel.getByRole("button", {
    name: "Focus chart",
  }).click();
  const fullscreen = page.getByRole("dialog", { name: "Focused chart" });
  guard = fullscreen.locator(
    '[data-displayed-chart-id="bio_confirmed_cases"] .chart-zoom-guard',
  );
  await expect(guard).toBeVisible();
  await guard.hover();
  await page.mouse.wheel(0, 120);
  await expect(guard.getByText("Hold Ctrl while scrolling to zoom"))
    .toBeVisible();
  await fullscreen.getByRole("button", {
    name: "Exit fullscreen",
  }).click();
});

test("legacy accessibility preferences cannot restore removed chart summaries or controls", async ({
  page,
  request,
}) => {
  await installAccessibilityEnabledDashboard(page, request);
  await openDashboard(page);
  const chart = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await expect(chart.locator(".chart-view-summary")).toHaveCount(0);

  await page.getByRole("button", { name: "Build" }).click();
  await page.getByRole("button", { name: "More", exact: true }).click();
  const more = page.getByRole("dialog", { name: "More Build commands" });
  await expect(more.locator('[data-build-more-command="scene-studio"]')).toHaveCount(1);
  await expect(more.locator("[data-build-more-command]")).toHaveCount(1);
  await expect(more.locator('[data-build-more-command="chart-accessibility"]')).toHaveCount(0);
  await expect(more.getByRole("checkbox")).toHaveCount(0);
  await expect(chart.locator(".chart-view-summary")).toHaveCount(0);
});

test("matching policies produce policy-specific live values", async ({
  page,
  request,
}) => {
  await installScenarioDashboard(page, request, addTemporalMatchingScenarios);
  await openDashboard(page);
  await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  const controls = page.getByRole("region", { name: "Chrono playback controls" });
  await controls.getByLabel("Chrono source").selectOption("group:national_outbreak");
  const activeEpochMs = Date.parse("2027-02-22T00:00:00.000Z");
  await controls.getByLabel("Playback frame").fill(String(activeEpochMs));
  await expect(controls.locator(".playback-current-time time")).toHaveText("2027-02-22");
  const view = page.locator('[data-chrono-section="national_outbreak"]');

  for (const [chartId, expectedValue] of [
    ["e2e_last_known", 1],
    ["e2e_nearest", 7],
    ["e2e_interpolate", 5],
  ]) {
    const panel = view.locator(`[data-panel-id="${chartId}"]`);
    await expectRuntimeSeriesValue(panel, activeEpochMs, expectedValue);
  }
});

test("priority collections remain independent while Chrono advances", async ({
  page,
  request,
}) => {
  await installScenarioDashboard(page, request, addPriorityPlaybackScenarios);
  await openDashboard(page);
  const reranked = page.locator('[data-panel-id="e2e_priority_rerank"]');
  const locked = page.locator('[data-panel-id="e2e_priority_locked"]');
  await reranked.scrollIntoViewIfNeeded();
  await expect(firstCollectionItem(reranked))
    .toHaveAttribute("data-collection-entity-id", 'target:"A"');
  await expect(firstCollectionItem(locked))
    .toHaveAttribute("data-collection-entity-id", 'target:"A"');

  await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  const controls = page.getByRole("region", { name: "Chrono playback controls" });
  await controls.getByLabel("Chrono source").selectOption("group:national_outbreak");
  await controls.getByLabel("Playback frame")
    .fill(String(Date.parse("2027-02-21T00:00:00.000Z")));
  await expect(page.locator(
    '[data-chrono-section="national_outbreak"] [data-panel-id="e2e_priority_rerank"]',
  )).toHaveCount(0);
  await expect(firstCollectionItem(reranked))
    .toHaveAttribute("data-collection-entity-id", 'target:"A"');
  await expect(firstCollectionItem(locked))
    .toHaveAttribute("data-collection-entity-id", 'target:"A"');
});

test("fixed, scrollable, carousel, and priority collection modes share one live display contract", async ({
  page,
  request,
}) => {
  await installScenarioDashboard(page, request, addCollectionScenarios);
  await openDashboard(page);

  const fixed = page.locator('[data-panel-id="e2e_collection_fixed"]');
  await fixed.scrollIntoViewIfNeeded();
  await expect(fixed.locator(
    '[data-collection-layout="fixed"][data-collection-rows="1"][data-collection-columns="2"]',
  )).toBeVisible();
  await expect(fixed.locator("[data-collection-entity-id]")).toHaveCount(2);
  const fixedGrid = fixed.locator(".collection-grid");
  const fixedHeight = (await fixedGrid.boundingBox()).height;
  await expect(fixed.getByRole("status", {
    name: "Collection page 1 of 2",
  })).toBeVisible();
  await fixed.getByRole("button", { name: "Next collection page" }).click();
  await expect(fixed.getByRole("status", {
    name: "Collection page 2 of 2",
  })).toBeVisible();
  await expect(fixed.locator("[data-collection-entity-id]")).toHaveCount(2);
  await expect(fixedGrid).toHaveAttribute("data-collection-rows", "1");
  await expect(fixedGrid).toHaveAttribute("data-collection-columns", "2");
  expect((await fixedGrid.boundingBox()).height).toBe(fixedHeight);

  const scroll = page.locator('[data-panel-id="e2e_collection_scroll"]');
  await scroll.scrollIntoViewIfNeeded();
  const scrollRegion = scroll.getByRole("region", {
    name: "Scrollable collection",
  });
  await expect(scrollRegion).toBeVisible();
  await expect(scroll.locator(
    '[data-collection-layout="scroll"][data-collection-rows="1"][data-collection-columns="1"]',
  )).toBeVisible();
  await expect(scroll.locator("[data-collection-entity-id]")).toHaveCount(4);
  await expect.poll(() => scrollRegion.evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    overflows: element.scrollHeight > element.clientHeight,
  }))).toEqual({ overflowY: "auto", overflows: true });

  const carousel = page.locator(
    '[data-panel-id="e2e_collection_carousel"]',
  );
  await carousel.scrollIntoViewIfNeeded();
  const carouselRegion = carousel.getByRole("region", {
    name: "Collection carousel",
  });
  await expect(carouselRegion).toHaveAttribute(
    "data-collection-transition",
    "slide",
  );
  await expect(carouselRegion).toHaveAttribute(
    "data-collection-interval-ms",
    "5000",
  );
  await expect(carouselRegion).toHaveAttribute("data-collection-loop", "true");
  await expect(carouselRegion).toHaveAttribute(
    "data-collection-pause-on-hover",
    "true",
  );
  await fixed.hover();
  await expect(carouselRegion).toHaveAttribute(
    "data-collection-rotation-paused",
    "false",
  );
  await carouselRegion.hover();
  await expect(carouselRegion).toHaveAttribute(
    "data-collection-rotation-paused",
    "true",
  );
  await fixed.hover();
  await expect(carouselRegion).toHaveAttribute(
    "data-collection-rotation-paused",
    "false",
  );
  const firstEntity = await firstCollectionItem(carousel)
    .getAttribute("data-collection-entity-id");
  await carousel.getByRole("button", { name: "Next collection page" })
    .click();
  await expect(firstCollectionItem(carousel))
    .not.toHaveAttribute("data-collection-entity-id", firstEntity);
  await carousel.getByRole("button", { name: "Next collection page" })
    .click();
  await expect(firstCollectionItem(carousel))
    .not.toHaveAttribute("data-collection-entity-id", firstEntity);
  await carousel.getByRole("button", { name: "Next collection page" })
    .click();
  await expect(firstCollectionItem(carousel))
    .not.toHaveAttribute("data-collection-entity-id", firstEntity);
  await carousel.getByRole("button", { name: "Next collection page" })
    .click();
  await expect(firstCollectionItem(carousel))
    .toHaveAttribute("data-collection-entity-id", firstEntity);
  await carousel.getByRole("button", { name: "Pause collection rotation" })
    .click();
  await expect(carousel.getByRole("button", {
    name: "Resume collection rotation",
  })).toBeVisible();

  const priority = page.locator(
    '[data-panel-id="e2e_collection_priority"]',
  );
  await priority.scrollIntoViewIfNeeded();
  await expect(firstCollectionItem(priority)).toHaveAttribute(
    "data-collection-entity-id",
    'target:"Bravo"',
  );
});

test("collection carousels remain independent while Chrono plays", async ({
  page,
  request,
}) => {
  await installScenarioDashboard(page, request, addPlaybackCarouselScenarios);
  await openDashboard(page);
  const pausesPanel = page.locator('[data-panel-id="e2e_carousel_pause"]');
  const independentPanel = page.locator('[data-panel-id="e2e_carousel_independent"]');
  const pauses = pausesPanel.getByRole("region", { name: "Collection carousel" });
  const independent = independentPanel.getByRole("region", { name: "Collection carousel" });
  const chronoButton = page.getByRole("button", { name: "Chrono view", exact: true });
  await pausesPanel.scrollIntoViewIfNeeded();
  await chronoButton.hover();

  expect(await pauses.getAttribute("data-collection-pause-on-playback")).toBeNull();
  await expect(pauses).toHaveAttribute("data-collection-rotation-paused", "false");
  await independentPanel.scrollIntoViewIfNeeded();
  expect(await independent.getAttribute("data-collection-pause-on-playback")).toBeNull();
  await chronoButton.hover();
  await expect(independent).toHaveAttribute("data-collection-rotation-paused", "false");

  await chronoButton.click();
  const controls = page.getByRole("region", { name: "Chrono playback controls" });
  await controls.getByLabel("Chrono source").selectOption("group:national_outbreak");
  await controls.getByLabel("Playback frame")
    .fill(String(Date.parse("2027-02-20T00:00:00.000Z")));
  await controls.getByRole("button", { name: "Play Chrono" }).click();
  await pausesPanel.scrollIntoViewIfNeeded();
  await chronoButton.hover();
  await expect(pauses).toHaveAttribute(
    "data-collection-rotation-paused",
    "false",
    { timeout: 500 },
  );
  await independentPanel.scrollIntoViewIfNeeded();
  await chronoButton.hover();
  await expect(independent).toHaveAttribute(
    "data-collection-rotation-paused",
    "false",
    { timeout: 500 },
  );
  await controls.getByRole("button", { name: "Pause Chrono" }).click();
});

async function openDashboard(page) {
  await page.goto("/");
  await enterAuthoredDashboard(page);
}

async function readRuntimeLedger(panel) {
  const serialized = await panel.locator("[data-canonical-runtime-ledger]")
    .first()
    .getAttribute("data-canonical-runtime-ledger");
  if (!serialized) return null;
  try {
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}

async function expectRuntimeTime(panel, expectedEpochMs) {
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator("[data-canonical-runtime-ledger]").first()).toBeVisible();
  await expect.poll(async () => (
    (await readRuntimeLedger(panel))?.time?.activeEpochMs ?? null
  )).toBe(expectedEpochMs);
}

async function expectRuntimeSeriesValue(panel, expectedEpochMs, expectedValue) {
  await expectRuntimeTime(panel, expectedEpochMs);
  await expect.poll(async () => (
    (await readRuntimeLedger(panel))?.series?.some(({ values }) => (
      Array.isArray(values) && values.flat(Infinity).includes(expectedValue)
    )) ?? false
  )).toBe(true);
}

async function installScenarioDashboard(page, request, configure) {
  const response = await request.get("/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const dashboard = await response.json();
  configure(dashboard);
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: STORAGE_KEY,
    value: dashboard,
  });
}

function addTemporalMatchingScenarios(dashboard) {
  const sparseSourceId = "e2e_sparse_r_values";
  dashboard.dataSources[sparseSourceId] = uploadedCsv(
    "sparse-r-values.csv",
    [
      "date,R_value",
      "2027-02-20,1",
      "2027-02-23,7",
    ].join("\n"),
  );

  const rChart = findChart(dashboard, "bio_r_values");
  const section = biomedicalSection(dashboard);
  for (const [id, title, matching] of [
    ["e2e_last_known", "E2E last known", { policy: "lastKnown" }],
    [
      "e2e_nearest",
      "E2E nearest",
      { policy: "nearest", toleranceMs: 2 * 24 * 60 * 60 * 1000 },
    ],
    ["e2e_interpolate", "E2E interpolate", { policy: "interpolate" }],
  ]) {
    const chart = clone(rChart);
    Object.assign(chart, {
      id,
      typeId: "bar",
      title,
      sourceId: sparseSourceId,
    });
    if (matching.policy === "interpolate") {
      chart.roles.measurements = chart.roles.measurements.map((binding) => ({
        ...binding,
        interpolationAllowed: true,
      }));
    }
    section.panels.push(chart);
    nationalGroup(dashboard).members.push({
      chartId: id,
      timeRole: "observation",
      matching,
    });
  }
}

async function installAccessibilityEnabledDashboard(page, request) {
  const response = await request.get("/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const dashboard = await response.json();
  dashboard.globalStyles.accessibility = { enabled: true };
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: STORAGE_KEY,
    value: dashboard,
  });
}

function addPriorityPlaybackScenarios(dashboard) {
  const prioritySourceId = "e2e_priority_values";
  dashboard.dataSources[prioritySourceId] = uploadedCsv(
    "priority-values.csv",
    [
      "date,entity,value",
      "2027-02-20,A,10",
      "2027-02-20,B,20",
      "2027-02-21,A,30",
      "2027-02-21,B,5",
    ].join("\n"),
  );
  const kpiChart = findChart(dashboard, "bio_occupancy_collection");
  const section = biomedicalSection(dashboard);
  for (const [id, rerank] of [
    ["e2e_priority_rerank", true],
    ["e2e_priority_locked", false],
  ]) {
    const chart = clone(kpiChart);
    Object.assign(chart, {
      id,
      title: rerank ? "E2E priority rerank" : "E2E priority locked",
      sourceId: prioritySourceId,
      roles: {
        value: { field: "value" },
        entity: { field: "entity" },
        time: { field: "date", interpretation: "temporal" },
      },
      interaction: {
        ...chart.interaction,
        timeSync: null,
      },
    });
    chart.presentation.collection = collectionSettings({
      layout: "fixed",
      rows: 1,
      columns: 1,
      overflow: "manualPages",
      ranking: { mode: "priority", method: "highestCurrent" },
      rerank,
    });
    section.panels.push(chart);
  }
}

function addCollectionScenarios(dashboard) {
  const sourceId = "e2e_collection_values";
  dashboard.dataSources[sourceId] = uploadedCsv(
    "collection-values.csv",
    [
      "entity,value",
      "Alpha,10",
      "Bravo,40",
      "Charlie,30",
      "Delta,20",
    ].join("\n"),
    {},
  );
  const template = findChart(dashboard, "bio_occupancy_collection");
  const section = biomedicalSection(dashboard);
  const scenarios = [
    {
      id: "e2e_collection_fixed",
      title: "E2E fixed collection",
      settings: collectionSettings({
        layout: "fixed",
        rows: 1,
        columns: 2,
        overflow: "manualPages",
      }),
    },
    {
      id: "e2e_collection_scroll",
      title: "E2E scroll collection",
      settings: collectionSettings({
        layout: "scroll",
        rows: 1,
        columns: 1,
        overflow: "scroll",
      }),
    },
    {
      id: "e2e_collection_carousel",
      title: "E2E carousel collection",
      settings: collectionSettings({
        layout: "carousel",
        rows: 1,
        columns: 1,
        overflow: "autoRotate",
        transition: "slide",
      }),
    },
    {
      id: "e2e_collection_priority",
      title: "E2E priority collection",
      settings: collectionSettings({
        layout: "fixed",
        rows: 1,
        columns: 1,
        overflow: "manualPages",
        ranking: { mode: "priority", method: "highestCurrent" },
      }),
    },
  ];
  for (const scenario of scenarios) {
    const chart = clone(template);
    Object.assign(chart, {
      id: scenario.id,
      title: scenario.title,
      sourceId,
      roles: {
        value: { field: "value" },
        entity: { field: "entity" },
      },
      interaction: {
        ...chart.interaction,
        timeSync: null,
      },
    });
    chart.presentation.collection = scenario.settings;
    section.panels.push(chart);
  }
}

function addPlaybackCarouselScenarios(dashboard) {
  const sourceId = "e2e_playback_carousel_values";
  dashboard.dataSources[sourceId] = uploadedCsv(
    "playback-carousel-values.csv",
    [
      "date,entity,value",
      "2027-02-20,A,10",
      "2027-02-20,B,20",
      "2027-02-21,A,30",
      "2027-02-21,B,5",
    ].join("\n"),
  );
  const template = findChart(dashboard, "bio_occupancy_collection");
  const section = biomedicalSection(dashboard);
  for (const [id, pauseCarousel] of [
    ["e2e_carousel_pause", true],
    ["e2e_carousel_independent", false],
  ]) {
    const chart = clone(template);
    Object.assign(chart, {
      id,
      title: pauseCarousel
        ? "E2E playback-paused carousel"
        : "E2E independent carousel",
      sourceId,
      roles: {
        value: { field: "value" },
        entity: { field: "entity" },
        time: { field: "date", interpretation: "temporal" },
      },
      interaction: {
        ...chart.interaction,
        timeSync: null,
      },
    });
    chart.presentation.collection = collectionSettings({
      layout: "carousel",
      rows: 1,
      columns: 1,
      overflow: "autoRotate",
      transition: "fade",
      pauseCarousel,
    });
    section.panels.push(chart);
  }
}

function collectionSettings({
  layout,
  rows,
  columns,
  overflow,
  ranking = { mode: "fixed" },
  transition = "none",
  rerank = true,
  pauseCarousel = true,
}) {
  return {
    layout,
    rows,
    columns,
    gap: 16,
    overflow,
    ranking,
    carousel: {
      intervalMs: 5000,
      loop: true,
      pauseOnHover: true,
      transition,
    },
    playback: {
      rerank,
      pauseCarousel,
    },
  };
}

function uploadedCsv(fileName, csvText, parsingMetadata = {
  date: {
    interpretation: "temporal",
    format: "YYYY-MM-DD",
    timezone: "date-only",
  },
}) {
  return {
    kind: "dataset",
    type: "uploadedCsv",
    fileName,
    csvText,
    parsingMetadata,
  };
}

function firstCollectionItem(container) {
  return container.locator("[data-collection-entity-id]").first();
}

async function selectedOptionText(select) {
  return (await select.locator("option:checked").textContent()).trim();
}

function biomedicalSection(dashboard) {
  return dashboard.pages.find(({ id }) => id === "biomedical").sections[0];
}

function nationalGroup(dashboard) {
  return dashboard.chronoGroups.find(({ id }) => (
    id === "national_outbreak"
  ));
}

function findChart(dashboard, chartId) {
  return dashboard.pages
    .flatMap(({ sections }) => sections)
    .flatMap(({ panels }) => panels)
    .find(({ id }) => id === chartId);
}

function clone(value) {
  return structuredClone(value);
}
