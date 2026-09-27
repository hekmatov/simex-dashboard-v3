import { chooseSectionAction, propertiesPane } from "./support/buildWorkflow.js";
import { expect, test } from "@playwright/test";
import { choosePanelAction } from "./support/buildWorkflow.js";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";
import { resetSourceDashboard } from "./support/dashboardFixture.js";
import {
  openChartAuthoring,
  resumeChartAuthoring,
} from "./support/chart-authoring-workflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const WORKFORCE_SOURCE_ID = "upload-eldoria-work-sectors";
const WORKFORCE_SOURCE_LABEL = "eldoria work sectors";
const WORKFORCE_VALUE_COLUMN = "Share of workforce (%)";
const EDIT_CHART_ID = "chart-line-mtgz6v76";
const OTHER_LINE_CHART_ID = "chart-line-mtgytrwj";
const UNRELATED_GROUP_CHART_ID = "chart-line-a01a017d-96f1-440b-b24a-bcf2e30da1cc";
const SOCIO_EDIT_CHART_ID = "chart-horizontalBar-6a8c3efb-2059-410c-988b-254b948824ad";
const TARGET_CHRONO_GROUP_ID = "editor-target-group";
const UNRELATED_CHRONO_GROUP_ID = "editor-unrelated-group";
const TIMELINE_FIXTURE = {
  name: "timeline-events.csv",
  mimeType: "text/csv",
  buffer: Buffer.from([
    "event,start,end,lane,status",
    "Hospital escalation,2027-05-01,2027-05-02,Health coordination,active",
    "Evacuation decision,2027-05-02,2027-05-03,Civil protection,planned",
  ].join("\n")),
};
const SCATTER_FIXTURE = {
  name: "income-relationship.csv",
  mimeType: "text/csv",
  buffer: Buffer.from([
    "Income bracket,Share of population (%),Share of total income (%)",
    "Low income,35,9",
    "Low income,35,9",
    "Middle income,20,22",
    "High income,6,30",
  ].join("\n")),
};
const HEATMAP_FIXTURE = {
  name: "preparedness-heatmap.csv",
  mimeType: "text/csv",
  buffer: Buffer.from([
    "Question,Wave,Percentage,date",
    "Hospital capacity,Baseline,65,2027-05-01",
    "Hospital capacity,Baseline,65,2027-05-01",
    "Hospital capacity,Surge,72,2027-05-02",
    "Public awareness,Baseline,48,2027-05-01",
    "Public awareness,Surge,61,2027-05-02",
  ].join("\n")),
};
const DELTA_FIXTURE = {
  name: "province-deltas.csv",
  mimeType: "text/csv",
  buffer: Buffer.from([
    "province,date,Infected_total",
    "Drenthe,2027-05-01,12",
    "Drenthe,2027-05-02,18",
    "Gelderland,2027-05-01,20",
    "Gelderland,2027-05-02,25",
  ].join("\n")),
};

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
  await page.addInitScript(({ removeId }) => {
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
          panels?.some((placement) => (
            (placement.chart ?? placement).id === removeId
          ))
        )))
      ) {
        globalThis.__SIMEX_FAIL_CHART_REMOVE_SERIALIZE_ONCE__ = false;
        throw new Error("Chart removal persistence is temporarily unavailable.");
      }
      return stringify.call(this, value, ...args);
    };
  }, { removeId: EDIT_CHART_ID });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByRole("button", { name: "Build" }).click();
});

test("source-first existing CSV pie authoring progressively reveals schema fields and persists the created chart", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await openM0FixtureBuild(page);
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

  await flow.selectExistingSource(WORKFORCE_SOURCE_LABEL);
  await flow.goToChartType();
  await expectChartTypeCardsAligned(wizard, "creation");
  await wizard.getByRole("button", { name: /^Pie\b/i }).click();
  await flow.goToConfigure();
  await expect(wizard.getByRole("textbox", { name: "Chart title", exact: true })).toBeVisible();
  await expect(wizard.getByLabel("Title alignment")).toHaveCount(0);
  await expect(wizard.locator('[data-color-field="background"]')).toHaveCount(0);

  await wizard.getByRole("button", { name: "Close" }).click();
  await expect(wizard).toHaveCount(0);
  const suspendedCreation = page.locator('[data-pending-work-kind="chart-create"]');
  await expect(suspendedCreation).toHaveAttribute("data-pending-work-activity", "suspended");
  flow = await resumeChartAuthoring(page);
  wizard = flow.wizard;

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
  await flow.selectExistingSource(WORKFORCE_SOURCE_LABEL);
  await expect(
    wizard.getByRole("region", { name: "Selected source profile" }),
  ).toContainText("Sector");
  await expect(
    wizard.getByRole("region", { name: "Selected source profile" }),
  ).toContainText(WORKFORCE_VALUE_COLUMN);
  await flow.chooseChartType("pie", /^Pie\b/i);

  await flow.goToMapAndPrepare();
  await flow.selectRole("category", "Sector");
  await flow.selectRole("value", WORKFORCE_VALUE_COLUMN);

  await flow.goToConfigure();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
  await expect(wizard.getByLabel("Title alignment")).toBeVisible();
  await expect(wizard.locator('[data-color-field="background"]')).toHaveCount(1);
  await expect(
    wizard.getByRole("group", { name: "Series colors" }),
  ).toBeVisible();
  await wizard.getByRole("button", { name: "Add color" }).click();
  await wizard.getByLabel("Color 1", { exact: true }).fill("#DC2626");
  await wizard.getByRole("textbox", { name: "Chart title", exact: true })
    .fill("E2E workforce composition");
  await flow.goToReview();
  await wizard.getByRole("button", { name: "Create chart" }).click();

  await expect(wizard).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const chart = dashboard.pages
      .flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .find(({ title, typeId }) => (
        title === "E2E workforce composition" && typeId === "pie"
      ));
    return chart ? {
      sourceId: chart.sourceId,
      category: chart.roles?.category?.field,
      value: chart.roles?.value?.field,
      colors: chart.presentation?.series?.colors,
    } : null;
  }, STORAGE_KEY)).toEqual({
    sourceId: WORKFORCE_SOURCE_ID,
    category: "Sector",
    value: WORKFORCE_VALUE_COLUMN,
    colors: ["#DC2626"],
  });
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
    name: "Pick background color from dashboard",
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
  await expect(wizard.getByRole("textbox", { name: "Chart title", exact: true })).toBeVisible();
});

for (const scenario of [
  {
    typeId: "scatter",
    query: "scatter",
    name: /^Scatter\b/i,
    upload: SCATTER_FIXTURE,
    roles: {
      x: "Share of population (%)",
      y: "Share of total income (%)",
      label: "Income bracket",
    },
    title: "E2E income relationship",
    visibleSections: ["Axes", "Interactions"],
    absentSections: ["Collection", "Timeline", "Map"],
    resolveDuplicates: true,
  },
  {
    typeId: "heatmap",
    query: "heatmap",
    name: /^Heatmap\b/i,
    upload: HEATMAP_FIXTURE,
    roles: {
      row: "Question",
      column: "Wave",
      value: "Percentage",
      time: "date",
    },
    title: "E2E preparedness heatmap",
    visibleSections: [],
    absentSections: ["Axes", "Collection", "Timeline", "Map"],
    resolveDuplicates: true,
  },
  {
    typeId: "deltaCard",
    query: "delta card",
    name: /^Delta card\b/i,
    upload: DELTA_FIXTURE,
    roles: {
      measurement: "Infected_total",
      entity: "province",
      time: "date",
    },
    title: "E2E provincial delta",
    labels: false,
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
    test.setTimeout(scenario.typeId === "scatter" ? 360_000 : 240_000);
    const flow = await openChartAuthoring(page);
    const { wizard } = flow;
    if (scenario.upload) {
      await flow.uploadCsv(scenario.upload);
    } else {
      await flow.selectExistingSource(scenario.sourceLabel);
    }
    const profile = wizard.getByRole("region", { name: "Selected source profile" });
    for (const column of Object.values(scenario.roles)) {
      await expect(profile).toContainText(column);
    }
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
    if (scenario.labels === false) {
      await expect(wizard.getByRole("heading", { name: "Labels" }))
        .toHaveCount(0);
    } else {
      await expect(wizard.getByRole("heading", { name: "Labels" }))
        .toBeVisible();
    }
    for (const heading of scenario.visibleSections) {
      await expect(wizard.getByRole("heading", { name: heading })).toBeVisible();
    }
    for (const heading of scenario.absentSections) {
      await expect(wizard.getByRole("heading", { name: heading })).toHaveCount(0);
    }
    await flow.createChart(scenario.title);
    await expectStoredCreatedChart(page, scenario);
  });
}

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
  await expect(wizard.getByRole("heading", { name: "Timeline" })).toHaveCount(0);
  await expect(wizard.getByRole("heading", { name: "Axes" })).toHaveCount(0);
  await flow.createChart("E2E coordination timeline");
  await expectStoredChart(page, "timeline", "E2E coordination timeline");
});

test("full editor keeps every tab's controls and render panels aligned", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1645, height: 1214 });
  await openBiomedicalPage(page);
  const panel = page.locator(`[data-panel-id="${EDIT_CHART_ID}"]`);
  await panel.hover();
  await choosePanelAction(page, await panel.getAttribute("data-build-placement-id"), "edit");
  await page.locator(".chart-quick-editor")
    .getByRole("button", { name: "Open full editor", exact: true })
    .click();

  const full = page.getByRole("dialog", { name: "Edit chart" });
  await expect(full).toBeVisible();

  const dimensions = async () => full.evaluate((dialog) => {
    const controls = dialog.querySelector(".chart-wizard-body");
    const render = dialog.querySelector(".chart-creation-proof-deck");
    if (!controls || !render) {
      throw new Error("Full editor is missing its controls or render panel.");
    }
    return {
      dialog: dialog.getBoundingClientRect().width,
      controls: controls.getBoundingClientRect().width,
      render: render.getBoundingClientRect().width,
    };
  });

  const stages = [
    /^Destination\./,
    /^Data source\./,
    /^Chart type\./,
    /^Map and prepare\./,
    /^Configure\./,
    /^Review\./,
  ];
  const stageWidths = [];
  for (const stage of stages) {
    await full.getByRole("button", { name: stage }).click();
    stageWidths.push(await dimensions());
  }

  const expected = stageWidths[0];
  for (const width of stageWidths) {
    expect(Math.abs(width.dialog - expected.dialog)).toBeLessThan(1);
    expect(Math.abs(width.controls - expected.controls)).toBeLessThan(1);
    expect(Math.abs(width.render - expected.render)).toBeLessThan(1);
  }
});

test("full editor continues Quick state, restores suspended Full work, and saves without duplication", async ({
  page,
}) => {
  await openBiomedicalPage(page);
  const panel = page.locator(`[data-panel-id="${EDIT_CHART_ID}"]`);
  const chartCountBefore = await storedChartCount(page);
  await panel.hover();
  await choosePanelAction(page, await panel.getAttribute("data-build-placement-id"), "edit");
  const quick = page.locator(".chart-quick-editor");
  await quick.getByRole("textbox", { name: "Chart title", exact: true }).fill("Quick continuity title");
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();

  let full = page.getByRole("dialog", { name: "Edit chart" });
  await expect(full).toBeVisible();
  await expect(full.getByRole("navigation", { name: "Chart editing steps" }))
    .toBeVisible();
  await full.getByRole("button", { name: /^Chart type\./ }).click();
  await expectChartTypeCardsAligned(full, "full-editor");
  await full.getByRole("button", { name: /^Configure\./ }).click();
  const title = full.getByRole("textbox", { name: "Chart title", exact: true });
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

  const owner = page.locator(`[data-pending-work-id="chart-edit:${EDIT_CHART_ID}"]`);
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
  await expect(full.getByRole("textbox", { name: "Chart title", exact: true })).toHaveValue("Full-only durable title");
  await expect(full.getByRole("textbox", { name: "Chart title", exact: true })).toBeFocused();
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
  await expect.poll(() => storedChartTitle(page, EDIT_CHART_ID))
    .toBe("Full-only durable title");
});

test("quick edit previews immediately while unchanged and suspended click-away sessions restore correctly", async ({
  page,
}) => {
  await openBiomedicalPage(page);
  const panel = page.locator(`[data-panel-id="${EDIT_CHART_ID}"]`);
  const placementId = await panel.getAttribute("data-build-placement-id");
  const storedDashboardBeforeEdit = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );

  await panel.hover();
  await choosePanelAction(page, placementId, "edit");
  let editor = page.locator(".chart-quick-editor");
  await expect(editor).toBeVisible();
  const owner = page.locator(`[data-pending-work-id="chart-edit:${EDIT_CHART_ID}"]`);
  await expect(owner).toHaveCount(0);
  await page.locator(".dashboard-header").click({ position: { x: 8, y: 8 } });
  await expect(editor).toHaveCount(0);
  await expect(owner).toHaveCount(0);
  await expect(page.getByRole("button", { name: "View", exact: true })).toBeEnabled();

  await panel.hover();
  await choosePanelAction(page, placementId, "edit");
  editor = page.locator(".chart-quick-editor");
  const title = editor.getByRole("textbox", { name: "Chart title", exact: true });
  await title.fill("Live quick preview");
  await editor.getByRole("combobox", { name: "Background color" })
    .selectOption("custom");
  await editor.getByRole("textbox", {
    name: "Custom background color",
    exact: true,
  }).fill("#123456");
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

  await page.locator(".dashboard-header").click({ position: { x: 8, y: 8 } });
  await expect(editor).toHaveCount(0);
  await expect(panel.locator(".chart-view-frame")).toHaveCSS(
    "background-color",
    "rgb(18, 52, 86)",
  );
  await expect(
    panel.locator(".chart-echarts-view .chart-view-title--visually-hidden"),
  ).toHaveText("Live quick preview");
  await panel.locator("[data-panel-menu]").click();
  await expect(page.locator(`[data-build-edit-for="${placementId}"]`)).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Add chart", exact: true })).toBeDisabled();
  await expect(owner).toHaveCount(1);
  await expect(owner).toHaveAttribute("data-pending-work-activity", "suspended");
  await expect(owner).toHaveAttribute("data-pending-work-origin", "quick");

  await owner.getByRole("button", { name: "Resume Chart changes", exact: true }).click();
  editor = page.locator(".chart-quick-editor");
  const resumedTitle = editor.getByRole("textbox", { name: "Chart title", exact: true });
  await expect(resumedTitle).toHaveValue("Live quick preview");
  await expect(editor.getByLabel("Show title")).not.toBeChecked();
});

test("suspended valid chart creation keeps one stable owner while incomplete creation stays absent", async ({
  page,
}) => {
  await openM0FixtureBuild(page);
  let flow = await openChartAuthoring(page);
  let wizard = flow.wizard;
  const creationOwner = page.locator('[data-pending-work-kind="chart-create"]');
  await expect(creationOwner).toHaveCount(0);

  await flow.selectExistingSource(WORKFORCE_SOURCE_LABEL);
  await expect(creationOwner).toHaveCount(1);
  const ownerId = await creationOwner.getAttribute("data-pending-work-id");
  expect(ownerId).toMatch(/^chart-create:.+/);
  await expect(creationOwner).toHaveAttribute("data-pending-work-activity", "active");
  await flow.chooseChartType("pie", /^Pie\b/i);
  await flow.goToMapAndPrepare();
  await flow.selectRole("category", "Sector");
  await flow.selectRole("value", WORKFORCE_VALUE_COLUMN);
  await flow.goToConfigure();
  await wizard.getByRole("textbox", { name: "Chart title", exact: true }).fill("Retainable owner draft");
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
  await expect(creationOwner).toHaveCount(1);
  await expect(creationOwner).toHaveAttribute("data-pending-work-id", ownerId);
  await expect(creationOwner).toHaveAttribute("data-pending-work-activity", "active");
  await expect(page.locator('[data-panel-id]').filter({ hasText: "Retainable owner draft" })).toHaveCount(0);

  const title = wizard.getByRole("textbox", { name: "Chart title", exact: true });
  await title.focus();
  await wizard.getByRole("button", { name: "Close", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  await expect(creationOwner).toHaveAttribute("data-pending-work-id", ownerId);
  await expect(creationOwner).toHaveAttribute("data-pending-work-activity", "suspended");

  flow = await resumeChartAuthoring(page);
  wizard = flow.wizard;
  await expect(wizard).toBeVisible();
  await expect(wizard.getByRole("textbox", { name: "Chart title", exact: true })).toHaveValue("Retainable owner draft");
  await expect(creationOwner).toHaveAttribute("data-pending-work-id", ownerId);

  await wizard.getByRole("button", { name: "Discard chart draft" }).click();
  await page.getByRole("dialog", { name: "Discard chart?" })
    .getByRole("button", { name: "Discard", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  await expect(creationOwner).toHaveCount(0);
  await expect(page.locator('[data-panel-id]').filter({ hasText: "Retainable owner draft" })).toHaveCount(0);
});

async function openM0FixtureBuild(page) {
  await resetSourceDashboard(page, { fixture: "fable-m0" });
  await expect(page.locator('[data-canonical-page-id="m0-dashboard"]')).toBeVisible();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
}

async function installQuickPersistenceChronoFixture(page) {
  await page.evaluate(async ({ key, targetId, otherLineId, unrelatedId, targetGroupId, unrelatedGroupId }) => {
    const dashboard = JSON.parse(localStorage.getItem(key)
      ?? await fetch("/config/dashboard.json").then((response) => response.text()));
    dashboard.chronoGroups = [
      {
        id: targetGroupId,
        name: "Editor target group",
        period: { start: "2027-02-14", end: "2027-02-21" },
        matching: { policy: "exact" },
        secondsPerFrame: 1,
        members: [
          { chartId: targetId, timeRole: "observation" },
          { chartId: otherLineId, timeRole: "observation" },
        ],
      },
      {
        id: unrelatedGroupId,
        name: "Editor unrelated group",
        period: { start: "2021-01-01", end: "2027-12-31" },
        matching: { policy: "exact" },
        secondsPerFrame: 1,
        members: [{ chartId: unrelatedId, timeRole: "observation" }],
      },
    ];
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, {
    key: STORAGE_KEY,
    targetId: EDIT_CHART_ID,
    otherLineId: OTHER_LINE_CHART_ID,
    unrelatedId: UNRELATED_GROUP_CHART_ID,
    targetGroupId: TARGET_CHRONO_GROUP_ID,
    unrelatedGroupId: UNRELATED_CHRONO_GROUP_ID,
  });
  await page.reload();
  await enterAuthoredDashboard(page);
  const build = page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true });
  if (await build.getAttribute("aria-pressed") !== "true") await build.click();
}

test("quick edit saving failure keeps one retry owner and confirmed Remove clears it", async ({
  page,
}) => {
  await installQuickPersistenceChronoFixture(page);
  await openBiomedicalPage(page);
  const panel = page.locator(`[data-panel-id="${EDIT_CHART_ID}"]`);
  const before = await storedQuickPersistenceSnapshot(page);
  expect(before.targetTitle).toBe("National Confirmed Cases (cumulative)");
  expect(before.targetSourceId).toBe("upload-cases-wcph-eldoria-3");
  expect(before.panelIds).toContain(EDIT_CHART_ID);
  expect(before.unrelatedChart?.id).toBe(OTHER_LINE_CHART_ID);
  expect(before.targetGroup?.members.map(({ chartId }) => chartId))
    .toEqual([EDIT_CHART_ID, OTHER_LINE_CHART_ID]);
  expect(before.unrelatedGroup?.members.map(({ chartId }) => chartId))
    .toEqual([UNRELATED_GROUP_CHART_ID]);
  const today = await page.evaluate(() => {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  });

  await panel.hover();
  await choosePanelAction(page, await panel.getAttribute("data-build-placement-id"), "edit");
  let editor = page.locator(".chart-quick-editor");
  await expect(editor).toBeVisible();
  await editor.getByRole("textbox", { name: "Chart title", exact: true }).fill("Durable quick save");
  const ownerId = `chart-edit:${EDIT_CHART_ID}`;
  const owner = page.locator(`[data-pending-work-id="${ownerId}"]`);
  await expect(owner).toHaveCount(1);
  const save = editor.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeEnabled();
  await installQuickEditorSavingEvidence(page, ownerId);
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
    anchorTabIndex: null,
    focused: false,
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

  await panel.hover();
  await choosePanelAction(page, await panel.getAttribute("data-build-placement-id"), "edit");
  editor = page.locator(".chart-quick-editor");
  await expect(editor).toBeVisible();
  await editor.getByRole("textbox", { name: "Chart title", exact: true }).fill("Unsaved title removed with placement");
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
    before.panelIds.filter((panelId) => panelId !== EDIT_CHART_ID),
  );
  expect(afterRemove.unrelatedChart).toEqual(before.unrelatedChart);
  expect(afterRemove.targetGroup).toEqual({
    ...before.targetGroup,
    members: before.targetGroup.members.filter(({ chartId }) => chartId !== EDIT_CHART_ID),
  });
  expect(afterRemove.unrelatedGroup).toEqual(before.unrelatedGroup);
});

test("quick edit Save rebases pending Page content onto a live layout draft", async ({
  page,
}) => {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Socio-economic", exact: true })
    .click();
  const baselineSectionIds = await storedPageSectionIds(page, "socio_economic");
  expect(baselineSectionIds.length).toBeGreaterThan(1);
  await chooseSectionAction(page, baselineSectionIds[0], "move-later");
  await expect(page.locator('[data-pending-work-kind="layout"]'))
    .toHaveAttribute("data-pending-work-state", "dirty");

  const pendingPageTitle = "Pending Socio Page title survives quick Save";
  await propertiesPane(page).getByLabel("Page title", { exact: true }).fill(pendingPageTitle);

  const target = page.locator(`[data-panel-id="${SOCIO_EDIT_CHART_ID}"]`);
  await expect(target).toBeVisible();
  await target.hover();
  await choosePanelAction(page, await target.getAttribute("data-build-placement-id"), "edit");
  const editor = page.locator(".chart-quick-editor");
  const savedChartTitle = "Quick Save on a live layout draft";
  await editor.getByRole("textbox", { name: "Chart title", exact: true }).fill(savedChartTitle);
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.locator('[data-pending-work-kind="layout"]'))
    .toHaveAttribute("data-pending-work-state", "dirty");

  const saveLayout = page.getByRole("button", {
    name: "Save Layout Changes",
    exact: true,
  });
  await saveLayout.click();
  await expect(page.locator('[data-pending-work-kind="layout"]')).toHaveCount(0);

  await expect.poll(() => page.evaluate(({ key, pageId, chartId }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const pageEntry = dashboard.pages.find(({ id }) => id === pageId);
    const charts = pageEntry.sections
      .flatMap(({ panels = [] }) => panels)
      .map((placement) => placement.chart ?? placement)
      .filter(({ id }) => id === chartId);
    return {
      pageTitle: pageEntry.title,
      chartCount: charts.length,
      chartTitle: charts[0]?.title ?? null,
      sectionIds: pageEntry.sections.map(({ id }) => id),
    };
  }, {
    key: STORAGE_KEY,
    pageId: "socio_economic",
    chartId: SOCIO_EDIT_CHART_ID,
  })).toEqual({
    pageTitle: pendingPageTitle,
    chartCount: 1,
    chartTitle: savedChartTitle,
    sectionIds: [baselineSectionIds[1], baselineSectionIds[0], ...baselineSectionIds.slice(2)],
  });
});

test("editor chart conversion supports compatible changes and recoverable remapping", async ({
  page,
}) => {
  await openBiomedicalPage(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  let full = await openFullChartEditor(page, panel);

  await full.getByRole("button", { name: /^Chart type\./ }).click();
  await full.getByRole("button", { name: /^Bar\b/i }).click();
  await full.locator('[data-field-id="measurements"] select').first()
    .selectOption("national_total_cases");
  await full.locator('[data-field-id="observation"] select').first()
    .selectOption("date");
  await full.getByRole("button", { name: /^Configure\./ }).click();
  await full.getByRole("textbox", { name: "Chart title", exact: true }).fill("Confirmed cases");
  await full.getByRole("button", { name: /^Review\./ }).click();
  await full.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(full).toHaveCount(0);
  await expectStoredChart(page, "bar", "Confirmed cases");

  full = await openFullChartEditor(page, panel);
  await full.getByRole("button", { name: /^Chart type\./ }).click();
  await full.getByRole("button", { name: /^Scatter\b/i }).click();
  await full.getByRole("button", { name: "Discard changes", exact: true }).click();
  let discard = page.getByRole("dialog", { name: "Discard changes?" });
  await discard.getByRole("button", { name: "Continue editing", exact: true }).click();
  await expect(full.locator('[data-field-id="x"] select').first()).toBeVisible();
  await full.getByRole("button", { name: "Discard changes", exact: true }).click();
  discard = page.getByRole("dialog", { name: "Discard changes?" });
  await discard.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(full).toHaveCount(0);
  await expectStoredChart(page, "bar", "Confirmed cases");

  full = await openFullChartEditor(page, panel);
  await full.getByRole("button", { name: /^Chart type\./ }).click();
  await full.getByRole("button", { name: /^Scatter\b/i }).click();
  await full.locator('[data-field-id="x"] select').first().selectOption("total_deaths");
  await full.locator('[data-field-id="y"] select').first()
    .selectOption("national_total_cases");
  await full.getByLabel("Duplicate observations").selectOption("last");
  await full.getByRole("button", { name: /^Configure\./ }).click();
  await full.getByRole("textbox", { name: "Chart title", exact: true }).fill("Confirmed cases");
  await expect(full.locator(".chart-authoring-preview-ready")).toBeVisible();
  await full.getByRole("button", { name: /^Review\./ }).click();
  await full.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(full).toHaveCount(0);
  await expectStoredChart(page, "scatter", "Confirmed cases");
});

async function openFullChartEditor(page, panel) {
  await choosePanelAction(page, await panel.getAttribute("data-build-placement-id"), "edit");
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  const full = page.getByRole("dialog", { name: "Edit chart" });
  await expect(full).toBeVisible();
  return full;
}

async function openBiomedicalPage(page) {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
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
    expect(metric.width).toBeGreaterThan(metric.height);
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
  return page.evaluate(async ({ storageKey, targetId, otherId, targetGroupId, unrelatedGroupId }) => {
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
    const target = placements.find(({ chart }) => chart.id === targetId);
    const unrelated = placements.find(({ chart }) => chart.id === otherId);
    const chronoGroups = structuredClone(dashboard.chronoGroups ?? []);
    return {
      lastUpdated: dashboard.lastUpdated,
      targetTitle: target?.chart?.title ?? null,
      targetSourceId: target?.chart?.sourceId ?? null,
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
      targetGroup: structuredClone(
        chronoGroups.find(({ id }) => id === targetGroupId) ?? null,
      ),
      unrelatedGroup: structuredClone(
        chronoGroups.find(({ id }) => id === unrelatedGroupId) ?? null,
      ),
    };
  }, {
    storageKey: STORAGE_KEY,
    targetId: EDIT_CHART_ID,
    otherId: OTHER_LINE_CHART_ID,
    targetGroupId: TARGET_CHRONO_GROUP_ID,
    unrelatedGroupId: UNRELATED_CHRONO_GROUP_ID,
  });
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

function storedChartTitle(page, chartId) {
  return page.evaluate(async ({ key, id }) => {
    const storedDashboard = localStorage.getItem(key);
    const dashboard = storedDashboard
      ? JSON.parse(storedDashboard)
      : await fetch("/config/dashboard.json").then((response) => response.json());
    return dashboard.pages
      .flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .find((chart) => chart.id === id)?.title ?? null;
  }, { key: STORAGE_KEY, id: chartId });
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

async function expectStoredCreatedChart(page, scenario) {
  const expected = {
    count: 1,
    sourcePresent: true,
    profilePresent: true,
    roles: scenario.roles,
    duplicates: scenario.resolveDuplicates ? "last" : null,
    filters: scenario.filter
      ? [{ field: scenario.filter.field, operator: "equals", value: scenario.filter.value }]
      : [],
  };
  await expect.poll(() => page.evaluate(({ key, typeId, title, roleIds }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const charts = dashboard.pages
      .flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .filter((chart) => chart.typeId === typeId && chart.title === title);
    const chart = charts[0];
    if (!chart) return { count: charts.length };
    return {
      count: charts.length,
      sourcePresent: Boolean(dashboard.dataSources?.[chart.sourceId]),
      profilePresent: Boolean(dashboard.datasetProfiles?.[chart.sourceId]?.columns?.length),
      roles: Object.fromEntries(roleIds.map((roleId) => {
        const binding = chart.roles?.[roleId];
        return [roleId, (Array.isArray(binding) ? binding[0] : binding)?.field ?? null];
      })),
      duplicates: chart.transformations?.duplicates ?? null,
      filters: chart.transformations?.filters ?? [],
    };
  }, {
    key: STORAGE_KEY,
    typeId: scenario.typeId,
    title: scenario.title,
    roleIds: Object.keys(scenario.roles),
  })).toEqual(expected);
}
