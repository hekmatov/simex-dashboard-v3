import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://127.0.0.1:4175/tests/e2e/dashboard-render-boundary-harness.html");
  await expect(page.locator('[data-build-placement-id="placement-b"]')).toBeVisible();
});

test("selection changes do not render an unaffected chart", async ({ page }) => {
  const before = await readCounts(page);
  const sectionBefore = await readSectionCounts(page);

  await page.getByRole("button", { name: "Select chart A" }).click();

  await expect(page.locator('[data-build-placement-id="placement-a"]')).toHaveClass(/selected/);
  const after = await readCounts(page);
  expect(after["chart-a"]).toBeGreaterThan(before["chart-a"]);
  expect(after["chart-b"]).toBe(before["chart-b"]);
  const sectionAfter = await readSectionCounts(page);
  expect(sectionAfter["section-b"]).toBe(sectionBefore["section-b"]);
  expect(sectionAfter["section-c"]).toBe(sectionBefore["section-c"]);
});

test("section reorder leaves untouched sections and their charts unrendered", async ({ page }) => {
  const chartBefore = await readCounts(page);
  const sectionBefore = await readSectionCounts(page);

  await page.getByRole("button", { name: "Reorder sections" }).evaluate((button) => button.click());

  await expect(page.locator("[data-canonical-section-id]").first()).toHaveAttribute("data-canonical-section-id", "section-b");
  const chartAfter = await readCounts(page);
  const sectionAfter = await readSectionCounts(page);
  expect(chartAfter["chart-a"]).toBe(chartBefore["chart-a"]);
  expect(chartAfter["chart-b"]).toBe(chartBefore["chart-b"]);
  expect(sectionAfter["section-c"]).toBe(sectionBefore["section-c"]);
});

test("moving a sibling preserves the unaffected chart render and focus state", async ({ page }) => {
  const placementB = page.locator('[data-build-placement-id="placement-b"]');
  await placementB.focus();
  const before = await readCounts(page);

  await page.getByRole("button", { name: "Move chart A" }).evaluate((button) => button.click());

  await expect(page.locator('[data-canonical-section-id="section-b"] [data-build-placement-id="placement-a"]')).toBeVisible();
  const after = await readCounts(page);
  expect(after["chart-b"]).toBe(before["chart-b"]);
  expect(await placementB.evaluate((node) => document.activeElement === node)).toBe(true);
});

async function readCounts(page) {
  return page.evaluate(() => ({ ...window.__dashboardRenderHarness.reads }));
}

async function readSectionCounts(page) {
  return page.evaluate(() => ({ ...window.__dashboardRenderHarness.sectionReads }));
}
