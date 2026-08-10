import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const TIMELINE_FIXTURE = fileURLToPath(
  new URL("../fixtures/timeline-events.csv", import.meta.url),
);

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
  await page.goto("/");
  await page.getByRole("button", {
    name: "Explore the live dashboard",
  }).click();
  await page.getByRole("button", { name: "Build" }).click();
});

test("fresh pie authoring progressively reveals schema fields and persists the created chart", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await openWizard(page);
  let wizard = chartWizard(page);

  await expect(wizard.getByRole("button", { name: "Data source" }))
    .toBeEnabled();
  await expect(wizard.getByRole("button", { name: "Data roles" }))
    .toBeEnabled();
  await expect(wizard.getByRole("button", { name: "Style and layout" }))
    .toBeEnabled();

  await chooseType(wizard, "pie", /^Pie\b/i);
  await wizard.getByRole("button", { name: "Style and layout" }).click();
  await expect(wizard.getByLabel("Chart title")).toBeVisible();
  await expect(wizard.getByLabel("Title alignment")).toHaveCount(0);
  await expect(wizard.locator('[data-color-field="background"]')).toHaveCount(0);

  await wizard.getByRole("button", { name: "Close" }).click();
  const discard = page.getByRole("dialog", { name: "Discard chart?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Continue editing" }).click();
  await expect(wizard).toBeVisible();

  await wizard.getByRole("button", { name: "Close" }).click();
  await discard.getByRole("button", { name: "Discard" }).click();
  await expect(wizard).toHaveCount(0);

  await openWizard(page);
  wizard = chartWizard(page);
  await chooseType(wizard, "pie", /^Pie\b/i);
  await selectExistingSource(wizard, "bio_mortality");
  await expect(
    wizard.getByRole("region", { name: "Selected source profile" }),
  ).toContainText("Age group");
  await expect(
    wizard.getByRole("region", { name: "Selected source profile" }),
  ).toContainText("deaths");

  await wizard.getByRole("button", { name: "Data roles" }).click();
  await selectRole(wizard, "category", "Age group");
  await selectRole(wizard, "value", "deaths");

  await wizard.getByRole("button", { name: "Style and layout" }).click();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
  await expect(wizard.getByLabel("Title alignment")).toBeVisible();
  await expect(wizard.locator('[data-color-field="background"]')).toHaveCount(1);
  await expect(
    wizard.getByRole("group", { name: "Series colors" }),
  ).toBeVisible();
  await wizard.getByRole("button", { name: "Add color" }).click();
  await wizard.getByLabel("Color 1", { exact: true }).fill("#DC2626");
  await wizard.getByLabel("Chart title").fill("E2E mortality composition");
  await wizard.getByRole("button", { name: "Create chart" }).click();

  await expect(page.getByRole("dialog", {
    name: "Preview and refine the chart",
  })).toHaveCount(0);
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
  await openWizard(page);
  const wizard = chartWizard(page);
  await chooseType(wizard, "pie", /^Pie\b/i);
  await selectExistingSource(wizard, "bio_mortality");
  await wizard.getByRole("button", { name: "Data roles" }).click();
  await selectRole(wizard, "category", "Age group");
  await selectRole(wizard, "value", "deaths");
  await wizard.getByRole("button", { name: "Style and layout" }).click();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();

  const picker = wizard.getByRole("button", {
    name: "Pick background from dashboard",
  });
  await picker.click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-simex-eyedropper-active",
    "true",
  );
  await expect(wizard).toHaveCSS("opacity", "0");
  await expect(wizard).toHaveCSS("pointer-events", "none");

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
    sourceId: "bio_municipal_infections_harmonized_2021",
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
    visibleSections: ["Interactions"],
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
    visibleSections: ["Targets", "Collection", "Interactions"],
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
    visibleSections: ["Targets", "Interactions"],
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
    await openWizard(page);
    const wizard = chartWizard(page);
    await chooseType(wizard, scenario.query, scenario.name);
    await selectExistingSource(wizard, scenario.sourceId);
    await wizard.getByRole("button", { name: "Data roles" }).click();
    for (const [roleId, column] of Object.entries(scenario.roles)) {
      await selectRole(wizard, roleId, column);
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

    await wizard.getByRole("button", { name: "Style and layout" }).click();
    await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
    for (const heading of scenario.visibleSections) {
      await expect(wizard.getByRole("heading", { name: heading })).toBeVisible();
    }
    for (const heading of scenario.absentSections) {
      await expect(wizard.getByRole("heading", { name: heading })).toHaveCount(0);
    }
    await createChart(wizard, scenario.title);
    await expectStoredChart(page, scenario.typeId, scenario.title);
  });
}

test("bullet renderer preflight prevents a false-ready collection with colliding identity", async ({
  page,
}) => {
  await openWizard(page);
  const wizard = chartWizard(page);
  await chooseType(wizard, "bullet", /^Bullet\b/i);
  await wizard.getByRole("button", { name: "Data source" }).click();
  await wizard.locator('input[type="file"]').setInputFiles({
    name: "colliding-bullet-identities.csv",
    mimeType: "text/csv",
    buffer: Buffer.from([
      "ward,actual,capacity",
      "Ward A,4,8",
      " Ward A ,6,8",
    ].join("\n")),
  });
  await wizard.getByRole("button", { name: "Data roles" }).click();
  await selectRole(wizard, "actual", "actual");
  await selectRole(wizard, "target", "capacity");
  await selectRole(wizard, "entity", "ward");
  await wizard.getByRole("button", { name: "Style and layout" }).click();

  const invalidPreview = wizard.locator(".chart-authoring-preview-invalid");
  await expect(invalidPreview).toBeVisible();
  await expect(invalidPreview).toContainText(
    /duplicate collection identity "Ward A"/i,
  );
  await expect(invalidPreview.locator('[data-responsible-field="entity"]'))
    .toBeVisible();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toHaveCount(0);
  await expect(wizard.getByRole("button", { name: "Create chart" }))
    .toBeDisabled();
});

test("timeline upload profiles real CSV columns and creates a timeline chart", async ({
  page,
}) => {
  await openWizard(page);
  const wizard = chartWizard(page);
  await chooseType(wizard, "timeline", /^Timeline\b/i);
  await wizard.getByRole("button", { name: "Data source" }).click();
  await wizard.locator('input[type="file"]').setInputFiles(TIMELINE_FIXTURE);
  const profile = wizard.getByRole("region", {
    name: "Selected source profile",
  });
  await expect(profile).toContainText("event");
  await expect(profile).toContainText("start");
  await expect(profile).toContainText("Date or time");

  await wizard.getByRole("button", { name: "Data roles" }).click();
  for (const [roleId, column] of Object.entries({
    event: "event",
    start: "start",
    end: "end",
    lane: "lane",
    status: "status",
  })) {
    await selectRole(wizard, roleId, column);
  }

  await wizard.getByRole("button", { name: "Style and layout" }).click();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
  await expect(wizard.getByRole("heading", { name: "Timeline" })).toBeVisible();
  await expect(wizard.getByRole("heading", { name: "Axes" })).toHaveCount(0);
  await createChart(wizard, "E2E coordination timeline");
  await expectStoredChart(page, "timeline", "E2E coordination timeline");
});

test("editor reset, save race, title alignment, and shared background color stay coherent", async ({
  page,
}) => {
  await openBiomedicalPage(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await panel.getByRole("button", { name: "Edit chart" }).click();
  const editor = page.locator(".chart-editor-v3");

  await expect(editor.getByRole("button", { name: "Data", exact: true }))
    .toBeVisible();
  await expect(editor.getByRole("button", { name: "Appearance", exact: true }))
    .toBeVisible();
  await expect(editor.getByRole("button", { name: "Axes", exact: true }))
    .toBeVisible();
  await expect(editor.getByRole("button", { name: "Interactions", exact: true }))
    .toBeVisible();
  await expect(editor.getByRole("button", { name: "Collection", exact: true }))
    .toHaveCount(0);
  await expect(editor.getByRole("button", { name: "Timeline", exact: true }))
    .toHaveCount(0);
  await expect(editor.getByRole("button", { name: "Map", exact: true }))
    .toHaveCount(0);
  await expect.poll(() => editor.locator(".chart-editor-actions button").evaluateAll(
    (buttons) => buttons.map((button) => button.getAttribute("aria-label")),
  )).toEqual([
    "Save changes",
    "Reset changes",
    "Cancel",
    "Remove chart",
  ]);

  await editor.getByRole("button", { name: "Appearance", exact: true })
    .click();
  const title = editor.getByLabel("Chart title");
  await title.fill("Unsaved title");
  await editor.getByRole("button", { name: "Reset changes" }).click();
  const resetDialog = page.getByRole("dialog", {
    name: "Discard these edits?",
  });
  await resetDialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(title).toHaveValue("Unsaved title");
  await editor.getByRole("button", { name: "Reset changes" }).click();
  await resetDialog.getByRole("button", { name: "Reset changes" }).click();
  await editor.getByRole("button", { name: "Appearance", exact: true })
    .click();
  await expect(title).toHaveValue("Confirmed cases");

  await title.fill("Race-safe centered cases");
  await editor.getByLabel("Title alignment").selectOption("center");
  await editor.getByLabel("Background", { exact: true }).fill("#F5F8FB");
  await expect(
    editor.getByRole("group", { name: "Series colors" }),
  ).toBeVisible();
  await expect(editor.getByLabel("Line width")).toBeVisible();
  await expect(editor.getByLabel("Bar width")).toHaveCount(0);
  await editor.getByLabel("Line width").fill("3.5");
  await editor.getByRole("button", { name: "Add color" }).click();
  await editor.getByLabel("Color 1", { exact: true }).fill("#2BAA7B");
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await panel.getByRole("button", { name: "Edit chart" }).click();
  await editor.getByRole("button", { name: "Appearance", exact: true })
    .click();
  await editor.getByRole("button", { name: "Reset changes" }).click();
  await resetDialog.getByRole("button", { name: "Reset changes" }).click();
  await editor.getByRole("button", { name: "Appearance", exact: true })
    .click();
  await expect(title).toHaveValue("Race-safe centered cases");
  await expect(editor.locator('.chart-view-frame[data-title-align="center"]'))
    .toBeVisible();
  await expectStoredChart(page, "line", "Race-safe centered cases");
  await expect.poll(() => page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const chart = dashboard.pages
      .flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .find(({ id }) => id === "bio_confirmed_cases");
    return {
      align: chart.presentation.title.align,
      background: chart.presentation.background.color,
      series: chart.presentation.series,
    };
  }, STORAGE_KEY)).toEqual({
    align: "center",
    background: "#F5F8FB",
    series: {
      colors: ["#2BAA7B"],
      lineWidth: 3.5,
    },
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

async function openWizard(page) {
  await page.getByRole("button", { name: "Add chart" }).first().click();
}

async function openBiomedicalPage(page) {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Open Biomedical", exact: true })
    .click();
}

function chartWizard(page) {
  return page.locator(".chart-wizard-backdrop");
}

async function chooseType(wizard, query, accessibleName) {
  await wizard.getByLabel("Search chart types").fill(query);
  await wizard.getByRole("button", { name: accessibleName }).click();
}

async function selectExistingSource(wizard, sourceId) {
  await wizard.getByRole("button", { name: "Data source" }).click();
  await wizard.getByLabel("Dashboard data source").selectOption(sourceId);
}

async function selectRole(wizard, roleId, column) {
  await wizard.locator(`[data-field-id="${roleId}"] select`)
    .selectOption(column);
}

async function createChart(wizard, title) {
  await wizard.getByLabel("Chart title").fill(title);
  await expect(wizard.getByRole("button", { name: "Create chart" }))
    .toBeEnabled();
  await wizard.getByRole("button", { name: "Create chart" }).click();
}

async function expectStoredChart(page, typeId, title) {
  await expect.poll(() => page.evaluate(({ key, expectedType, expectedTitle }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
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
