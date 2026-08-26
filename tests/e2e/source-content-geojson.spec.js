import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const APP_URL = "http://127.0.0.1:4175/";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const SOURCE_NAME = "Journey I boundaries";
const GEOJSON_FILE = {
  name: "journey-i-boundaries.geojson",
  mimeType: "application/geo+json",
  buffer: Buffer.from(JSON.stringify({
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { id: "3", province: "Drenthe", label: "Journey I" },
      geometry: { type: "Polygon", coordinates: [[[4, 51], [6, 51], [6, 53], [4, 51]]] },
    }],
  })),
};

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
  await page.goto(APP_URL);
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    localStorage.removeItem("simex-dashboard-mode-v3");
  }, STORAGE_KEY);
  await page.reload();
});

test("Journey I — GeoJSON upload select preview dependency and blocked delete", async ({ page }) => {
  test.setTimeout(180_000);
  const target = { pageLabel: "Biomedical" };
  await openBuild(page, { width: 1440, height: 900 });
  const before = await geoJsonInventory(page);

  let manager = await openDataSourceManager(page);
  let intake = manager.getByRole("region", { name: "Add GeoJSON to dashboard" });
  await intake.getByRole("button", { name: "Add GeoJSON", exact: true }).click();
  await intake.getByLabel("GeoJSON file").setInputFiles(GEOJSON_FILE);
  await expect(intake.getByLabel("Display name")).toHaveValue("journey i boundaries");
  await expect(intake).toContainText("1 feature");
  await expect(intake).toContainText("Polygon 1");
  await expect(intake).toContainText("Renderable fragments");
  await expect(intake.getByLabel("GeoJSON preview summary")).toContainText("Bounds 4, 51, 6, 53");
  await intake.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await geoJsonInventory(page)).toEqual(before);

  await intake.getByRole("button", { name: "Add GeoJSON", exact: true }).click();
  await intake.getByLabel("GeoJSON file").setInputFiles(GEOJSON_FILE);
  await intake.getByLabel("Display name").fill(SOURCE_NAME);
  await intake.getByRole("button", { name: "Add to dashboard", exact: true }).click();
  await expect(manager.locator(".source-content-row").filter({ hasText: SOURCE_NAME }).first()).toBeVisible();
  const added = await geoJsonInventory(page);
  expect(added.sourceIds).toHaveLength(before.sourceIds.length + 1);
  expect(added.profileIds).toEqual([]);
  expect(added.unusedNames).toContain(SOURCE_NAME);

  await closeManager(page);
  await page.reload();
  await openBuild(page, { width: 1440, height: 900 });
  await openTargetPage(page, target);
  manager = await openDataSourceManager(page);
  await selectSourceRow(manager, SOURCE_NAME);
  let detail = manager.getByRole("region", { name: "Content detail" });
  await expect(detail).toContainText("1 feature");
  await expect(detail.getByLabel("GeoJSON preview summary")).toBeVisible();
  await expect(detail.getByLabel("Search property keys")).toBeVisible();
  await expect(detail).toContainText("id");
  expect(await managerOverflow(manager)).toBe(false);
  await closeManager(page);

  await seedPackagedSource(page);
  await page.reload();
  await openBuild(page, { width: 1440, height: 900 });
  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add new chart" });
  await expectExactSixStages(wizard);
  await wizard.getByLabel("Destination page").selectOption("biomedical");
  await wizard.getByLabel("Destination section").selectOption("outbreak_dynamics");
  await wizard.getByRole("navigation", { name: "Chart creation steps" }).getByRole("button", { name: /^Chart type\./ }).click();
  await wizard.getByLabel("Search chart types").fill("map scatter");
  await wizard.getByRole("button", { name: /Map scatter/i }).click();
  await wizard.getByRole("navigation", { name: "Chart creation steps" }).getByRole("button", { name: /^Data source\./ }).click();
  const geoOptions = await wizard.getByLabel("GeoJSON source").locator("option").allTextContents();
  expect(geoOptions).toContain(SOURCE_NAME);
  expect(geoOptions).toContain("Journey I packaged boundaries");
  expect(geoOptions).not.toContain("Journey I generated boundaries");
  expect(geoOptions.some((label) => /Netherlands|municipalit|province/i.test(label))).toBe(true);
  await expect(wizard.getByLabel("Upload GeoJSON")).toBeVisible();
  await wizard.getByLabel("Upload GeoJSON").setInputFiles({ ...GEOJSON_FILE, name: "journey-i-staged-close.geojson" });
  const stagedGeoSourceId = await wizard.getByLabel("GeoJSON source").inputValue();
  expect(stagedGeoSourceId).toContain("journey-i-staged-close");
  await page.keyboard.press("Escape");
  await expect(wizard).toHaveCount(0);
  await page.getByRole("button", { name: "Resume chart draft", exact: true }).click();
  await expect(wizard).toBeVisible();
  await expect(wizard.getByLabel("GeoJSON source").locator(`option[value="${stagedGeoSourceId}"]`)).toHaveCount(0);
  await wizard.getByLabel("Managed data source").selectOption("bio_wastewater_latest");
  await wizard.getByLabel("GeoJSON source").selectOption({ label: SOURCE_NAME });
  await wizard.getByRole("navigation", { name: "Chart creation steps" }).getByRole("button", { name: /^Map and prepare data\./ }).click();
  await wizard.locator('[data-field-id="geography"] select').selectOption("province");
  await wizard.locator('[data-field-id="value"] select').selectOption("virus_particles");
  await wizard.locator('[data-field-id="time"] select').selectOption("date");
  await wizard.getByRole("navigation", { name: "Chart creation steps" }).getByRole("button", { name: /^Configure chart\./ }).click();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
  await wizard.getByLabel("Chart title").fill("Journey I managed map");
  await wizard.getByRole("navigation", { name: "Chart creation steps" }).getByRole("button", { name: /^Review and create\./ }).click();
  await wizard.getByRole("button", { name: "Create chart", exact: true }).click();
  await expect(wizard).toHaveCount(0);

  await seedMapBudgetCopies(page);
  await page.reload();
  await openBuild(page, { width: 1440, height: 900 });
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  const seededMaps = page.locator('[data-canonical-section-id="outbreak_dynamics"] [data-panel-id^="journey-i-map-"]');
  await expect(seededMaps).toHaveCount(4);
  for (let index = 0; index < 3; index += 1) {
    await seededMaps.nth(index).scrollIntoViewIfNeeded();
    await expect(seededMaps.nth(index)).toBeVisible();
  }
  await expect(page.locator('[data-map-budget-status="degraded"]').first()).toBeVisible();
  manager = await openDataSourceManager(page);
  await manager.getByLabel("Filter by usage").selectOption("used");
  await selectSourceRow(manager, SOURCE_NAME);
  detail = manager.getByRole("region", { name: "Content detail" });
  await expect(detail).toContainText("HeV-A26 Dashboard: Epidemiological overview › Outbreak dynamics › Journey I managed map");
  await expect(detail.getByRole("button", { name: "Delete", exact: true })).toBeDisabled();
  await expect(page.getByRole("dialog", { name: /Delete/ })).toHaveCount(0);
  const desktopBudget = await mapBudgetSnapshot(page);
  expect(desktopBudget.allocated).toBeLessThanOrEqual(4);
  expect(desktopBudget.normal).toBeLessThanOrEqual(2);
  expect(desktopBudget.total).toBeGreaterThan(0);
  await expect(page.getByText("Additional live map — performance may be reduced.").first()).toBeVisible();
  expect(await managerOverflow(manager)).toBe(false);
  await closeManager(page);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await openBuild(page, { width: 1024, height: 768 });
  await openTargetPage(page, target);
  manager = await openDataSourceManager(page);
  expect(await manager.getAttribute("data-manager-layout")).toBe("tablet");
  await manager.getByLabel("Filter by usage").selectOption("used");
  await selectSourceRow(manager, SOURCE_NAME);
  await expect(manager.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  detail = manager.getByRole("region", { name: "Content detail" });
  await expect(detail).toContainText("HeV-A26 Dashboard: Epidemiological overview › Outbreak dynamics › Journey I managed map");
  await expect(detail.getByRole("button", { name: "Delete", exact: true })).toBeDisabled();
  await expect(detail.getByLabel("GeoJSON preview summary")).toBeVisible();
  expect(await managerOverflow(manager)).toBe(false);

  const tabletBeforeCancel = await geoJsonInventory(page);
  await manager.getByRole("button", { name: "Back", exact: true }).click();
  intake = manager.getByRole("region", { name: "Add GeoJSON to dashboard" });
  await intake.getByRole("button", { name: "Add GeoJSON", exact: true }).click();
  await intake.getByLabel("GeoJSON file").setInputFiles({ ...GEOJSON_FILE, name: "journey-i-tablet-cancel.geojson" });
  await intake.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await geoJsonInventory(page)).toEqual(tabletBeforeCancel);
});

test("Journey J — invalid GeoJSON replacement blocks and imports as new", async ({ page }) => {
  test.setTimeout(180_000);
  await openBuild(page, { width: 1440, height: 900 });
  await persistDashboardForReplacement(page, "J");
  const target = await seedGeoJsonReplacementTarget(page, "J");
  await page.reload();
  await openBuild(page, { width: 1440, height: 900 });
  await openTargetPage(page, target);
  const panel = page.locator(`.chart-panel[data-panel-id="${target.chartId}"]`);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator("canvas").first()).toBeVisible();
  const before = await geoJsonReplacementSnapshot(page, target);

  let manager = await openDataSourceManager(page);
  await selectSourceRow(manager, target.displayName);
  let detail = manager.getByRole("region", { name: "Content detail" });
  let trigger = detail.getByRole("button", { name: "Replace file", exact: true });
  await trigger.click();
  let dialog = page.getByRole("dialog", { name: `Replace ${target.displayName} file?` });
  await dialog.getByLabel("Replacement GeoJSON").setInputFiles(invalidJoinReplacement(target));
  await expect(dialog.getByRole("alert")).toHaveAttribute("data-replacement-reason", "selected-join-field-absent");
  await expect(dialog.getByRole("region", { name: "Affected panels" })).toContainText(target.chartTitle);
  await expect(dialog.getByRole("button", { name: "Import as new source" })).toBeEnabled();
  expect(await geoJsonReplacementSnapshot(page, target)).toEqual(before);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(await geoJsonReplacementSnapshot(page, target)).toEqual(before);

  await trigger.click();
  dialog = page.getByRole("dialog", { name: `Replace ${target.displayName} file?` });
  await dialog.getByLabel("Replacement GeoJSON").setInputFiles(invalidJoinReplacement(target));
  await dialog.getByRole("button", { name: "Import as new source" }).click();
  await expect(dialog.getByRole("status").filter({ hasText: "Imported as" })).toBeVisible();
  const imported = await geoJsonReplacementSnapshot(page, target);
  expect(imported.sourceIdentity).toEqual(before.sourceIdentity);
  expect(imported.entry).toEqual(before.entry);
  expect(imported.chart).toEqual(before.chart);
  expect(imported.temporal).toEqual(before.temporal);
  expect(imported.managedGeoJsonIds).toHaveLength(before.managedGeoJsonIds.length + 1);
  const importedId = imported.managedGeoJsonIds.find((id) => !before.managedGeoJsonIds.includes(id));
  expect(importedId).toBeTruthy();
  expect(importedId).not.toBe(target.sourceId);
  const importedEntry = await page.evaluate(({ key, sourceId }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const entry = dashboard.contentLibrary.sourceEntries[sourceId];
    return { origin: entry.origin, provenance: entry.provenance };
  }, { key: STORAGE_KEY, sourceId: importedId });
  expect(importedEntry).toEqual({
    origin: "uploaded",
    provenance: { fileName: "journey-j-invalid.geojson" },
  });
  await expect(detail).toContainText("2 features");
  await expect(detail).toContainText("4, 52, 5, 52");
  await dialog.getByRole("region", { name: "Affected panels" }).getByRole("button", { name: new RegExp(target.chartTitle) }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Source content authoring" })).toHaveCount(0);
  await expect(panel.locator("canvas").first()).toBeVisible();
  expect((await geoJsonReplacementSnapshot(page, target)).render).toEqual(before.render);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await openBuild(page, { width: 1024, height: 768 });
  await openTargetPage(page, target);
  manager = await openDataSourceManager(page);
  await selectSourceRow(manager, target.displayName);
  detail = manager.getByRole("region", { name: "Content detail" });
  trigger = detail.getByRole("button", { name: "Replace file", exact: true });
  await trigger.click();
  dialog = page.getByRole("dialog", { name: `Replace ${target.displayName} file?` });
  await dialog.getByLabel("Replacement GeoJSON").setInputFiles(invalidJoinReplacement(target));
  await expect(dialog.getByRole("alert")).toHaveAttribute("data-replacement-reason", "selected-join-field-absent");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(await managerOverflow(manager)).toBe(false);
});

test("Journey K — valid GeoJSON geometry change warns then confirms", async ({ page }) => {
  test.setTimeout(180_000);
  await openBuild(page, { width: 1440, height: 900 });
  await persistDashboardForReplacement(page, "K");
  const target = await seedGeoJsonReplacementTarget(page, "K");
  await page.reload();
  await openBuild(page, { width: 1440, height: 900 });
  await openTargetPage(page, target);
  const panel = page.locator(`.chart-panel[data-panel-id="${target.chartId}"]`);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator("canvas").first()).toBeVisible();
  const before = await geoJsonReplacementSnapshot(page, target);

  let manager = await openDataSourceManager(page);
  await selectSourceRow(manager, target.displayName);
  let detail = manager.getByRole("region", { name: "Content detail" });
  let trigger = detail.getByRole("button", { name: "Replace file", exact: true });
  await trigger.click();
  let dialog = page.getByRole("dialog", { name: `Replace ${target.displayName} file?` });
  await dialog.getByLabel("Replacement GeoJSON").setInputFiles(changedGeometryReplacement(target));
  const warnings = dialog.getByRole("region", { name: "GeoJSON replacement warnings" });
  await expect(warnings.locator('[data-replacement-warning="bounding-box-changed"]')).toBeVisible();
  await expect(warnings.locator('[data-replacement-warning="geometry-mix-changed"]')).toBeVisible();
  await expect(warnings.locator('[data-replacement-warning="join-coverage-reduced"]')).toContainText("falls from 2 of 2 to 1 of 2");
  await expect(dialog).not.toContainText("Chrono Group");
  await expect(dialog).not.toContainText("Scene presentation");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(await geoJsonReplacementSnapshot(page, target)).toEqual(before);

  await trigger.click();
  dialog = page.getByRole("dialog", { name: `Replace ${target.displayName} file?` });
  await dialog.getByLabel("Replacement GeoJSON").setInputFiles(changedGeometryReplacement(target));
  await dialog.getByRole("button", { name: "Confirm GeoJSON replacement" }).click();
  await expect(dialog).toHaveCount(0);
  await closeManager(page);
  await expect(panel.locator("canvas").first()).toBeVisible();
  const confirmed = await geoJsonReplacementSnapshot(page, target);
  expect(confirmed.sourceId).toBe(before.sourceId);
  expect(confirmed.sourceIdentity.fileName).toBe("journey-k-changed.geojson");
  expect(confirmed.entry.sourceId).toBe(before.entry.sourceId);
  expect(confirmed.chart).toEqual(before.chart);
  expect(confirmed.temporal).toEqual(before.temporal);
  expect(confirmed.render).not.toEqual(before.render);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await openBuild(page, { width: 1024, height: 768 });
  await openTargetPage(page, target);
  const tabletPanel = page.locator(`.chart-panel[data-panel-id="${target.chartId}"]`);
  await tabletPanel.scrollIntoViewIfNeeded();
  await expect(tabletPanel.locator("canvas").first()).toBeVisible();
  manager = await openDataSourceManager(page);
  await selectSourceRow(manager, target.displayName);
  detail = manager.getByRole("region", { name: "Content detail" });
  await expect(detail).toContainText("LineString 2, Point 1");
  await expect(detail).toContainText("7, 53, 10, 55");
  expect(await managerOverflow(manager)).toBe(false);
  const tablet = await geoJsonReplacementSnapshot(page, target);
  expect(tablet.sourceIdentity).toEqual(confirmed.sourceIdentity);
  expect(tablet.temporal).toEqual(before.temporal);
});

async function openBuild(page, viewport) {
  await page.setViewportSize(viewport);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  const home = page.locator(".dashboard-command-page-scroller").getByRole("button", { name: "Home", exact: true });
  if (await home.count()) await home.click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
}

async function openDataSourceManager(page) {
  await page.getByRole("button", { name: "Source content", exact: true }).click();
  const manager = page.locator(".source-content-workspace");
  await expect(manager).toBeVisible();
  await manager.getByRole("tab", { name: "Data sources", exact: true }).click();
  return manager;
}

async function closeManager(page) {
  const host = page.getByRole("complementary", { name: "Source content authoring" });
  await host.getByRole("button", { name: "Close", exact: true }).click();
  await expect(host).toHaveCount(0);
}

async function selectSourceRow(manager, name) {
  await manager.getByLabel("Search data sources").fill(name);
  const row = manager.locator(".source-content-row").filter({ hasText: name }).first();
  await expect(row).toBeVisible();
  await row.click();
}

async function expectExactSixStages(wizard) {
  const labels = await wizard.getByRole("navigation", { name: "Chart creation steps" }).getByRole("button").allTextContents();
  expect(labels.map((label) => label.replace(
    /(Complete|In progress|Not started|Waiting on prerequisite|Needs attention)$/u,
    "",
  ))).toEqual(["Destination", "Chart type", "Data source", "Map and prepare data", "Configure chart", "Review and create"]);
}

async function geoJsonInventory(page) {
  return page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    if (!dashboard) return { sourceIds: [], profileIds: [], unusedNames: [] };
    const entries = dashboard.contentLibrary?.sourceEntries ?? {};
    const sourceIds = Object.keys(dashboard.dataSources ?? {}).filter((id) => (
      dashboard.dataSources[id]?.kind === "dataset"
      && dashboard.dataSources[id]?.type === "uploadedGeoJson"
      && entries[id]
    )).sort();
    const used = new Set(dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .map((chart) => chart.presentation?.map?.geoSource).filter(Boolean));
    return {
      sourceIds,
      profileIds: sourceIds.filter((id) => dashboard.datasetProfiles?.[id]).sort(),
      unusedNames: sourceIds.filter((id) => !used.has(id)).map((id) => entries[id].displayName).sort(),
    };
  }, STORAGE_KEY);
}

async function seedPackagedSource(page) {
  await page.evaluate(async ({ key, sourceName }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const sourceId = Object.keys(dashboard.contentLibrary.sourceEntries)
      .find((id) => dashboard.contentLibrary.sourceEntries[id].displayName === sourceName);
    const packagedId = "journey-i-packaged";
    dashboard.dataSources[packagedId] = {
      ...structuredClone(dashboard.dataSources[sourceId]),
      provenance: { label: "Journey I packaged boundaries" },
    };
    if (dashboard.loadedData?.[sourceId]) {
      dashboard.loadedData[packagedId] = structuredClone(dashboard.loadedData[sourceId]);
    }
    dashboard.contentLibrary.sourceEntries[packagedId] = {
      sourceId: packagedId,
      origin: "packaged",
      ownership: "builder",
      displayName: "Journey I packaged boundaries",
      provenance: { fileName: "journey-i-packaged.geojson" },
      health: "ready",
    };
    const generatedId = "journey-i-generated";
    dashboard.dataSources[generatedId] = {
      ...structuredClone(dashboard.dataSources[sourceId]),
      provenance: { label: "Journey I generated boundaries" },
    };
    if (dashboard.loadedData?.[sourceId]) {
      dashboard.loadedData[generatedId] = structuredClone(dashboard.loadedData[sourceId]);
    }
    dashboard.contentLibrary.sourceEntries[generatedId] = {
      sourceId: generatedId,
      origin: "generated",
      ownership: "dashboard",
      displayName: "Journey I generated boundaries",
      provenance: { generated: true },
      health: "ready",
    };
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, { key: STORAGE_KEY, sourceName: SOURCE_NAME });
}

async function seedMapBudgetCopies(page) {
  await page.evaluate(({ key }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const section = dashboard.pages.flatMap(({ sections }) => sections)
      .find(({ panels }) => panels.some((panel) => (panel.chart ?? panel).title === "Journey I managed map"));
    const template = section.panels.map((panel) => panel.chart ?? panel)
      .find((chart) => chart.title === "Journey I managed map");
    section.panels = section.panels.filter((panel) => !(panel.chart ?? panel).id.startsWith("journey-i-map-"));
    for (let index = 2; index <= 5; index += 1) {
      const chart = structuredClone(template);
      chart.id = `journey-i-map-${index}`;
      chart.title = `Journey I map ${index}`;
      chart.layout = { ...chart.layout, size: "standard", width: 6, height: 3 };
      section.panels.push(chart);
    }
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, { key: STORAGE_KEY });
}

async function managerOverflow(manager) {
  return manager.evaluate((node) => node.scrollWidth > node.clientWidth + 1);
}

async function mapBudgetSnapshot(page) {
  return page.locator("[data-map-budget-status]").evaluateAll((nodes) => {
    const statuses = nodes.map((node) => node.getAttribute("data-map-budget-status"));
    return {
      total: statuses.length,
      normal: statuses.filter((status) => status === "normal").length,
      allocated: statuses.filter((status) => status === "normal" || status === "degraded").length,
      deferred: statuses.filter((status) => status === "deferred").length,
    };
  });
}

async function seedGeoJsonReplacementTarget(page, journey) {
  return page.evaluate(({ key, journeyName }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const refs = dashboard.pages.flatMap((pageValue) => pageValue.sections.flatMap((section) => (
      section.panels.map((placement) => ({ page: pageValue, section, placement, chart: placement.chart ?? placement }))
    )));
    const target = refs.find(({ chart }) => chart.id === "bio_municipality_choropleth_animation")
      ?? refs.find(({ chart }) => chart.presentation?.map?.geoSource && dashboard.loadedData?.[chart.sourceId]);
    if (!target) throw new Error(`Journey ${journeyName} requires a live map chart.`);
    const dataDisplayName = `Journey ${journeyName} map data`;
    const dataSourceId = Object.keys(dashboard.contentLibrary?.sourceEntries ?? {})
      .find((id) => dashboard.contentLibrary.sourceEntries[id].displayName === dataDisplayName);
    if (!dataSourceId) throw new Error(`Journey ${journeyName} requires its manager-added map data.`);
    target.chart.sourceId = dataSourceId;
    target.chart.roles = {
      geography: { field: "municipality", interpretation: "geographic" },
      value: { field: "cases" },
      time: { field: "date", interpretation: "temporal" },
    };
    const values = ["A", "B"];
    const sourceId = `journey-${journeyName.toLowerCase()}-boundaries`;
    const displayName = `Journey ${journeyName} boundaries`;
    const joinField = target.chart.presentation.map.joinField || "journeyCode";
    target.chart.presentation.map.joinField = joinField;
    target.chart.presentation.map.geoSource = sourceId;
    const geoJson = {
      type: "FeatureCollection",
      features: [...values.map((value, index) => ({
        type: "Feature",
        properties: { [joinField]: value, label: `Journey ${journeyName} ${index + 1}` },
        geometry: { type: "Point", coordinates: [4 + index, 52] },
      })), ...(journeyName === "K" ? [{
        type: "Feature",
        properties: { [joinField]: "journey-k-original-unmatched", label: "Journey K original line" },
        geometry: { type: "LineString", coordinates: [[4, 51], [5, 51]] },
      }] : [])],
    };
    dashboard.dataSources[sourceId] = { kind: "dataset", type: "uploadedGeoJson", fileName: `${sourceId}.geojson`, geoJson, provenance: { label: displayName } };
    dashboard.contentLibrary ??= { mediaItems: {}, sourceEntries: {} };
    dashboard.contentLibrary.sourceEntries ??= {};
    dashboard.contentLibrary.sourceEntries[sourceId] = {
      sourceId, origin: "uploaded", ownership: "builder", displayName,
      provenance: { fileName: `${sourceId}.geojson` }, health: "ready",
    };
    localStorage.setItem(key, JSON.stringify(dashboard));
    return { sourceId, displayName, chartId: target.chart.id, chartTitle: target.chart.title, pageLabel: target.page.label ?? target.page.title, joinField, values };
  }, { key: STORAGE_KEY, journeyName: journey });
}

async function openTargetPage(page, target) {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: target.pageLabel, exact: true }).click();
}

async function persistDashboardForReplacement(page, journey) {
  const manager = await openDataSourceManager(page);
  const intake = manager.getByRole("region", { name: "Add GeoJSON to dashboard" });
  await intake.getByRole("button", { name: "Add GeoJSON", exact: true }).click();
  await intake.getByLabel("GeoJSON file").setInputFiles({ ...GEOJSON_FILE, name: `journey-${journey.toLowerCase()}-seed.geojson` });
  await intake.getByLabel("Display name").fill(`Journey ${journey} seed`);
  await intake.getByRole("button", { name: "Add to dashboard", exact: true }).click();
  const csvIntake = manager.getByRole("region", { name: "Add CSV to dashboard" });
  await csvIntake.getByRole("button", { name: "Add CSV", exact: true }).click();
  await csvIntake.getByLabel("CSV file").setInputFiles({
    name: `journey-${journey.toLowerCase()}-map.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from("date,municipality,cases\n2026-01-01,A,4\n2026-01-01,B,7\n"),
  });
  await csvIntake.getByLabel("Display name").fill(`Journey ${journey} map data`);
  await csvIntake.getByRole("button", { name: "Add to dashboard", exact: true }).click();
  await closeManager(page);
}

function invalidJoinReplacement(target) {
  return geoJsonFile("journey-j-invalid.geojson", {
    type: "FeatureCollection",
    features: target.values.map((value, index) => ({
      type: "Feature",
      properties: { removedJoin: value },
      geometry: { type: "Point", coordinates: [6 + index, 53] },
    })),
  });
}

function changedGeometryReplacement(target) {
  return geoJsonFile("journey-k-changed.geojson", {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { [target.joinField]: target.values[0] },
      geometry: { type: "Point", coordinates: [7, 53] },
    }, {
      type: "Feature",
      properties: { [target.joinField]: "journey-k-unmatched" },
      geometry: { type: "LineString", coordinates: [[8, 53], [9, 53]] },
    }, {
      type: "Feature",
      properties: { [target.joinField]: "journey-k-unmatched-2" },
      geometry: { type: "LineString", coordinates: [[9, 54], [10, 55]] },
    }],
  });
}

function geoJsonFile(name, value) {
  return { name, mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify(value)) };
}

async function geoJsonReplacementSnapshot(page, target) {
  return page.evaluate(({ key, targetValue }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const chart = dashboard.pages.flatMap(({ sections }) => sections).flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement).find(({ id }) => id === targetValue.chartId);
    const canvas = document.querySelector(`.chart-panel[data-panel-id="${CSS.escape(targetValue.chartId)}"] canvas`);
    return {
      sourceId: targetValue.sourceId,
      source: dashboard.dataSources[targetValue.sourceId],
      sourceIdentity: {
        kind: dashboard.dataSources[targetValue.sourceId]?.kind,
        type: dashboard.dataSources[targetValue.sourceId]?.type,
        fileName: dashboard.dataSources[targetValue.sourceId]?.fileName,
        provenance: dashboard.dataSources[targetValue.sourceId]?.provenance,
      },
      payload: dashboard.loadedData?.[targetValue.sourceId] ?? dashboard.dataSources[targetValue.sourceId]?.geoJson,
      entry: dashboard.contentLibrary?.sourceEntries?.[targetValue.sourceId],
      chart,
      temporal: { chronoGroups: dashboard.chronoGroups ?? [], scenes: dashboard.scenes ?? [] },
      managedGeoJsonIds: Object.entries(dashboard.contentLibrary?.sourceEntries ?? {})
        .filter(([id]) => dashboard.dataSources?.[id]?.type === "uploadedGeoJson")
        .map(([id]) => id).sort(),
      render: canvas?.toDataURL() ?? null,
    };
  }, { key: STORAGE_KEY, targetValue: target });
}
