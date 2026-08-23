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
