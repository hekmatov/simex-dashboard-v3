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
  const toggle = page.getByRole("button", { name: "Build panel", exact: true });
  await toggle.click();

  const target = page.locator('[data-build-placement-id="bio_confirmed_cases"]');
  await target.scrollIntoViewIfNeeded();
  await target.getByRole("button", { name: "Edit chart", exact: true }).click();
  await expect(target).toHaveClass(/selected/);
  const selectedBefore = await target.getAttribute("data-build-placement-id");

  await target.getByRole("button", { name: "Show chart details" }).click();
  const sourceButton = target.getByRole("button", { name: "View source", exact: true });
  await sourceButton.click();
  const viewer = page.locator(".source-viewer-backdrop");
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText("Source ID");
  await viewer.getByRole("button", { name: "Close source viewer" }).click();
  await expect(viewer).toHaveCount(0);
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
  await page.getByRole("button", { name: "Build panel", exact: true }).click();

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
  await page.getByRole("button", { name: "Build panel", exact: true }).click();
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
  await page.getByRole("button", { name: "Build panel", exact: true }).click();
  await page.getByRole("button", { name: "Pages & sections", exact: true }).click();
  const structure = page.getByRole("dialog", { name: "Structure authoring" });

  for (const label of ["Home", "Biomedical", "Socio-economic"]) {
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
  await page.getByRole("button", { name: "Build panel", exact: true }).click();
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
