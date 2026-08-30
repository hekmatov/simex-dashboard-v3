import { expect, test } from "@playwright/test";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";
import {
  chartAuthoringWorkflow,
  openChartAuthoring,
} from "./support/chart-authoring-workflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const TIMELINE_FIXTURE = {
  name: "timeline-events.csv",
  mimeType: "text/csv",
  buffer: Buffer.from([
    "event,start,end,lane,status",
    "Hospital escalation,2027-05-01,2027-05-02,Health coordination,active",
    "Evacuation decision,2027-05-02,2027-05-03,Civil protection,planned",
  ].join("\n")),
};

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
  await page.addInitScript(() => {
    const stringify = JSON.stringify;
    JSON.stringify = function patchedStringify(value, ...args) {
      if (
        globalThis.__SIMEX_FAIL_CHART_SERIALIZE_ONCE__ === true
        && value?.pages?.some(({ sections }) => sections?.some(({ panels }) => (
          panels?.some((placement) => (
            (placement.chart ?? placement)?.title === "Durable quick save"
          ))
        )))
      ) {
        globalThis.__SIMEX_FAIL_CHART_SERIALIZE_ONCE__ = false;
        throw new Error("Dashboard persistence is temporarily unavailable.");
      }
      if (
        globalThis.__SIMEX_FAIL_CHART_REMOVE_SERIALIZE_ONCE__ === true
        && Array.isArray(value?.pages)
        && !value.pages.some(({ sections }) => sections?.some(({ panels }) => (
          panels?.some((placement) => placement.id === "bio_confirmed_cases")
        )))
      ) {
        globalThis.__SIMEX_FAIL_CHART_REMOVE_SERIALIZE_ONCE__ = false;
        throw new Error("Chart removal persistence is temporarily unavailable.");
      }
      return stringify.call(this, value, ...args);
    };
  });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByRole("button", { name: "Build" }).click();
});

test("source-first existing CSV pie authoring progressively reveals schema fields and persists the created chart", async ({
  page,
}) => {
  test.setTimeout(240_000);
  let flow = await openChartAuthoring(page);
  let { wizard } = flow;

  await expect(flow.stageButton("destination"))
    .toHaveAttribute("data-status", "Complete");
  await expect(flow.stageButton("dataSource"))
    .toHaveAttribute("data-status", "Not started");
  await expect(flow.stageButton("chartType"))
    .toHaveAttribute("data-status", "Waiting on prerequisite");
  await expect(flow.stageButton("mapAndPrepare"))
    .toHaveAttribute("data-status", "Waiting on prerequisite");
  await expect(flow.stageButton("configure"))
    .toHaveAttribute("data-status", "Waiting on prerequisite");
  await expect(flow.stageButton("review"))
    .toHaveAttribute("data-status", "Waiting on prerequisite");

  await flow.selectExistingSource("Biomedical mortality by age");
  await flow.goToChartType();
  await expectChartTypeCardsAligned(wizard, "creation");
  await wizard.getByRole("button", { name: /^Pie\b/i }).click();
  await flow.goToConfigure();
  await expect(wizard.getByLabel("Chart title")).toBeVisible();
  await expect(wizard.getByLabel("Title alignment")).toHaveCount(0);
  await expect(wizard.locator('[data-color-field="background"]')).toHaveCount(0);

  await wizard.getByRole("button", { name: "Close" }).click();
  await expect(wizard).toHaveCount(0);
  await expect(page.locator('[data-pending-work-kind="chart-create"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  wizard = page.getByRole("dialog", { name: "Add new chart" });
  flow = chartAuthoringWorkflow(wizard);

  await wizard.getByRole("button", { name: "Discard chart draft" }).click();
  const discard = page.getByRole("dialog", { name: "Discard chart?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Continue editing" }).click();
  await expect(wizard).toBeVisible();

  await wizard.getByRole("button", { name: "Discard chart draft" }).click();
  await discard.getByRole("button", { name: "Discard" }).click();
  await expect(wizard).toHaveCount(0);

  flow = await openChartAuthoring(page);
  wizard = flow.wizard;
  await flow.selectExistingSource("Biomedical mortality by age");
  await expect(
    wizard.getByRole("region", { name: "Selected source profile" }),
  ).toContainText("Age group");
  await expect(
    wizard.getByRole("region", { name: "Selected source profile" }),
  ).toContainText("deaths");
  await flow.chooseChartType("pie", /^Pie\b/i);

  await flow.goToMapAndPrepare();
  await flow.selectRole("category", "Age group");
  await flow.selectRole("value", "deaths");

  await flow.goToConfigure();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
  await expect(wizard.getByLabel("Title alignment")).toBeVisible();
  await expect(wizard.locator('[data-color-field="background"]')).toHaveCount(1);
  await expect(
    wizard.getByRole("group", { name: "Series colors" }),
  ).toBeVisible();
  await wizard.getByRole("button", { name: "Add color" }).click();
  await wizard.getByLabel("Color 1", { exact: true }).fill("#DC2626");
  await wizard.getByLabel("Chart title").fill("E2E mortality composition");
  await flow.goToReview();
  await wizard.getByRole("button", { name: "Create chart" }).click();

  await expect(wizard).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const chart = dashboard.pages
      .flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .find(({ title, typeId }) => (
        title === "E2E mortality composition" && typeId === "pie"
      ));
    return chart?.presentation?.series?.colors ?? null;
  }, STORAGE_KEY)).toEqual(["#DC2626"]);
});

test("wizard eyedropper reveals the dashboard and Escape preserves the draft", async ({ page }) => {
  const flow = await openChartAuthoring(page);
  const { wizard } = flow;
  await flow.selectExistingSource("Biomedical mortality by age");
  await flow.chooseChartType("pie", /^Pie\b/i);
  await flow.goToMapAndPrepare();
  await flow.selectRole("category", "Age group");
  await flow.selectRole("value", "deaths");
  await flow.goToConfigure();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();

  const picker = wizard.getByRole("button", {
    name: "Pick background from dashboard",
  });
  await picker.click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-simex-eyedropper-active",
    "true",
  );
  const backdrop = page.locator(".chart-wizard-backdrop").filter({ has: wizard });
  await expect(backdrop).toHaveCSS("opacity", "0");
  await expect(backdrop).toHaveCSS("pointer-events", "none");

  await page.keyboard.press("Escape");

  await expect(page.locator("html")).not.toHaveAttribute(
    "data-simex-eyedropper-active",
    "true",
  );
  await expect(wizard).toBeVisible();
  await expect(wizard.getByLabel("Chart title")).toBeVisible();
});

for (const scenario of [
  {
    typeId: "scatter",
    query: "scatter",
    name: /^Scatter\b/i,
    sourceId: "bio_municipal_infections",
    roles: {
      x: "population",
      y: "infectionsPer10000",
      label: "Gemeentenaam",
    },
    title: "E2E municipal relationship",
    visibleSections: ["Axes", "Interactions"],
    absentSections: ["Collection", "Timeline", "Map"],
    resolveDuplicates: true,
  },
  {
    typeId: "heatmap",
    query: "heatmap",
    name: /^Heatmap\b/i,
    sourceId: "socio_behaviour",
    roles: {
      row: "Question",
      column: "Month Label",
      value: "Percentage",
      time: "date",
    },
    title: "E2E preparedness heatmap",
    visibleSections: [],
    absentSections: ["Axes", "Collection", "Timeline", "Map"],
    resolveDuplicates: true,
  },
  {
    typeId: "bullet",
    query: "bullet",
    name: /^Bullet\b/i,
    sourceId: "bio_province_deltas",
    roles: {
      actual: "Infected_total",
      target: "Previous cumulative cases",
      entity: "province",
      time: "date",
    },
    title: "E2E provincial target collection",
    visibleSections: ["Targets", "Collection"],
    absentSections: ["Axes", "Timeline", "Map"],
    filter: {
      field: "date",
      value: "2027-08-15",
    },
  },
  {
    typeId: "deltaCard",
    query: "delta card",
    name: /^Delta card\b/i,
    sourceId: "bio_province_deltas",
    roles: {
      measurement: "Infected_total",
      entity: "province",
      time: "date",
    },
    title: "E2E provincial delta",
    visibleSections: ["Targets"],
    absentSections: ["Axes", "Collection", "Timeline", "Map"],
    expectedDataField: "Comparison",
    filter: {
      field: "province",
      value: "Drenthe",
    },
  },
]) {
  test(`${scenario.typeId} uses its own live roles and contextual style sections`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const flow = await openChartAuthoring(page);
    const { wizard } = flow;
    await flow.selectExistingSource(sourceLabel(scenario.sourceId));
    await flow.chooseChartType(scenario.query, scenario.name);
    await flow.goToMapAndPrepare();
    for (const [roleId, column] of Object.entries(scenario.roles)) {
      await flow.selectRole(roleId, column);
    }
    if (scenario.resolveDuplicates) {
      await expect(wizard.locator('[data-field-id="duplicates"]')).toBeVisible();
      await wizard.locator('[data-field-id="duplicates"] select')
        .selectOption("last");
    }
    if (scenario.filter) {
      const filters = wizard.locator('[data-field-id="filters"]');
      await filters.getByRole("button", { name: "Add filter" }).click();
      await filters.getByLabel("Filter column").selectOption(
        scenario.filter.field,
      );
      await filters.getByLabel("Value").fill(scenario.filter.value);
    }
    if (scenario.expectedDataField) {
      await expect(wizard.getByText(scenario.expectedDataField, {
        exact: true,
      })).toBeVisible();
    }

    await flow.goToConfigure();
    await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
    await expect(wizard.getByRole("heading", { name: "Appearance" }))
      .toBeVisible();
    await expect(wizard.getByRole("heading", { name: "Labels" }))
      .toBeVisible();
    for (const heading of scenario.visibleSections) {
      await expect(wizard.getByRole("heading", { name: heading })).toBeVisible();
    }
    for (const heading of scenario.absentSections) {
      await expect(wizard.getByRole("heading", { name: heading })).toHaveCount(0);
    }
    await flow.createChart(scenario.title);
    await expectStoredChart(page, scenario.typeId, scenario.title);
  });
}

test("bullet renderer preflight prevents a false-ready collection with colliding identity", async ({
  page,
}) => {
  const flow = await openChartAuthoring(page);
  const { wizard } = flow;
  await flow.uploadCsv({
    name: "colliding-bullet-identities.csv",
    mimeType: "text/csv",
    buffer: Buffer.from([
      "ward,actual,capacity",
      "Ward A,4,8",
      " Ward A ,6,8",
    ].join("\n")),
  });
  await flow.chooseChartType("bullet", /^Bullet\b/i);
  await flow.goToMapAndPrepare();
  await flow.selectRole("actual", "actual");
  await flow.selectRole("target", "capacity");
  await flow.selectRole("entity", "ward");
  await flow.goToConfigure();

  const invalidPreview = wizard.locator(".chart-authoring-preview-invalid");
  await expect(invalidPreview).toBeVisible();
  await expect(invalidPreview).toContainText(
    /duplicate collection identity "Ward A"/i,
  );
  await expect(invalidPreview.locator('[data-responsible-field="entity"]'))
    .toBeVisible();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toHaveCount(0);
  await flow.goToReview();
  await expect(wizard.getByRole("button", { name: "Create chart" }))
    .toBeDisabled();
});

test("timeline upload profiles real CSV columns and creates a timeline chart", async ({
  page,
}) => {
  const flow = await openChartAuthoring(page);
  const { wizard } = flow;
  await flow.uploadCsv(TIMELINE_FIXTURE);
  const profile = wizard.getByRole("region", {
    name: "Selected source profile",
  });
  await expect(profile).toContainText("event");
  await expect(profile).toContainText("start");
  await expect(profile).toContainText("Date or time");
  await flow.chooseChartType("timeline", /^Timeline\b/i);

  await flow.goToMapAndPrepare();
  for (const [roleId, column] of Object.entries({
    event: "event",
    start: "start",
    end: "end",
    lane: "lane",
    status: "status",
  })) {
    await flow.selectRole(roleId, column);
  }

  await flow.goToConfigure();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
  await expect(wizard.getByRole("heading", { name: "Timeline" })).toBeVisible();
  await expect(wizard.getByRole("heading", { name: "Axes" })).toHaveCount(0);
  await flow.createChart("E2E coordination timeline");
  await expectStoredChart(page, "timeline", "E2E coordination timeline");
});

test("full editor continues Quick state, restores suspended Full work, and saves without duplication", async ({
  page,
}) => {
  await openBiomedicalPage(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  const chartCountBefore = await storedChartCount(page);
  await panel.getByRole("button", { name: "Edit chart" }).click();
  const quick = page.locator(".chart-quick-editor");
  await quick.getByLabel("Chart title").fill("Quick continuity title");
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();

  let full = page.getByRole("dialog", { name: "Edit chart" });
  await expect(full).toBeVisible();
  await expect(full.getByRole("navigation", { name: "Chart editing steps" }))
    .toBeVisible();
  await full.getByRole("button", { name: /^Chart type\./ }).click();
  await expectChartTypeCardsAligned(full, "full-editor");
  await full.getByRole("button", { name: /^Configure\./ }).click();
  const title = full.getByLabel("Chart title");
  await expect(title).toHaveValue("Quick continuity title");
  await title.fill("Full-only durable title");
  await title.focus();
  const fullBody = full.locator(".chart-wizard-body");
  const fullScrollTop = await fullBody.evaluate((body) => {
    const available = body.scrollHeight - body.clientHeight;
    if (available < 40) throw new Error("Full editor did not provide a scrollable restoration fixture.");
    body.scrollTop = Math.min(220, available);
    return body.scrollTop;
  });
  expect(fullScrollTop).toBeGreaterThan(0);

  const owner = page.locator('[data-pending-work-id="chart-edit:bio_confirmed_cases"]');
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute("data-pending-work-activity", "active");
  await expect(owner).toHaveAttribute("data-pending-work-origin", "full");
  const focusFull = owner.getByRole("button", { name: "Focus Chart changes", exact: true });
  await focusFull.focus();
  await focusFull.press("Enter");
  await expect(title).toBeFocused();

  await full.getByRole("button", { name: "Close", exact: true }).click();
  await expect(full).toHaveCount(0);
  await expect(owner).toHaveAttribute("data-pending-work-activity", "suspended");
  await expect(owner).toHaveAttribute("data-pending-work-origin", "full");
  await owner.getByRole("button", { name: "Resume Chart changes", exact: true }).click();

  full = page.getByRole("dialog", { name: "Edit chart" });
  await expect(full).toBeVisible();
  await expect(full.getByLabel("Chart title")).toHaveValue("Full-only durable title");
  await expect(full.getByLabel("Chart title")).toBeFocused();
  await expect.poll(() => full.locator(".chart-wizard-body").evaluate(
    (body) => body.scrollTop,
  )).toBe(fullScrollTop);
  await full.getByRole("button", { name: /^Review\./ }).click();
  const save = full.getByRole("button", { name: "Save changes", exact: true });
  await expect(save).toBeEnabled();
  await save.click();

  await expect(full).toHaveCount(0);
  await expect(owner).toHaveCount(0);
  await expect.poll(() => storedChartCount(page)).toBe(chartCountBefore);
  await expect.poll(async () => (
    await storedQuickPersistenceSnapshot(page)
  ).targetTitle).toBe("Full-only durable title");
});

test("quick edit previews immediately while unchanged and suspended click-away sessions restore correctly", async ({
  page,
}) => {
  await openBiomedicalPage(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  const editChart = panel.getByRole("button", { name: "Edit chart" });
  const storedDashboardBeforeEdit = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );

  await editChart.click();
  let editor = page.locator(".chart-quick-editor");
  await expect(editor).toBeVisible();
  const owner = page.locator('[data-pending-work-id="chart-edit:bio_confirmed_cases"]');
  await expect(owner).toHaveCount(0);
  await page.locator(".dashboard-header").click({ position: { x: 8, y: 8 } });
  await expect(editor).toHaveCount(0);
  await expect(owner).toHaveCount(0);
  await expect(page.getByRole("button", { name: "View", exact: true })).toBeEnabled();

  await editChart.click();
  editor = page.locator(".chart-quick-editor");
  const title = editor.getByLabel("Chart title");
  await title.fill("Live quick preview");
  await editor.getByLabel("Background", { exact: true }).fill("#123456");
  await editor.getByLabel("Show title").uncheck();
  await expect(panel.locator(".chart-view-frame")).toHaveCSS(
    "background-color",
    "rgb(18, 52, 86)",
  );
  await expect(
    panel.locator(".chart-echarts-view .chart-view-title--visually-hidden"),
  ).toHaveText("Live quick preview");
  await expect.poll(() => page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  )).toBe(storedDashboardBeforeEdit);
  await expect(editor.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await expect(editor.getByRole("button", { name: "Remove chart", exact: true })).toBeEnabled();
  await expect(editor.getByRole("button", { name: "Open full editor" })).toBeEnabled();
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute("data-pending-work-state", "dirty");
  await expect(owner).toHaveAttribute("data-pending-work-activity", "active");
  await expect(owner).toHaveAttribute("data-pending-work-origin", "quick");
  await owner.getByRole("button", { name: "Focus Chart changes", exact: true }).click();
  await expect(title).toBeFocused();
  const quickEditorScrollTop = await page.locator(".unit-orbit-scroll").evaluate((scroller) => {
    const available = scroller.scrollHeight - scroller.clientHeight;
    if (available < 40) throw new Error("Quick editor did not provide a scrollable restoration fixture.");
    scroller.scrollTop = Math.min(160, available);
    return scroller.scrollTop;
  });
  expect(quickEditorScrollTop).toBeGreaterThan(0);
  await title.focus();

  await page.locator(".dashboard-header").click({ position: { x: 8, y: 8 } });
  await expect(editor).toHaveCount(0);
  await expect(panel.locator(".chart-view-frame")).toHaveCSS(
    "background-color",
    "rgb(18, 52, 86)",
  );
  await expect(
    panel.locator(".chart-echarts-view .chart-view-title--visually-hidden"),
  ).toHaveText("Live quick preview");
  await expect(editChart).toBeEnabled();
  await expect(page.getByRole("button", { name: "Add chart", exact: true })).toBeDisabled();
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute("data-pending-work-activity", "suspended");
  await expect(owner).toHaveAttribute("data-pending-work-origin", "quick");

  await owner.getByRole("button", { name: "Resume Chart changes", exact: true }).click();
  editor = page.locator(".chart-quick-editor");
  const resumedTitle = editor.getByLabel("Chart title");
  await expect(resumedTitle).toHaveValue("Live quick preview");
  await expect(editor.getByLabel("Show title")).not.toBeChecked();
  await expect(resumedTitle).toBeFocused();
  await expect.poll(() => page.locator(".unit-orbit-scroll").evaluate(
    (scroller) => scroller.scrollTop,
  )).toBe(quickEditorScrollTop);
});

test("suspended valid chart creation keeps one stable owner while incomplete creation stays absent", async ({
  page,
}) => {
  let flow = await openChartAuthoring(page);
  let wizard = flow.wizard;
  const creationOwner = page.locator('[data-pending-work-kind="chart-create"]');
  await expect(creationOwner).toHaveCount(0);

  await flow.selectExistingSource("Biomedical mortality by age");
  await expect(creationOwner).toHaveCount(0);
  await flow.chooseChartType("pie", /^Pie\b/i);
  await flow.goToMapAndPrepare();
  await flow.selectRole("category", "Age group");
  await flow.selectRole("value", "deaths");
  await flow.goToConfigure();
  await wizard.getByLabel("Chart title").fill("Retainable owner draft");
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
  await expect(creationOwner).toHaveCount(1);
  const ownerId = await creationOwner.getAttribute("data-pending-work-id");
  expect(ownerId).toMatch(/^chart-create:.+/);
  await expect(creationOwner).toHaveAttribute("data-pending-work-activity", "active");

  const title = wizard.getByLabel("Chart title");
  await title.focus();
  await wizard.getByRole("button", { name: "Close", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  await expect(creationOwner).toHaveAttribute("data-pending-work-id", ownerId);
  await expect(creationOwner).toHaveAttribute("data-pending-work-activity", "suspended");

  await creationOwner.getByRole("button", { name: "Resume New chart draft", exact: true }).click();
  wizard = page.getByRole("dialog", { name: "Add new chart" });
  flow = chartAuthoringWorkflow(wizard);
  await expect(wizard).toBeVisible();
  await expect(wizard.getByLabel("Chart title")).toHaveValue("Retainable owner draft");
  await expect(creationOwner).toHaveAttribute("data-pending-work-id", ownerId);

  await wizard.getByRole("button", { name: "Discard chart draft" }).click();
  await page.getByRole("dialog", { name: "Discard chart?" })
    .getByRole("button", { name: "Discard", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  await expect(creationOwner).toHaveCount(0);
});

test("quick edit saving failure keeps one retry owner and confirmed Remove clears it", async ({
  page,
}) => {
  await openBiomedicalPage(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  const before = await storedQuickPersistenceSnapshot(page);
  const today = await page.evaluate(() => {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  });

  await panel.getByRole("button", { name: "Edit chart" }).click();
  let editor = page.locator(".chart-quick-editor");
  await expect(editor).toBeVisible();
  await editor.getByLabel("Chart title").fill("Durable quick save");
  const owner = page.locator('[data-pending-work-id="chart-edit:bio_confirmed_cases"]');
  await expect(owner).toHaveCount(1);
  const save = editor.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeEnabled();
  await installQuickEditorSavingEvidence(page, "chart-edit:bio_confirmed_cases");
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_CHART_SERIALIZE_ONCE__ = true; });
  await save.click();

  await expect(editor).toBeVisible();
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute("data-pending-work-state", "error");
  const savingEvidence = await readQuickEditorSavingEvidence(page);
  expect(savingEvidence.pendingReason).toEqual({
    editorInert: false,
    buttonDisabled: true,
    buttonDescribedBy: null,
    anchorTabIndex: "0",
    focused: true,
    reasonText: "Wait for the current chart operation to finish.",
  });
  expect(savingEvidence.ownerSaving).toBe(true);

  expect(await storedQuickPersistenceSnapshot(page)).toEqual(before);
  await owner.getByRole("button", { name: "Retry Save", exact: true }).click();

  await expect(editor).toHaveCount(0);
  await expect(owner).toHaveCount(0);
  await expect.poll(async () => (
    await storedQuickPersistenceSnapshot(page)
  ).targetTitle).toBe("Durable quick save");
  const afterSave = await storedQuickPersistenceSnapshot(page);
  expect(afterSave.lastUpdated).toBe(today);
  expect(afterSave.layout).toEqual(before.layout);
  expect(afterSave.unrelatedChart).toEqual(before.unrelatedChart);
  expect(afterSave.chronoGroups).toEqual(before.chronoGroups);

  await panel.getByRole("button", { name: "Edit chart" }).click();
  editor = page.locator(".chart-quick-editor");
  await expect(editor).toBeVisible();
  await editor.getByLabel("Chart title").fill("Unsaved title removed with placement");
  await expect(owner).toHaveCount(1);
  await editor.getByRole("button", { name: "Remove chart", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Remove this chart?" });
  await expect(confirmation).toBeVisible();
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_CHART_REMOVE_SERIALIZE_ONCE__ = true; });
  await confirmation.getByRole("button", { name: "Remove chart", exact: true }).click();

  await expect(panel).toHaveCount(1);
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute("data-pending-work-state", "error");
  await expect(owner.getByRole("button", { name: "Retry Remove", exact: true })).toBeVisible();
  expect(await storedQuickPersistenceSnapshot(page)).toEqual(afterSave);
  await confirmation.getByRole("button", { name: "Keep chart", exact: true }).click();
  await owner.getByRole("button", { name: "Retry Remove", exact: true }).click();

  await expect(panel).toHaveCount(0);
  await expect(owner).toHaveCount(0);
  await expect.poll(async () => (
    await storedQuickPersistenceSnapshot(page)
  ).targetTitle).toBe(null);
  const afterRemove = await storedQuickPersistenceSnapshot(page);
  expect(afterRemove.lastUpdated).toBe(today);
  expect(afterRemove.panelIds).toEqual(
    before.panelIds.filter((panelId) => panelId !== "bio_confirmed_cases"),
  );
  expect(afterRemove.unrelatedChart).toEqual(before.unrelatedChart);
  expect(afterRemove.municipalChronoGroup).toEqual(before.municipalChronoGroup);
  expect(afterRemove.nationalChronoMembers).toEqual(
    before.nationalChronoMembers.filter(({ chartId }) => chartId !== "bio_confirmed_cases"),
  );
});

test("quick edit Save rebases pending Page content onto a live layout draft", async ({
  page,
}) => {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Socio-economic", exact: true })
    .click();
  const baselineSectionIds = await storedPageSectionIds(page, "socio_economic");
  await page.getByRole("button", {
    name: "Move Public response and policy signals later",
    exact: true,
  }).click();
  await expect(page.locator('[data-pending-work-kind="layout"]'))
    .toHaveAttribute("data-pending-work-state", "dirty");

  const dashboardMap = page.getByRole("button", { name: "Dashboard map", exact: true });
  await dashboardMap.click();
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await map.getByRole("button", { name: "Inspector", exact: true }).click();
  const pendingPageTitle = "Pending Socio Page title survives quick Save";
  await map.getByLabel("Page title", { exact: true }).fill(pendingPageTitle);
  await dashboardMap.click();

  const target = page.locator('[data-panel-id="socio_trust_trend"]');
  await target.getByRole("button", { name: "Edit chart", exact: true }).click();
  const editor = page.locator(".chart-quick-editor");
  const savedChartTitle = "Quick Save on a live layout draft";
  await editor.getByLabel("Chart title").fill(savedChartTitle);
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);

  const saveLayout = page.getByRole("button", {
    name: "Save Layout Changes",
    exact: true,
  });
  await saveLayout.click();
  await expect(page.locator('[data-pending-work-kind="layout"]')).toHaveCount(0);

  await expect.poll(() => page.evaluate(({ key, pageId, chartId }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const pageEntry = dashboard.pages.find(({ id }) => id === pageId);
    const chart = pageEntry.sections
      .flatMap(({ panels = [] }) => panels)
      .map((placement) => placement.chart ?? placement)
      .find(({ id }) => id === chartId);
    return {
      pageTitle: pageEntry.title,
      chartTitle: chart.title,
      sectionIds: pageEntry.sections.map(({ id }) => id),
    };
  }, {
    key: STORAGE_KEY,
    pageId: "socio_economic",
    chartId: "socio_trust_trend",
  })).toEqual({
    pageTitle: pendingPageTitle,
    chartTitle: savedChartTitle,
    sectionIds: [baselineSectionIds[1], baselineSectionIds[0], ...baselineSectionIds.slice(2)],
  });
});

test("editor chart conversion supports compatible changes and recoverable remapping", async ({
  page,
}) => {
  await openBiomedicalPage(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await panel.getByRole("button", { name: "Edit chart" }).click();
  const editor = page.locator(".chart-editor-v3");
  const type = editor.getByLabel("Chart type");

  await type.selectOption("bar");
  let conversion = page.getByRole("dialog", { name: "Compatible change" });
  await expect(conversion).toBeVisible();
  await conversion.getByRole("button", { name: "Apply chart type change" })
    .click();
  await expect(type).toHaveValue("bar");
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expectStoredChart(page, "bar", "Confirmed cases");
  await panel.getByRole("button", { name: "Edit chart" }).click();

  await type.selectOption("scatter");
  conversion = page.getByRole("dialog", { name: "Role remapping required" });
  await expect(conversion).toBeVisible();
  await conversion.getByRole("button", { name: "Cancel" }).click();
  await expect(type).toHaveValue("bar");

  await type.selectOption("scatter");
  conversion = page.getByRole("dialog", { name: "Role remapping required" });
  await conversion.locator('[data-field-id="x"] select')
    .selectOption("total_deaths");
  await conversion.locator('[data-field-id="y"] select')
    .selectOption("national_total_cases");
  await expect(conversion.getByRole("button", {
    name: "Apply chart type change",
  })).toBeEnabled();
  await conversion.getByRole("button", { name: "Apply chart type change" })
    .click();
  await expect(type).toHaveValue("scatter");
  await expect(editor.getByLabel("Duplicate observations")).toBeVisible();
  await editor.getByLabel("Duplicate observations").selectOption("last");
  await expect(editor.locator(".chart-authoring-preview-ready")).toBeVisible();
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expectStoredChart(page, "scatter", "Confirmed cases");
});

async function openBiomedicalPage(page) {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
}

function sourceLabel(sourceId) {
  return {
    bio_municipal_infections: "Biomedical municipal infections",
    socio_behaviour: "Simulation exercise socio-economic behaviour dataset",
    bio_province_deltas: "Simulation exercise biomedical derived province changes",
  }[sourceId];
}

async function expectChartTypeCardsAligned(surface, surfaceName) {
  const cards = surface.locator(".chart-type-card");
  await expect(cards.first()).toBeVisible();
  const genericCompatibleReason = surface.locator(".chart-type-card-reason", {
    hasText: "The profiled fields satisfy this chart type's required roles.",
  });
  await expect(genericCompatibleReason).toHaveCount(0);

  const metrics = await cards.evaluateAll((elements) => elements.map((card) => {
    const cardRect = card.getBoundingClientRect();
    const iconRect = card.querySelector(".simex-icon")?.getBoundingClientRect();
    const style = getComputedStyle(card);
    const textRects = [...card.querySelectorAll(".chart-type-card-copy > span")]
      .filter((element) => getComputedStyle(element).display !== "none")
      .map((element) => element.getBoundingClientRect());
    return {
      width: cardRect.width,
      height: cardRect.height,
      iconWidth: iconRect?.width ?? 0,
      minBlockSize: Number.parseFloat(style.minBlockSize),
      textInside: textRects.every((rect) => (
        rect.left >= cardRect.left - 0.5
        && rect.right <= cardRect.right + 0.5
        && rect.top >= cardRect.top - 0.5
        && rect.bottom <= cardRect.bottom + 0.5
      )),
    };
  }));

  expect(metrics.length).toBeGreaterThan(0);
  for (const metric of metrics) {
    expect(metric.width).toBeGreaterThan(metric.iconWidth + 80);
    expect(metric.width).toBeGreaterThan(metric.height * 2);
    expect(metric.minBlockSize).toBeGreaterThanOrEqual(44);
    expect(metric.textInside).toBe(true);
  }
  const widths = metrics.map(({ width }) => width);
  const heights = metrics.map(({ height }) => height);
  console.log(
    `chart-type-card geometry (${surfaceName}): count=${metrics.length}, `
      + `width=${Math.min(...widths).toFixed(1)}-${Math.max(...widths).toFixed(1)}px, `
      + `height=${Math.min(...heights).toFixed(1)}-${Math.max(...heights).toFixed(1)}px`,
  );
}

async function storedQuickPersistenceSnapshot(page) {
  return page.evaluate(async (storageKey) => {
    const storedDashboard = localStorage.getItem(storageKey);
    const dashboard = storedDashboard
      ? JSON.parse(storedDashboard)
      : await fetch("/config/dashboard.json").then((response) => response.json());
    const placements = dashboard.pages.flatMap((pageEntry) => (
      (pageEntry.sections ?? []).flatMap((section) => (
        (section.panels ?? []).map((placement) => ({
          pageId: pageEntry.id,
          sectionId: section.id,
          placement,
          chart: placement.chart ?? placement,
        }))
      ))
    ));
    const target = placements.find(({ placement, chart }) => (
      (placement.id ?? chart.id) === "bio_confirmed_cases"
    ));
    const unrelated = placements.find(({ chart }) => chart.id === "bio_daily_cases_bar");
    const chronoGroups = structuredClone(dashboard.chronoGroups ?? []);
    return {
      lastUpdated: dashboard.lastUpdated,
      targetTitle: target?.chart?.title ?? null,
      panelIds: placements.map(({ placement, chart }) => placement.id ?? chart.id),
      layout: dashboard.pages.map((pageEntry) => ({
        id: pageEntry.id,
        sections: (pageEntry.sections ?? []).map((section) => ({
          id: section.id,
          panels: (section.panels ?? []).map((placement) => {
            const chart = placement.chart ?? placement;
            return {
              id: placement.id ?? chart.id,
              layout: structuredClone(placement.layout ?? chart.layout ?? null),
            };
          }),
        })),
      })),
      unrelatedChart: structuredClone(unrelated?.chart ?? null),
      chronoGroups,
      municipalChronoGroup: structuredClone(
        chronoGroups.find(({ id }) => id === "municipal_outbreak") ?? null,
      ),
      nationalChronoMembers: structuredClone(
        chronoGroups.find(({ id }) => id === "national_outbreak")?.members ?? [],
      ),
    };
  }, STORAGE_KEY);
}

function storedChartCount(page) {
  return page.evaluate(async (storageKey) => {
    const storedDashboard = localStorage.getItem(storageKey);
    const dashboard = storedDashboard
      ? JSON.parse(storedDashboard)
      : await fetch("/config/dashboard.json").then((response) => response.json());
    return dashboard.pages
      .flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .length;
  }, STORAGE_KEY);
}

function installQuickEditorSavingEvidence(page, ownerId) {
  return page.evaluate(({ id }) => {
    globalThis.__SIMEX_CHART_SAVING_OBSERVER__?.disconnect();
    globalThis.__SIMEX_CHART_SAVING_EVIDENCE__ = {
      ownerSaving: false,
      pendingReason: null,
    };
    const inspect = () => {
      const owner = [...document.querySelectorAll("[data-pending-work-id]")]
        .find((entry) => entry.dataset.pendingWorkId === id);
      if (owner?.dataset.pendingWorkState === "saving") {
        globalThis.__SIMEX_CHART_SAVING_EVIDENCE__.ownerSaving = true;
      }
      const editor = document.querySelector(
        '.chart-quick-editor[data-chart-edit-status="saving"]',
      );
      const button = editor?.querySelector('button[aria-label="Saving changes"]');
      const anchor = button?.closest('[data-control-tooltip-anchor="true"]');
      if (!editor || !button || !anchor) return;
      const reasonId = anchor.getAttribute("aria-describedby");
      anchor.focus();
      globalThis.__SIMEX_CHART_SAVING_EVIDENCE__.pendingReason = {
        editorInert: editor.hasAttribute("inert"),
        buttonDisabled: button.disabled,
        buttonDescribedBy: button.getAttribute("aria-describedby"),
        anchorTabIndex: anchor.getAttribute("tabindex"),
        focused: document.activeElement === anchor,
        reasonText: reasonId
          ? document.getElementById(reasonId)?.textContent?.trim() ?? null
          : null,
      };
    };
    const observer = new MutationObserver(inspect);
    globalThis.__SIMEX_CHART_SAVING_OBSERVER__ = observer;
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    inspect();
  }, { id: ownerId });
}

function readQuickEditorSavingEvidence(page) {
  return page.evaluate(() => {
    globalThis.__SIMEX_CHART_SAVING_OBSERVER__?.disconnect();
    const evidence = globalThis.__SIMEX_CHART_SAVING_EVIDENCE__;
    delete globalThis.__SIMEX_CHART_SAVING_OBSERVER__;
    delete globalThis.__SIMEX_CHART_SAVING_EVIDENCE__;
    return evidence;
  });
}

function storedPageSectionIds(page, pageId) {
  return page.evaluate(async ({ key, requestedPageId }) => {
    const storedDashboard = localStorage.getItem(key);
    const dashboard = storedDashboard
      ? JSON.parse(storedDashboard)
      : await fetch("/config/dashboard.json").then((response) => response.json());
    return dashboard.pages
      .find(({ id }) => id === requestedPageId)
      .sections.map(({ id }) => id);
  }, { key: STORAGE_KEY, requestedPageId: pageId });
}

async function expectStoredChart(page, typeId, title) {
  await expect.poll(() => page.evaluate(({ key, expectedType, expectedTitle }) => {
    const storedDashboard = localStorage.getItem(key);
    if (!storedDashboard) {
      return false;
    }
    const dashboard = JSON.parse(storedDashboard);
    return dashboard.pages
      .flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .some((panel) => (
        panel.typeId === expectedType && panel.title === expectedTitle
      ));
  }, {
    key: STORAGE_KEY,
    expectedType: typeId,
    expectedTitle: title,
  })).toBe(true);
}
