import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Build chrome and source viewing preserve the saved layout and restoration context", async ({ page }) => {
  await openBiomedicalBuild(page);
  const baseline = await canvasIdentity(page);
  const saved = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  const toggle = page.getByRole("button", { name: "Dashboard map", exact: true });
  await toggle.click();

  const target = page.locator('[data-build-placement-id="bio_confirmed_cases"]');
  await target.scrollIntoViewIfNeeded();
  await target.getByRole("button", { name: "Edit chart", exact: true }).click();
  await expect(target).toHaveClass(/selected/);
  const selectedBefore = await target.getAttribute("data-build-placement-id");

  const sourceButton = target.getByRole("button", { name: "View source CSV", exact: true });
  const popupPromise = page.waitForEvent("popup");
  await sourceButton.click();
  const viewer = await popupPromise;
  await expect(viewer.getByText("Dataset", { exact: true })).toBeVisible();
  const closePromise = viewer.waitForEvent("close");
  await viewer.getByRole("button", { name: "Return to dashboard" }).click();
  await closePromise;
  await expect(sourceButton).toBeFocused();
  await expect(target).toHaveAttribute("data-build-placement-id", selectedBefore);

  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(saved);
  await toggle.click();
  expect(await canvasIdentity(page)).toEqual(baseline);
});

test("layout and selected-chart drafts stay independent through layout discard", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Socio-economic", exact: true }).click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();

  await page.getByRole("button", {
    name: "Move Public response and policy signals later",
    exact: true,
  }).click();
  const target = page.locator('[data-build-placement-id="socio_trust_trend"]');
  await target.getByRole("button", { name: "Edit chart", exact: true }).click();
  await page.getByRole("gridcell", {
    name: "Set chart size to 3 columns by 1 row",
    exact: true,
  }).click();

  await expect(page.locator('[data-draft-slot="layout"]')).toHaveAttribute("data-draft-status", "dirty");
  await expect(page.locator('[data-draft-slot="chart"]')).toHaveAttribute("data-draft-status", "dirty");
  await page.getByRole("button", { name: "Discard Layout Changes", exact: true }).click();

  await expect(page.locator('[data-draft-slot="layout"]')).toHaveAttribute("data-draft-status", "clean");
  await expect(page.locator('[data-draft-slot="chart"]')).toHaveAttribute("data-draft-status", "dirty");
  await expect(page.getByRole("complementary", {
    name: "Chart settings for Trust in institutions over time",
  })).toBeVisible();
  await expect(target).toBeInViewport();
});

test("Context Shelf suspends and restores a dirty chart around auxiliary work", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Socio-economic", exact: true }).click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await page.getByRole("button", {
    name: "Move Public response and policy signals later",
    exact: true,
  }).click();

  const target = page.locator('[data-build-placement-id="socio_trust_trend"]');
  await target.getByRole("button", { name: "Edit chart", exact: true }).click();
  await page.getByRole("gridcell", {
    name: "Set chart size to 3 columns by 1 row",
    exact: true,
  }).click();
  await page.getByRole("button", { name: "Pages & sections", exact: true }).click();

  const structure = page.getByRole("dialog", { name: "Structure authoring" });
  await expect(structure).toBeVisible();
  await expect(page.locator(".unit-orbit")).toBeHidden();
  await expect(page.locator('[data-draft-slot="layout"]')).toHaveAttribute("data-draft-status", "dirty");
  await expect(page.locator('[data-draft-slot="chart"]')).toHaveAttribute("data-draft-status", "dirty");
  await structure.getByRole("button", { name: "Close", exact: true }).click();

  await expect(page.getByRole("complementary", {
    name: "Chart settings for Trust in institutions over time",
  })).toBeVisible();
  await expect(target).toBeInViewport();
  await expect(page.locator('[data-draft-slot="layout"]')).toHaveAttribute("data-draft-status", "dirty");
  await expect(page.locator('[data-draft-slot="chart"]')).toHaveAttribute("data-draft-status", "dirty");
});

test("zero Page and zero Section recovery stays inline in the live Build shell", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await page.getByRole("button", { name: "Pages & sections", exact: true }).click();
  const structure = page.getByRole("dialog", { name: "Structure authoring" });

  for (const label of ["Old Homepage Content", "Biomedical", "Socio-economic"]) {
    await structure.getByRole("button", { name: `Delete ${label} page`, exact: true }).click();
    await page.getByRole("dialog", { name: `Delete Page ${label}?` })
      .getByRole("button", { name: "Delete page", exact: true }).click();
  }

  await expect(structure).toContainText("No Pages remain in this Structure draft.");
  await expect(page.locator("[data-canonical-canvas-id]")).toBeVisible();
  await structure.getByRole("button", { name: "Create replacement Page", exact: true }).click();
  await structure.getByRole("button", { name: "Delete section…", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete Section?" })
    .getByRole("button", { name: "Delete section", exact: true }).click();

  await expect(structure).toContainText("New Page has no Sections.");
  await structure.getByRole("button", { name: "Save Structure", exact: true }).click();
  await expect(structure.getByRole("alert")).toContainText("New Page must retain a Section.");
});

test("chart creation keeps canonical render and placement proofs reachable through all six stages", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add new chart" });
  const deck = wizard.locator('[data-chart-proof-deck="persistent"]');

  for (const stage of [
    "destination",
    "chart-type",
    "data-source",
    "map-and-prepare-data",
    "configure-chart",
    "review-and-create",
  ]) {
    await wizard.locator(`#chart-stage-${stage}`).click();
    await expect(deck.getByRole("article", { name: "Canonical render proof" })).toBeVisible();
    await expect(deck.getByRole("article", { name: "Placement proof" })).toBeVisible();
    await expect(deck.locator("[data-proof-revision]")).toHaveCount(2);
  }

  const bodyBox = await wizard.locator(".chart-wizard-body").boundingBox();
  const deckBox = await deck.boundingBox();
  expect(deckBox.x).toBeGreaterThan(bodyBox.x);
  expect(deckBox.width).toBeGreaterThan(300);
});

test("chart recovery states retain canonical plot geometry", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("http://127.0.0.1:4175/tests/e2e/chart-state-harness.html");

  const panel = page.locator('[data-canonical-panel-id="recovery-proof"]');
  const state = panel.locator('[data-chart-state="error"]');
  await expect(state).toBeVisible();
  await expect(state).toContainText("previous valid dashboard state is unchanged");
  const bounds = await state.boundingBox();
  expect(bounds.width).toBeGreaterThan(200);
  expect(bounds.height).toBeGreaterThan(100);
  await expect(state.locator('[data-last-valid-retained="true"]')).toHaveCount(1);

  const partial = page.locator('[data-canonical-panel-id="partial-proof"]');
  await expect(partial.locator('.chart-state-surface--partial')).toBeVisible();
  await expect(partial).toContainText("Booster coverage is unavailable");
  await expect(partial.getByRole("img", { name: "Available vaccination series" })).toBeVisible();
  await partial.getByRole("button", { name: "Continue with Available Data" }).click();
  await expect(partial.getByRole("status")).toContainText("saved chart semantics are unchanged");
  await expect(partial.locator('.chart-state-surface--partial')).toBeVisible();
});

test("Home availability draft blocks package controls and mode exit until Discard", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();

  const scenarioTrigger = page.locator(".dashboard-scenario-trigger");
  await scenarioTrigger.click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  const showHome = passport.getByRole("checkbox", { name: "Show Home", exact: true });
  await expect(showHome).toBeChecked();
  await expect(passport).toContainText(
    "When off, Home is unavailable to dashboard visitors. You can turn it back on here.",
  );

  await showHome.uncheck();
  await expect(passport).toContainText("Unsaved Scenario");
  for (const name of [
    "Import Dashboard Package",
    "Download Dashboard Package",
    "Reset Dashboard to Source",
  ]) {
    await expect(passport.getByRole("button", { name, exact: true })).toBeDisabled();
  }

  await page.getByRole("button", { name: "Reset", exact: true })
    .evaluate((element) => element.click());
  await expect(page.getByRole("dialog", { name: "Discard these edits?" })).toHaveCount(0);
  await expect(showHome).not.toBeChecked();

  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "View", exact: true }).click();
  await expect(page.getByRole("button", { name: "Build", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".mode-switch-error")).toHaveText(
    "Save or discard changes to Scenario before leaving this edit. Stay in Build to continue editing.",
  );

  await passport.getByRole("button", { name: "Close", exact: true }).click();
  await expect(scenarioTrigger).toContainText("Unsaved");
  await scenarioTrigger.click();
  await passport.getByRole("button", { name: "Discard Scenario", exact: true }).click();
  await expect(showHome).toBeChecked();
  await expect(passport.getByRole("button", { name: "Import Dashboard Package", exact: true })).toBeEnabled();
});

test("Scenario Passport owns direct identity edits and package operations in Build", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await expect(page.getByLabel("Dashboard mode")).toBeVisible();
  await page.evaluate(async (storageKey) => {
    const config = await fetch("/config/dashboard.json").then((response) => response.json());
    config.home = { enabled: true };
    config.dataSources = {};
    config.datasetProfiles = {};
    config.assets = {};
    config.contentLibrary = { mediaItems: {}, sourceEntries: {} };
    config.chronoGroups = [];
    config.scenes = [];
    delete config.loadedData;
    delete config.dataSourceStates;
    config.pages = [{
      id: "passport_package_page",
      label: "Passport package Page",
      title: "Passport package Page",
      sections: [{ id: "passport_section", title: "Passport Section", panels: [] }],
    }];
    localStorage.setItem(storageKey, JSON.stringify(config));
  }, STORAGE_KEY);
  await page.reload();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();

  const scenarioTrigger = page.locator(".dashboard-scenario-trigger");
  await scenarioTrigger.click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await expect(passport).toBeVisible();
  await expect(passport.getByRole("button", { name: "Import Dashboard Package", exact: true })).toBeEnabled();
  await expect(passport.getByRole("button", { name: "Download Dashboard Package", exact: true })).toBeEnabled();
  await expect(passport.getByRole("button", { name: "Reset Dashboard to Source", exact: true })).toBeEnabled();
  page.once("dialog", (dialog) => dialog.accept("Scenario-Passport-test"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    passport.getByRole("button", { name: "Download Dashboard Package", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);

  await passport.getByRole("button", { name: /^Edit Program:/ }).click();
  await passport.getByLabel("Program", { exact: true }).fill("Unsaved response program");
  await expect(passport).toContainText("Unsaved Scenario");
  await expect(passport.getByRole("button", { name: "Import Dashboard Package", exact: true })).toBeDisabled();
  await expect(passport).toContainText("Save or discard the Scenario changes");

  await passport.getByRole("button", { name: "Close", exact: true }).click();
  await expect(passport).toHaveCount(0);
  await expect(scenarioTrigger).toContainText("Unsaved");
  await scenarioTrigger.click();
  await passport.getByRole("button", { name: "Discard Scenario", exact: true }).click();
  await expect(passport.getByRole("button", { name: "Import Dashboard Package", exact: true })).toBeEnabled();
  await passport.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "View", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Scenario Passport" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Import Dashboard Package", exact: true })).toHaveCount(0);
});

async function openBiomedicalBuild(page) {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
}

async function canvasIdentity(page) {
  await expect(page.locator("[data-canonical-canvas-id]")).toBeVisible();
  return page.evaluate(() => ({
    canvas: document.querySelector("[data-canonical-canvas-id]")?.getAttribute("data-canonical-canvas-id"),
    sections: [...document.querySelectorAll("[data-canonical-section-id]")]
      .map((node) => node.getAttribute("data-canonical-section-id")),
    panels: [...document.querySelectorAll("[data-canonical-panel-id]")]
      .map((node) => node.getAttribute("data-canonical-panel-id")),
  }));
}
