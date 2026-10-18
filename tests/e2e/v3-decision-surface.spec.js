import { expect, test } from "@playwright/test";
import { authorAttentionStrip } from "./support/buildWorkflow.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
});

test("attention strip renders above the page body and drills to its target", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const sectionId = await authorAttentionStrip(page);
  const pane = page.locator('[data-build-rail="properties"]');
  const drillSelect = pane.getByLabel(/Drill link for/).first();
  const sectionTarget = await drillSelect.locator('option[value^="section:"]').first().getAttribute("value");
  expect(sectionTarget).toBeTruthy();
  await drillSelect.selectOption(sectionTarget);
  await page.getByRole("button", { name: "Save Layout Changes" }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();

  const strip = page.locator(`.dashboard-attention-strip[data-canonical-section-id="${sectionId}"]`);
  await expect(strip).toBeVisible();
  const stripBox = await strip.boundingBox();
  const firstBody = page.locator('.dashboard-section:not(.dashboard-attention-strip)').first();
  const bodyBox = await firstBody.boundingBox();
  expect(stripBox.y).toBeLessThan(bodyBox.y);

  const drill = strip.locator(".attention-drill").first();
  const targetId = await drill.getAttribute("data-drill-target");
  await drill.click();
  const target = page.locator(`[data-canonical-section-id="${targetId}"], [data-canonical-panel-id="${targetId}"]`).first();
  await expect(target).toHaveAttribute("data-drill-highlight", "true");
  await expect(target).toBeFocused();
});

test("Set page time opens whole-page playback and the readout follows the scrub", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const readout = page.locator(".page-time-context__value");
  await expect(readout).toHaveText("Latest available");
  await page.getByRole("button", { name: "Set page time" }).click();
  await expect(page.getByRole("region", { name: "Chrono playback controls" }).getByLabel("Chrono source")).toHaveValue("page:");
  await expect(readout).toContainText("Whole page");
  const controls = page.getByRole("region", { name: "Chrono playback controls" });
  const frame = controls.getByRole("slider", { name: "Playback frame" });
  await expect(frame).toHaveValue(await frame.getAttribute("max"));
  await expect(controls.getByRole("button", { name: "Next frame", exact: true })).toBeDisabled();
  const before = await readout.textContent();
  await controls.getByRole("button", { name: "Previous frame", exact: true }).click();
  await expect(readout).not.toHaveText(before);
  await page.getByRole("button", { name: "Exit page time" }).click();
  await expect(readout).toHaveText("Latest available");
});
