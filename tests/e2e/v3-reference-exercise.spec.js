import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { parseCsvText } from "../../src/lib/loadCsv.js";
import { APP_VERSION } from "../../src/lib/appVersion.js";
import { initialPlaybackState } from "../../src/charting/time/playbackReducer.js";
import { deriveCursorPlayback } from "../../src/charting/time/cursorProviderModel.js";
import { resolveChartRendering } from "../../src/charting/rendering/resolveChartRendering.js";
import { projectCanonicalRuntimeLedger } from "../../src/charting/rendering/canonicalRuntimeLedger.js";
import { resolveChartTimeEvidence } from "../../src/charting/time/chartTimeEvidence.js";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { timeCursor } from "./support/time-cursor-workflow.js";
import { openAudienceSession, installAudienceFaultInstrumentation, readLastAcceptedAudienceState } from "./support/present-audience-workflow.js";

const SOURCE_SHA = "1fbde36ce8962f1b11c83ffbfedb424946716b6eff6bec3be79ff686914469ef";
const FINAL_EPOCH = Date.parse("2027-08-01T00:00:00.000Z");
const REFERENCES = [
  { id: "cases_and_institutional_trust", ids: ["bio_confirmed_cases", "socio_trust_trend"], view: "sideBySide", present: "vertical-divider", display: "sideBySide" },
  { id: "health_pressure_and_staff_absenteeism", ids: ["bio_hospital_occupancy", "bio_icu_occupancy", "socio_healthcare_absenteeism"], view: "topFocus", present: "large-top", display: "topFocus" },
  { id: "cases_and_unemployment", ids: ["bio_confirmed_cases", "socio_unemployment"], view: "sideBySide", present: "vertical-divider", display: "sideBySide" },
];
const EXPECTED_OBSERVATION = { bio_confirmed_cases: "2027-08-01", socio_trust_trend: "2027-07-19", bio_hospital_occupancy: "2027-08-01", bio_icu_occupancy: "2027-08-01", socio_healthcare_absenteeism: "2027-07-01", socio_unemployment: "2027-08-01" };
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");

test.use({ storageState: { cookies: [], origins: [] }, reducedMotion: "reduce", trace: "off", screenshot: "off", video: "off" });
test.beforeEach(async ({ request, context }) => {
  // The native app loads more than the default resource-timing buffer before
  // its chart engine. Retain observed module URLs for read-only axis inspection.
  await context.addInitScript(() => performance.setResourceTimingBufferSize(2000));
  await request.post("http://127.0.0.1:4174/__test__/reset");
  await request.post("http://127.0.0.1:4174/__test__/catalogue-mode", { data: { mode: "absent" } });
});

async function referencePreflight(request) {
  const response = await request.get("/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const bytes = await response.body();
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(SOURCE_SHA);
  const config = JSON.parse(bytes);
  expect(config.configVersion).toBe(7);
  expect(APP_VERSION).toBe("0.2.0-rc.1");
  const charts = config.pages.flatMap(page => page.sections.flatMap(section => section.panels.map(panel => panel.chart ?? panel)));
  expect(charts).toHaveLength(37);
  expect(Object.keys(config.dataSources)).toHaveLength(39);
  const byId = new Map(charts.map(chart => [chart.id, chart]));
  const loadedData = {};
  for (const id of new Set(REFERENCES.flatMap(reference => reference.ids))) {
    const chart = byId.get(id);
    expect(chart, id).toBeTruthy();
    if (loadedData[chart.sourceId]) continue;
    const source = config.dataSources[chart.sourceId];
    expect(source.kind).toBe("csv");
    expect(config.datasetProfiles[chart.sourceId]).toBeTruthy();
    const csv = await request.get(`/${source.path}`);
    expect(csv.ok(), source.path).toBe(true);
    loadedData[chart.sourceId] = parseCsvText(await csv.text(), chart.sourceId);
    expect(loadedData[chart.sourceId].length).toBeGreaterThan(0);
  }
  return REFERENCES.map(reference => {
    const scene = config.scenes.find(scene => scene.id === reference.id);
    expect(scene).toBeTruthy();
    expect(scene.members.map(member => member.chartId)).toEqual(reference.ids);
    expect(scene.present).toEqual({ chartIds: reference.ids, layout: reference.present });
    expect(scene.view.layout).toBe(reference.view);
    expect(scene.period).toEqual({ start: "2027-03-15T00:00:00.000Z", end: "2027-08-01T23:59:59.999Z" });
    const state = { ...initialPlaybackState, cursor: { mode: "at", epochMs: FINAL_EPOCH, scope: { kind: "storyline", id: scene.id }, window: null } };
    const projection = deriveCursorPlayback({ state, charts, scenes: config.scenes, loadedData, profiles: config.datasetProfiles, timezone: config.timezone });
    expect(projection.clock[0]).toBe(Date.parse(scene.period.start));
    expect(projection.clock.at(-1)).toBe(FINAL_EPOCH);
    expect(projection.clock.length).toBeGreaterThan(2);
    const expected = Object.fromEntries(reference.ids.map(id => {
      const chart = byId.get(id), timeContext = projection.contexts[id];
      const resolution = resolveChartRendering({ chart, rows: loadedData[chart.sourceId], datasetProfile: config.datasetProfiles[chart.sourceId], renderContext: { sources: config.dataSources }, timeContext });
      expect(resolution.status, id).toBe("available");
      const activeMarks = resolution.prepared.marks.filter(mark => mark.active === true);
      expect(activeMarks.length, id).toBeGreaterThan(0);
      // These actual reference measurements are positive. Blank future staff
      // rows must not create a zero or an invented August observation.
      for (const mark of activeMarks) { expect(Number.isFinite(mark.value), id).toBe(true); expect(mark.value, id).toBeGreaterThan(0); }
      const chip = resolveChartTimeEvidence({ chart, prepared: resolution.prepared, timeContext });
      expect(chip.observationEpochs, id).toEqual([Date.parse(`${EXPECTED_OBSERVATION[id]}T00:00:00.000Z`)]);
      const ledger = projectCanonicalRuntimeLedger({ chart, resolution, timeContext });
      expect(finiteCount(ledger)).toBeGreaterThan(0);
      return [id, { chip, seriesSha256: digest(ledger.series), finiteMeasurements: finiteCount(ledger), activeMarks: activeMarks.length }];
    }));
    return { ...reference, scene, clock: projection.clock, expected };
  });
}

function finiteCount(ledger) {
  return ledger.series.reduce((count, series) => count + series.values.filter(point => typeof (Array.isArray(point) ? point.at(-1) : point) === "number" && Number.isFinite(Array.isArray(point) ? point.at(-1) : point)).length, 0);
}

async function assertChart(cell, id, expected, { phone = false } = {}) {
  await cell.scrollIntoViewIfNeeded();
  const serialized = cell.locator("[data-canonical-runtime-ledger]").first();
  await expect.poll(async () => {
    const text = await serialized.getAttribute("data-canonical-runtime-ledger");
    return text ? JSON.parse(text).time.activeEpochMs : null;
  }).toBe(FINAL_EPOCH);
  const ledger = JSON.parse(await serialized.getAttribute("data-canonical-runtime-ledger"));
  expect(ledger.panelId).toBe(id);
  expect(ledger.render).toMatchObject({ kind: "echarts", resolution: "available", status: "ready" });
  expect(finiteCount(ledger)).toBeGreaterThan(0);
  expect(digest(ledger.series)).toBe(expected.seriesSha256);
  const chip = cell.locator(".chart-time-chip").first();
  await expect(chip).toHaveText(expected.chip.label);
  await expect(chip).toHaveAttribute("data-chart-observation-epochs", expected.chip.observationEpochs.join(","));
  await expect(chip).toHaveAttribute("data-chart-time-policy", expected.chip.policy);
  await expect.poll(() => cell.locator("canvas").first().evaluate(canvas => {
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 4; index < data.length; index += 4) if (data[index] !== data[0] || data[index + 1] !== data[1] || data[index + 2] !== data[2] || data[index + 3] !== data[3]) return true;
    return false;
  })).toBe(true);
  const metrics = await cell.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height, titlePx: parseFloat(getComputedStyle(element.querySelector(".chart-view-title")).fontSize) };
  });
  if (phone) {
    expect(metrics.height).toBeGreaterThanOrEqual(240);
    expect(metrics.height).toBeLessThanOrEqual(421);
    expect(metrics.titlePx).toBeGreaterThanOrEqual(12);
    await expect(serialized).toHaveAttribute("data-chart-typography", "phone");
    // Inspect the engine that the real page loaded, without adding a product API.
    const axes = await cell.evaluate(async element => {
      const url = performance.getEntriesByType("resource").find(resource => /\/deps\/echarts\.js(?:\?|$)/.test(resource.name))?.name;
      if (!url) throw new Error("The rendered page has no observed ECharts engine resource.");
      const engine = await import(url), option = engine.getInstanceByDom(element.querySelector(".chart-echarts-host")).getOption();
      return [...(option.xAxis ?? []), ...(option.yAxis ?? [])].map(axis => ({ labelPx: axis.axisLabel.fontSize, sampledLabels: axis.axisLabel.customValues?.length ?? null }));
    });
    for (const axis of axes) { expect(axis.labelPx).toBeGreaterThanOrEqual(12); if (axis.sampledLabels !== null) expect(axis.sampledLabels).toBeLessThanOrEqual(6); }
    metrics.axes = axes;
  }
  return { id, ...metrics, finiteMeasurements: finiteCount(ledger), seriesSha256: expected.seriesSha256, policy: expected.chip.policy, observationDates: expected.chip.observationEpochs.map(epoch => new Date(epoch).toISOString().slice(0, 10)) };
}

function observe(context) {
  const errors = [];
  context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
  return { errors };
}

async function report(testInfo, phase, observations, errors) {
  await testInfo.attach(`reference-${phase}-metadata`, { contentType: "application/json", body: JSON.stringify({ sourceSha256: SOURCE_SHA, appVersion: APP_VERSION, phase, observations, errors }, null, 2) });
}

test("three canonical saved Storylines remain readable and reachable in phone View", async ({ page, context, request }, testInfo) => {
  test.setTimeout(180_000);
  const references = await referencePreflight(request), observations = [];
  const { errors } = observe(context);
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open the dashboard", exact: true }).click();
    await page.locator('.crown-compact-pages [data-dashboard-page-id="biomedical"]').click();
    const cursor = timeCursor(page);
    for (const reference of references) {
      await cursor.selectScope({ id: reference.id, kind: "storyline" });
      await cursor.open();
      await cursor.frame.press("End");
      await expect(cursor.frame).toHaveAttribute("data-frame-epoch", String(FINAL_EPOCH));
      await expect(cursor.frame).toHaveAttribute("min", "0");
      await expect(cursor.frame).toHaveAttribute("max", "139");
      await expect(cursor.frame).toHaveValue("139");
      await cursor.instant.click();
      const band = page.locator(`[data-storyline-band="${reference.id}"]`);
      await expect(band.getByRole("heading", { name: reference.scene.name, exact: true })).toBeVisible();
      await expect(page.locator("[data-canonical-page-id]")).toHaveAttribute("data-canonical-page-id", "biomedical");
      await expect(page.locator('[data-canonical-panel-id="bio_confirmed_cases"]')).toBeAttached();
      await expect(band.locator("[data-scene-chart-id]")).toHaveCount(reference.ids.length);
      await expect(band.locator("header select, header .cursor-time-readout")).toHaveCount(0);
      await expect(page.locator(".chrono-date-overlay")).toHaveCount(0);
      await expect(band.locator("[data-scene-chart-id]").first()).toBeInViewport({ ratio: 0.5 });
      const controls = await band.locator(".storyline-band__header button, .storyline-band__header select").evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { width: box.width, height: box.height, left: box.left, right: box.right }; }));
      expect(controls).toHaveLength(1);
      for (const control of controls) { expect(control.height).toBeGreaterThanOrEqual(44); expect(control.width).toBeGreaterThanOrEqual(44); expect(control.left).toBeGreaterThanOrEqual(0); expect(control.right).toBeLessThanOrEqual(391); }
      const metrics = [];
      for (const id of reference.ids) metrics.push(await assertChart(band.locator(`[data-scene-chart-id="${id}"]`), id, reference.expected[id], { phone: true }));
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      const close = band.getByRole("button", { name: "Close Storyline", exact: true });
      await close.focus(); await expect(close).toBeFocused();
      await close.click();
      await expect(band).toHaveCount(0);
      await expect(page.locator('[data-canonical-panel-id="bio_confirmed_cases"]')).toBeAttached();
      observations.push({ storylineId: reference.id, viewport: [390, 844], controls, charts: metrics });
    }
    expect(errors).toEqual([]);
  } finally { await report(testInfo, "phone-view", observations, errors); }
});

test("three canonical saved Storylines reach same-origin Audience with authored composition and sparse observation meaning", async ({ page, context, request }, testInfo) => {
  test.setTimeout(180_000);
  const references = await referencePreflight(request), observations = [];
  const { errors } = observe(context);
  page.on("pageerror", error => errors.push(error.message));
  await installAudienceFaultInstrumentation(context);
  let audience;
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await openDashboardPage(page, "biomedical");
    await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click();
    const cursor = timeCursor(page);
    for (const reference of references) {
      // Explicitly select in Present: retained sessions legitimately restore
      // the prior accepted source on mode entry.
      await cursor.selectScope({ id: reference.id, kind: "storyline" });
      await expect(page.locator(".present-workspace")).toHaveAttribute("data-active-scene-id", reference.id);
      await expect(page.getByLabel("Storyline layout", { exact: true })).toHaveValue(reference.display);
      await cursor.open(); await cursor.frame.press("End");
      await expect(cursor.frame).toHaveValue(String(FINAL_EPOCH));
      if (!audience) ({ popup: audience } = await openAudienceSession(page));
      expect(new URL(audience.url()).origin).toBe(new URL(page.url()).origin);
      await expect(audience.locator(".audience-display")).toHaveAttribute("data-connection-status", "connected");
      await expect.poll(async () => (await readLastAcceptedAudienceState(audience)).time.epoch_ms).toBe(FINAL_EPOCH);
      const output = audience.locator(".displayed-chart-grid");
      await expect(output).toHaveClass(new RegExp(`(?:^| )layout-${reference.display}(?: |$)`));
      await expect.poll(() => output.locator("[data-displayed-chart-id]").evaluateAll(nodes => nodes.map(node => node.dataset.displayedChartId))).toEqual(reference.ids);
      const charts = [];
      for (const id of reference.ids) charts.push(await assertChart(output.locator(`[data-displayed-chart-id="${id}"]`), id, reference.expected[id]));
      const accepted = await readLastAcceptedAudienceState(audience);
      expect(accepted.time.scope).toEqual({ kind: "storyline", id: reference.id });
      expect(accepted.time.frame_epochs).toEqual(reference.clock);
      expect(accepted.composition.displayed_chart_ids).toEqual(reference.ids);
      expect(accepted.composition.layout).toBe(reference.display);
      // Play exactly one real adjacent interval, using actual epoch values.
      await cursor.frame.fill(String(reference.clock.at(-2)));
      await expect.poll(async () => (await readLastAcceptedAudienceState(audience)).time.epoch_ms).toBe(reference.clock.at(-2));
      await cursor.play.click();
      await expect.poll(async () => (await readLastAcceptedAudienceState(audience)).time.epoch_ms).toBe(FINAL_EPOCH);
      await expect(cursor.pause).toHaveCount(0);
      await expect(cursor.play).toBeDisabled();
      observations.push({ storylineId: reference.id, layout: reference.display, frameCount: reference.clock.length, adjacentPlayback: reference.clock.slice(-2).map(epoch => new Date(epoch).toISOString()), charts });
    }
    // Canonical source is the durable baseline. This journey made no authored
    // edit and does not rely on transient UI state as proof of persistence.
    expect(errors).toEqual([]);
  } finally { await audience?.close(); await report(testInfo, "present-audience", observations, errors); }
});
