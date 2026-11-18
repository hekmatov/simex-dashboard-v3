import { test, expect } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { createHash } from "node:crypto";
import { parseCsvText } from "../../src/lib/loadCsv.js";
import { timeCursor } from "./support/time-cursor-workflow.js";
import { chartAuthoringWorkflow, openFreshChartAuthoring, resumeChartAuthoring } from "./support/chart-authoring-workflow.js";

test.use({ storageState: { cookies: [], origins: [] }, reducedMotion: "reduce" });

// A bounded changed-surface witness, not the historical cross-style matrix.
// Each test gets isolated storage; source requests retain the accepted package.
for (const [style, profile] of [
  ["evidence-ledger", "evidence-ledger/brighter-vellum"],
  ["humanist-standard", "humanist-standard/common-ground"],
  ["signal-instrument", "signal-instrument/calibrated-steel"],
  ["pdpc", "pdpc/brand"],
]) {
  test(`footprint typography fidelity across editor destination and Audience in ${style}`, async ({ page, context, request }) => {
    test.setTimeout(120_000);
    const response = await request.get("/config/dashboard.json");
    const bytes = await response.body();
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("1fbde36ce8962f1b11c83ffbfedb424946716b6eff6bec3be79ff686914469ef");
    const fixture = JSON.parse(bytes);
    const chart = fixture.pages.find(p => p.id === "biomedical").sections.find(s => s.id === "outbreak_dynamics").panels.find(c => c.id === "bio_r_values");
    expect(chart.roles.measurements[0].field).toBe("R_value");
    const source = await request.get(`/${fixture.dataSources[chart.sourceId].path}`);
    expect(source.ok()).toBe(true);
    const observations = parseCsvText(await source.text());
    const firstEpoch = observations.map(row => Date.parse(row[chart.roles.observation.field])).find(Number.isFinite);
    expect(Number.isFinite(firstEpoch)).toBe(true);
    fixture.globalStyles.dashboardStyle = style;
    fixture.globalStyles.dashboardColorProfile = profile;
    chart.title = "Reproduction value with a deliberately long heading for footprint and projector fidelity";
    chart.presentation.title = { ...chart.presentation.title };
    delete chart.presentation.title.fontSize;
    chart.layout = { ...chart.layout, width: 4, height: 0.5 };
    await context.route("**/config/dashboard.json", route => route.fulfill({ json: fixture }));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open the dashboard", exact: true }).click();

    await openDashboardPage(page, "biomedical");
    const cursor = timeCursor(page);
    await cursor.open();
    await cursor.frame.fill(String(firstEpoch));
    await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
    const destination = page.locator('[data-canonical-page-id] [data-canonical-panel-id="bio_r_values"]');
    await expect(destination).toBeVisible();
    await page.getByRole("treeitem", { name: chart.title, exact: true }).click();
    const quick = page.locator(".chart-quick-editor");
    await expect(quick).toBeVisible();
    const stage = quick.locator(".authoring-stage");
    await sameGeometry(stage, destination);
    await samePaint(stage, destination);
    const sourceCaption = await destination.locator("[data-chart-source-citation]").textContent();
    expect(sourceCaption).toMatch(/^Source: .+/);
    await expect(stage.locator(".chart-view-title").first()).toHaveCSS("font-size", "14px");
    await expect(destination.locator(".chart-view-title").first()).toHaveCSS("font-size", "14px");
    await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
    const full = page.getByRole("dialog", { name: "Edit chart", exact: true });
    await chartAuthoringWorkflow(full, { mode: "edit" }).goToConfigure();
    await sameGeometry(full.locator(".authoring-stage"), destination);
    await samePaint(full.locator(".authoring-stage"), destination);
    await full.locator('[data-icon-control="wizard.close-wizard"]').click();
    await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click();
    const monitor = page.locator(".audience-snapshot-monitor");
    await expect(monitor).toHaveAttribute("data-monitor-source", "local");
    await page.locator('[data-presentable-item-id="bio_r_values"] input').check();
    const local = monitor.locator(".audience-local-preview");
    await expect(local).toHaveAttribute("data-dashboard-style", style);
    await expect(local.locator(".chart-view-title").first()).toHaveCSS("font-size", "28px");
    await expect(local.locator("[data-chart-source-citation]").first()).toHaveText(sourceCaption);
    const popup = page.waitForEvent("popup");
    await page.locator('[data-presentation-control-id="rehearse"]').click();
    const audience = await popup;
    try {
      await audience.setViewportSize({ width: 1600, height: 1000 });
      await expect(audience.locator(".audience-theme-root").first()).toHaveAttribute("data-dashboard-style", style);
      await expect(audience.locator(".chart-view-title").first()).toHaveCSS("font-size", "28px");
      await expect(audience.locator("[data-chart-source-citation]").first()).toHaveText(sourceCaption);
      await expect(monitor).toHaveAttribute("data-monitor-source", "audience");
      await expect(monitor.locator("img")).toBeVisible();
      await expect.poll(() => monitor.locator("img").evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      const geometry = await audience.locator(".audience-display").evaluate(el => { const box = el.getBoundingClientRect(); return { width: box.width, height: box.height, x: box.x, y: box.y }; });
      expect(geometry.width / geometry.height).toBeCloseTo(16 / 9, 2);
      expect(geometry.y).toBeGreaterThan(0);
    } finally { await audience.close(); }
  });
}

test("authoring stage preserves destination geometry, rendered output and draft continuity across Quick Full and creation", async ({ page, request }) => {
  test.setTimeout(180_000);
  // Source/destination/control preflight before the representative journey.
  const config = await request.get("/config/dashboard.json");
  const bytes = await config.body();
  expect(createHash("sha256").update(bytes).digest("hex")).toBe("1fbde36ce8962f1b11c83ffbfedb424946716b6eff6bec3be79ff686914469ef");
  const dashboard = JSON.parse(bytes);
  const sourceChart = dashboard.pages.find(p => p.id === "biomedical").sections.find(s => s.id === "outbreak_dynamics").panels.find(c => c.id === "bio_r_values");
  expect(sourceChart.roles.measurements[0].field).toBe("R_value");
  const source = await request.get(`/${dashboard.dataSources[sourceChart.sourceId].path}`);
  expect(source.ok()).toBe(true);
  const sourceText = await source.text();
  expect(sourceText).toMatch(/date.*R_value/);
  const firstEpoch = parseCsvText(sourceText).map(row => Date.parse(row[sourceChart.roles.observation.field])).find(Number.isFinite);
  expect(Number.isFinite(firstEpoch)).toBe(true);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open the dashboard", exact: true }).click({ noWaitAfter: true });

  await openDashboardPage(page, "biomedical");
  const cursor = timeCursor(page);
  await cursor.open();
  await cursor.frame.fill(String(firstEpoch));
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click({ noWaitAfter: true });
  const destination = page.locator('[data-canonical-page-id] [data-canonical-panel-id="bio_r_values"]');
  await expect(destination).toBeVisible();
  await page.getByRole("treeitem", { name: "Reproduction value", exact: true }).click();
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  let stage = quick.locator(".authoring-stage");
  await sameGeometry(stage, destination);
  await expect(stage.getByRole("button", { name: "Fit to preview area", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(Number(await stage.getAttribute("data-stage-scale"))).toBeLessThan(1);
  await stage.getByRole("button", { name: "Actual size on dashboard", exact: true }).click();
  await expect(stage).toHaveAttribute("data-stage-scale", "1");
  const actualViewport = stage.locator(".authoring-stage__viewport");
  await expect.poll(() => actualViewport.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await samePaint(stage, destination);

  await quick.locator("#chart-footprint-width").selectOption("4");
  await sameGeometry(stage, destination);
  await quick.locator("#chart-footprint-row-height").selectOption("0.5");
  await sameGeometry(stage, destination);
  await expect(stage).toHaveAttribute("data-stage-height", "201");
  await stage.getByRole("button", { name: "Fit to preview area", exact: true }).click();
  await expect(quick).toHaveAttribute("data-chart-edit-dirty", "true");

  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  let full = page.getByRole("dialog", { name: "Edit chart", exact: true });
  const editFlow = chartAuthoringWorkflow(full, { mode: "edit" });
  stage = full.locator(".authoring-stage");
  await sameGeometry(stage, destination);
  await expect(stage).toHaveAttribute("data-stage-height", "201");
  await editFlow.goToConfigure();
  await expect(full.getByRole("textbox", { name: "Chart title", exact: true })).toBeVisible();
  await full.getByRole("textbox", { name: "Chart title", exact: true }).fill("Stage fidelity draft");
  await stage.getByRole("button", { name: "Actual size on dashboard", exact: true }).click();
  await samePaint(stage, destination);
  const show = stage.getByRole("button", { name: "Show on canvas", exact: true });
  await show.focus(); await show.press("Enter");
  await expect(full).toHaveAttribute("data-authoring-reveal", "true");
  await show.press("Escape");
  await expect(full).not.toHaveAttribute("data-authoring-reveal");
  await expect(full).toBeVisible(); await expect(show).toBeFocused();
  await show.hover(); await page.mouse.down();
  await expect(full).toHaveAttribute("data-authoring-reveal", "true");
  await show.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await expect(full).not.toHaveAttribute("data-authoring-reveal");
  await full.locator('[data-icon-control="wizard.close-wizard"]').click();
  await expect(full).toHaveCount(0);
  const owner = page.locator('[data-pending-work-kind="chart-edit"]');
  await owner.getByRole("button", { name: /^Resume / }).click();
  full = page.getByRole("dialog", { name: "Edit chart", exact: true });
  await expect(full.getByRole("textbox", { name: "Chart title", exact: true })).toHaveValue("Stage fidelity draft");
  await full.locator('[data-icon-control="editor.save-changes"]').click();
  await expect(full).toHaveCount(0);
  await expect(destination.getByRole("heading", { name: "Stage fidelity draft", exact: true })).toBeVisible();

  const createFlow = await openFreshChartAuthoring(page);
  const wizard = createFlow.wizard;
  await createFlow.selectExistingSource("R values — Biomedical");
  await createFlow.chooseChartType("line", /^Line\b/i);
  await createFlow.goToMapAndPrepare();
  await createFlow.selectRole("measurements", "R_value");
  await createFlow.selectRole("observation", "date");
  await createFlow.setFootprint({ columns: 4, rows: 0.5 });
  stage = wizard.locator(".authoring-stage");
  await expect(stage).toHaveClass(/chart-authoring-preview-ready/);
  await expect(stage).toHaveAttribute("data-stage-height", "201");
  const gridWidth = await destination.evaluate(el => el.closest(".layout-grid").getBoundingClientRect().width);
  expect(Math.abs(Number(await stage.getAttribute("data-stage-width")) - (gridWidth - 36))).toBeLessThan(1);
  await wizard.getByRole("textbox", { name: "Chart title", exact: true }).fill("Creation fidelity draft");
  await createFlow.suspend();
  const resumed = await resumeChartAuthoring(page);
  await expect(resumed.wizard.getByRole("textbox", { name: "Chart title", exact: true })).toHaveValue("Creation fidelity draft");
  await expect(resumed.wizard.locator(".authoring-stage")).toHaveAttribute("data-stage-height", "201");
  await resumed.wizard.getByRole("button", { name: "Discard chart draft", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard chart?", exact: true }).getByRole("button", { name: "Discard", exact: true }).click();
  await expect(page.locator('[data-pending-work-kind="chart-create"]')).toHaveCount(0);
});

async function sameGeometry(stage, destination) {
  await expect.poll(async () => {
    const box = await destination.boundingBox();
    const size = await stage.evaluate(el => ({ width: Number(el.dataset.stageWidth), height: Number(el.dataset.stageHeight) }));
    return Math.max(Math.abs(box.width - size.width), Math.abs(box.height - size.height));
  }).toBeLessThan(1);
}

async function samePaint(stage, destination) {
  await stage.locator(".chart-panel").first().scrollIntoViewIfNeeded();
  await stage.locator("canvas").first().waitFor();
  await destination.locator("canvas").first().waitFor();
  await stage.page().evaluate(() => document.fonts.ready);
  // Compare the actual painted chart at equal CSS dimensions; no screenshot
  // threshold or fixture-specific labels can hide reflow/legend/axis changes.
  await expect.poll(async () => {
    const preview = await stage.locator("canvas").first().evaluate(canvasSnapshot);
    const target = await destination.locator("canvas").first().evaluate(canvasSnapshot);
    return preview.painted && target.painted && preview.url === target.url;
  }, { timeout: 15_000 }).toBe(true);
  const targetHeading = await destination.locator(".chart-view-title").first().textContent();
  await expect(stage.locator(".chart-view-title").first()).toHaveText(targetHeading);
  const targetSource = await destination.locator(".chart-source-caption").first().textContent();
  await expect(stage.locator(".chart-source-caption").first()).toHaveText(targetSource);
}

function canvasSnapshot(canvas) {
  const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let painted = false;
  for (let i = 4; i < pixels.length; i += 4) {
    if (pixels[i] !== pixels[0] || pixels[i + 1] !== pixels[1]
      || pixels[i + 2] !== pixels[2] || pixels[i + 3] !== pixels[3]) {
      painted = true; break;
    }
  }
  return { painted, url: canvas.toDataURL() };
}
