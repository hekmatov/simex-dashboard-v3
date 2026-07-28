import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3";

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
  const controls = page.getByRole("region", {
    name: "Synchronized playback controls",
  });
  const openPlayback = controls.getByRole("button", {
    name: "Open playback view",
  });
  await page.getByRole("button", { name: "Open edit mode" }).click();

  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await panel.getByRole("button", { name: "Edit chart" }).click();
  const editor = page.locator(".chart-editor-v3");
  await editor.getByRole("button", { name: "Appearance", exact: true }).click();
  const editorTitle = editor.getByLabel("Chart title");
  await editorTitle.fill("Playback-safe unsaved editor title");

  await expect(openPlayback).toBeDisabled();
  await expect(openPlayback).toHaveAttribute(
    "aria-describedby",
    "playback-entry-blocked-reason",
  );
  await expect(page.locator("#playback-entry-blocked-reason")).toContainText(
    "Finish, save, or discard chart authoring",
  );
  await openPlayback.evaluate((button) => button.click());
  await expect(page.locator(".playback-view")).toHaveCount(0);
  await expect(editor).toBeVisible();
  await expect(editorTitle).toHaveValue("Playback-safe unsaved editor title");

  await editor.getByRole("button", { name: "Reset changes" }).click();
  let reset = page.getByRole("dialog", { name: "Discard these edits?" });
  await reset.getByRole("button", { name: "Keep editing" }).click();
  await expect(editorTitle).toHaveValue("Playback-safe unsaved editor title");
  await editor.getByRole("button", { name: "Reset changes" }).click();
  reset = page.getByRole("dialog", { name: "Discard these edits?" });
  await reset.getByRole("button", { name: "Reset changes" }).click();
  await editor.getByRole("button", { name: "Appearance", exact: true }).click();
  await expect(editorTitle).toHaveValue("Confirmed cases");
  await editorTitle.fill("Playback-safe saved editor title");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(openPlayback).toBeEnabled();

  await page.getByRole("button", { name: "Add chart" }).first().click();
  const wizard = page.locator(".chart-wizard-backdrop");
  await wizard.getByLabel("Search chart types").fill("pie");
  await wizard.getByRole("button", { name: /^Pie\b/i }).click();
  await wizard.getByRole("button", { name: "Style and layout" }).click();
  const wizardTitle = wizard.getByLabel("Chart title");
  await wizardTitle.fill("Playback-safe unsaved wizard title");

  await expect(openPlayback).toBeDisabled();
  await openPlayback.evaluate((button) => button.click());
  await expect(page.locator(".playback-view")).toHaveCount(0);
  await expect(wizard).toBeVisible();
  await expect(wizardTitle).toHaveValue("Playback-safe unsaved wizard title");

  await wizard.getByRole("button", { name: "Close" }).click();
  const discard = page.getByRole("dialog", { name: "Discard chart?" });
  await discard.getByRole("button", { name: "Continue editing" }).click();
  await expect(wizardTitle).toHaveValue("Playback-safe unsaved wizard title");
  await wizard.getByRole("button", { name: "Close" }).click();
  await discard.getByRole("button", { name: "Discard" }).click();
  await expect(wizard).toHaveCount(0);
  await expect(openPlayback).toBeEnabled();
});

test("default synchronized playback keeps line history, bar and map snapshots, and reopens at the same time", async ({
  page,
}) => {
  await openDashboard(page);
  const controls = page.getByRole("region", {
    name: "Synchronized playback controls",
  });
  await controls.getByLabel("Playback group")
    .selectOption("municipal_outbreak");
  const time = controls.getByLabel("Choose synchronized time");
  await time.selectOption({ index: 0 });
  const firstTime = await selectedOptionText(time);
  await expect(page.locator(".dashboard-workspace")).toBeVisible();
  await controls.getByRole("button", { name: "Open playback view" }).click();
  await expect(page.locator(".dashboard-workspace")).toHaveCount(0);

  let view = page.getByRole("region", {
    name: "Municipal outbreak playback playback view",
  });
  const map = view.locator(
    '[data-chart-id="bio_municipality_choropleth_animation"]',
  );
  const line = view.locator(
    '[data-chart-id="bio_municipality_aggregate"]',
  );
  await expect(map.locator(".chart-view-summary")).toContainText(firstTime);
  await expect(line.locator(".chart-view-summary")).toContainText(firstTime);

  await controls.getByRole("button", { name: "Next time" }).click();
  const secondTime = await selectedOptionText(time);
  expect(secondTime).not.toBe(firstTime);
  await expect(map.locator(".chart-view-summary")).toContainText(secondTime);
  await expect(line.locator(".chart-view-summary")).toContainText(secondTime);

  await controls.getByRole("button", { name: "Close playback view" }).click();
  await expect(view).toHaveCount(0);
  await expect(page.locator(".dashboard-workspace")).toBeVisible();
  await expect(controls.getByRole("button", {
    name: "Open playback view",
  })).toBeFocused();
  await controls.getByRole("button", { name: "Open playback view" }).click();
  view = page.getByRole("region", {
    name: "Municipal outbreak playback playback view",
  });
  await expect(view).toBeVisible();
  expect(await selectedOptionText(time)).toBe(secondTime);

  await controls.getByRole("button", { name: "Close playback view" }).click();
  await controls.getByLabel("Playback group").selectOption("national_outbreak");
  await time.selectOption({ index: 0 });
  const nationalTime = await selectedOptionText(time);
  await controls.getByRole("button", { name: "Open playback view" }).click();
  const national = page.getByRole("region", {
    name: "National outbreak and health-system playback playback view",
  });
  await expect(national.locator(
    '[data-chart-id="bio_confirmed_cases"] .chart-view-summary',
  )).toContainText(nationalTime);
  await expect(national.locator(
    '[data-chart-id="bio_daily_cases_bar"] .chart-view-summary',
  )).toContainText(nationalTime);
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

  await panel.getByRole("button", { name: "Fullscreen chart" }).click();
  const fullscreen = page.getByRole("dialog", { name: "Displayed charts" });
  guard = fullscreen.locator(
    '[data-displayed-chart-id="bio_confirmed_cases"] .chart-zoom-guard',
  );
  await expect(guard).toBeVisible();
  await guard.hover();
  await page.mouse.wheel(0, 120);
  await expect(guard.getByText("Hold Ctrl while scrolling to zoom"))
    .toBeVisible();
  await fullscreen.getByRole("button", {
    name: "Close all displayed charts",
  }).click();
});

test("matching policies produce policy-specific live values", async ({
  page,
  request,
}) => {
  await installScenarioDashboard(page, request, addTemporalMatchingScenarios);
  await openDashboard(page);
  const controls = page.getByRole("region", {
    name: "Synchronized playback controls",
  });
  await controls.getByLabel("Playback group").selectOption("national_outbreak");
  const time = controls.getByLabel("Choose synchronized time");
  await time.selectOption({ label: "2027-02-22" });
  expect(await selectedOptionText(time)).toBe("2027-02-22");
  await controls.getByRole("button", { name: "Open playback view" }).click();
  const view = page.getByRole("region", {
    name: "National outbreak and health-system playback playback view",
  });

  await expect(view.locator(
    '[data-chart-id="e2e_last_known"] .chart-view-summary',
  )).toContainText("value at 2027-02-22: 1");
  await expect(view.locator(
    '[data-chart-id="e2e_nearest"] .chart-view-summary',
  )).toContainText("value at 2027-02-22: 7");
  await expect(view.locator(
    '[data-chart-id="e2e_interpolate"] .chart-view-summary',
  )).toContainText("value at 2027-02-22: 5");
});

test("priority collections can rerank or retain their opening order during playback", async ({
  page,
  request,
}) => {
  await installScenarioDashboard(page, request, addPriorityPlaybackScenarios);
  await openDashboard(page);
  const controls = page.getByRole("region", {
    name: "Synchronized playback controls",
  });
  await controls.getByLabel("Playback group").selectOption("national_outbreak");
  await controls.getByLabel("Choose synchronized time")
    .selectOption({ label: "2027-02-20" });
  await controls.getByRole("button", { name: "Open playback view" }).click();
  const view = page.getByRole("region", {
    name: "National outbreak and health-system playback playback view",
  });
  const reranked = view.locator(
    '[data-chart-id="e2e_priority_rerank"]',
  );
  const locked = view.locator(
    '[data-chart-id="e2e_priority_locked"]',
  );
  await expect(firstCollectionItem(reranked))
    .toHaveAttribute("data-collection-entity-id", "B");
  await expect(firstCollectionItem(locked))
    .toHaveAttribute("data-collection-entity-id", "B");

  await controls.getByLabel("Choose synchronized time")
    .selectOption({ label: "2027-02-21" });
  await expect(firstCollectionItem(reranked))
    .toHaveAttribute("data-collection-entity-id", "A");
  await expect(firstCollectionItem(locked))
    .toHaveAttribute("data-collection-entity-id", "B");
});

test("fixed, scrollable, carousel, and priority collection modes share one live display contract", async ({
  page,
  request,
}) => {
  await installScenarioDashboard(page, request, addCollectionScenarios);
  await openDashboard(page);

  const fixed = page.locator('[data-panel-id="e2e_collection_fixed"]');
  await expect(fixed.locator(
    '[data-collection-layout="fixed"][data-collection-rows="1"][data-collection-columns="2"]',
  )).toBeVisible();
  await expect(fixed.locator("[data-collection-entity-id]")).toHaveCount(2);
  const fixedGrid = fixed.locator(".collection-grid");
  const fixedHeight = (await fixedGrid.boundingBox()).height;
  await expect(fixed.getByText("Page 1 of 2")).toBeVisible();
  await fixed.getByRole("button", { name: "Next collection page" }).click();
  await expect(fixed.getByText("Page 2 of 2")).toBeVisible();
  await expect(fixed.locator("[data-collection-entity-id]")).toHaveCount(2);
  await expect(fixedGrid).toHaveAttribute("data-collection-rows", "1");
  await expect(fixedGrid).toHaveAttribute("data-collection-columns", "2");
  expect((await fixedGrid.boundingBox()).height).toBe(fixedHeight);

  const scroll = page.locator('[data-panel-id="e2e_collection_scroll"]');
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
  await expect(firstCollectionItem(priority)).toHaveAttribute(
    "data-collection-entity-id",
    "Bravo",
  );
});

test("carousel playback pause policy and independent rotation remain distinct", async ({
  page,
  request,
}) => {
  await installScenarioDashboard(page, request, addPlaybackCarouselScenarios);
  await openDashboard(page);
  const controls = page.getByRole("region", {
    name: "Synchronized playback controls",
  });
  await controls.getByLabel("Playback group").selectOption("national_outbreak");
  await controls.getByLabel("Choose synchronized time")
    .selectOption({ label: "2027-02-20" });
  await controls.getByRole("button", { name: "Open playback view" }).click();
  const view = page.getByRole("region", {
    name: "National outbreak and health-system playback playback view",
  });
  const pauses = view.locator(
    '[data-chart-id="e2e_carousel_pause"] [aria-label="Collection carousel"]',
  );
  const independent = view.locator(
    '[data-chart-id="e2e_carousel_independent"] [aria-label="Collection carousel"]',
  );

  await expect(pauses).toHaveAttribute("data-collection-pause-on-playback", "true");
  await expect(independent).toHaveAttribute("data-collection-pause-on-playback", "false");
  await expect(pauses).toHaveAttribute("data-collection-rotation-paused", "false");
  await expect(independent).toHaveAttribute("data-collection-rotation-paused", "false");

  await controls.getByRole("button", { name: "Play synchronized charts" })
    .click();
  await expect(pauses).toHaveAttribute(
    "data-collection-rotation-paused",
    "true",
    { timeout: 500 },
  );
  await expect(independent).toHaveAttribute(
    "data-collection-rotation-paused",
    "false",
    { timeout: 500 },
  );
  await controls.getByRole("button", { name: "Pause synchronized charts" })
    .click();
});

async function openDashboard(page) {
  await page.goto("/");
  const explore = page.getByRole("button", {
    name: "Explore the live dashboard",
  });
  await expect(explore).toBeVisible({ timeout: 15_000 });
  await explore.click();
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
    Object.assign(chart, { id, title, sourceId: sparseSourceId });
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
  const kpiChart = findChart(dashboard, "home_operational_pressure_kpis");
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
        timeSync: { groupId: "national_outbreak" },
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
    nationalGroup(dashboard).members.push({
      chartId: id,
      timeRole: "time",
    });
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
  const template = findChart(dashboard, "home_operational_pressure_kpis");
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
  const template = findChart(dashboard, "home_operational_pressure_kpis");
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
        timeSync: { groupId: "national_outbreak" },
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
    nationalGroup(dashboard).members.push({
      chartId: id,
      timeRole: "time",
    });
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
  return dashboard.timeSyncGroups.find(({ id }) => (
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
