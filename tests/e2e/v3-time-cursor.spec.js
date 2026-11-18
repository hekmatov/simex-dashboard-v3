import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { revealCanonicalPanel, timeCursor } from "./support/time-cursor-workflow.js";
import { normalizeDashboardBoundary } from "../../src/charting/config/dashboardBundleV3.js";

const CONTROL_URL = "http://127.0.0.1:4174";
test.use({ storageState: { cookies: [], origins: [] } });
test.beforeEach(async ({ request }) => {
  await request.post(CONTROL_URL + "/__test__/reset");
  await request.post(CONTROL_URL + "/__test__/catalogue-mode", { data: { mode: "absent" } });
});

test("shared Time bar seeks scopes traces and safety-pauses while ordinary charts stay canonical", async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  const response = await request.get("http://127.0.0.1:4173/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const dashboard = normalizeDashboardBoundary(await response.json());
  const storyline = dashboard.scenes.find(item => item.name === "National outbreak and health-system playback");
  expect(storyline).toBeTruthy();
  await page.addInitScript(fixture => localStorage.setItem("simex-dashboard-config-v3-three-mode-v1", JSON.stringify(fixture)), dashboard);
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const cursor = timeCursor(page);
  await cursor.open();
  await expect(cursor.scope).toHaveValue("page");
  await cursor.selectScope({ name: storyline.name });
  await expect(page.locator("[data-chrono-section]")).toHaveCount(0);
  const ordinary = await revealCanonicalPanel(page, "bio_r_values");
  await expect(ordinary.locator('[data-canonical-plot-id="bio_r_values"]')).toBeVisible();
  await expect(ordinary.locator('[class*="chart-status-"]')).toHaveCount(0);

  const settings = await cursor.settings();
  await settings.getByRole("combobox", { name: "Matching override", exact: true }).selectOption("closest");
  await settings.getByLabel("Nearest maximum distance (hours)", { exact: true }).fill("24");
  await settings.getByRole("button", { name: "Apply nearest override", exact: true }).click();
  await expect(settings).toContainText("Active maximum distance: 24 hours.");
  await settings.getByRole("combobox", { name: "Trace behavior", exact: true }).selectOption("full");
  await settings.getByLabel("Show observation availability", { exact: true }).check();
  const availability = settings.getByRole("complementary", { name: "Observation availability", exact: true });
  await expect(availability.locator("li[data-chart-id]").first()).toBeVisible();
  await expect(availability.locator('li[data-availability]:not([data-availability="static"])').first()).toBeVisible();
  await expect(page.getByText(/nearest matching requires/i)).toHaveCount(0);
  await expect(cursor.frame).toBeEnabled();
  const minimum = Number(await cursor.frame.getAttribute("min"));
  const maximum = Number(await cursor.frame.getAttribute("max"));
  expect(maximum).toBeGreaterThan(minimum);
  await cursor.frame.fill(String(minimum));
  await expect(cursor.frame).toHaveValue(String(minimum));
  await page.evaluate(() => {
    window.__observedTimeKeys = [];
    document.addEventListener("keydown", event => {
      if (event.target.getAttribute("aria-label") !== "Selected time") return;
      queueMicrotask(() => window.__observedTimeKeys.push({ trusted: event.isTrusted, key: event.key,
        alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey, prevented: event.defaultPrevented }));
    }, true);
  });
  await cursor.frame.focus();
  for (const key of ["Alt+ArrowRight", "Control+ArrowLeft", "Meta+ArrowLeft"]) await page.keyboard.press(key);
  const modifiedKeys = await page.evaluate(() => window.__observedTimeKeys.filter(event => /^Arrow/.test(event.key)));
  expect(modifiedKeys).toHaveLength(3);
  for (const event of modifiedKeys) {
    expect(event.trusted).toBe(true);
    expect(event.alt || event.ctrl || event.meta).toBe(true);
    expect(event.prevented).toBe(false);
  }
  await cursor.frame.fill(String(minimum));
  const cadence = settings.getByLabel("Seconds per frame", { exact: true });
  await expect(cadence).toHaveAttribute("type", "number");
  await cadence.fill("0.75");
  await expect(cadence).toHaveValue("0.75");
  await cursor.bar.getByRole("button", { name: "Play time", exact: true }).click();
  await expect(cursor.bar.getByRole("button", { name: "Pause time", exact: true })).toBeVisible();
  await cursor.selectScope({ kind: "page" });
  await expect(cursor.bar.getByRole("button", { name: "Play time", exact: true })).toBeVisible();
  const selectedTime = await cursor.frame.inputValue();
  await cursor.bar.getByRole("button", { name: "Time settings", exact: true }).click();
  const overlay = page.getByRole("note", { name: "Exercise time stamp", exact: true });
  await expect(overlay).toBeVisible();
  const pointerBefore = await overlay.boundingBox();
  await page.mouse.move(pointerBefore.x + 40, pointerBefore.y + 30);
  await page.mouse.down();
  await page.mouse.move(pointerBefore.x + 90, pointerBefore.y - 5, { steps: 5 });
  await page.mouse.up();
  const pointerMoved = await overlay.boundingBox();
  expect(pointerMoved.x).toBeGreaterThan(pointerBefore.x + 30);
  expect(pointerMoved.y).toBeLessThan(pointerBefore.y - 20);
  await page.getByLabel("Move Chrono date overlay", { exact: true }).focus();
  const before = await overlay.boundingBox();
  await page.keyboard.press("ArrowRight");
  const moved = await overlay.boundingBox();
  expect(moved.x).toBeCloseTo(before.x + 10, 0);
  const resize = page.getByRole("button", { name: "Resize Chrono date overlay", exact: true });
  const handle = await resize.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 20, handle.y + handle.height / 2 + 15, { steps: 4 });
  await page.mouse.up();
  const pointerResized = await overlay.boundingBox();
  expect(pointerResized.width).toBeCloseTo(moved.width + 20, 0);
  expect(pointerResized.height).toBeCloseTo(moved.height + 15, 0);
  await resize.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  const resized = await overlay.boundingBox();
  expect(resized.width).toBeCloseTo(pointerResized.width + 10, 0);
  expect(resized.height).toBeCloseTo(pointerResized.height + 10, 0);

  const focusPanel = await revealCanonicalPanel(page, "bio_confirmed_cases");
  await expect(focusPanel.locator('[data-chart-time-kind="observed"]')).toContainText("Observed");
  await focusPanel.getByRole("button", { name: "Focus chart", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Focused chart", exact: true })).toBeVisible();
  await expect(overlay).toBeHidden();
  await expect(page.locator(".fullscreen-context-header")).toContainText("At");
  await page.getByRole("button", { name: "Exit fullscreen", exact: true }).click();
  await expect(overlay).toBeVisible();
  const restored = await overlay.boundingBox();
  for (const key of ["x", "y", "width", "height"]) expect(restored[key]).toBeCloseTo(resized[key], 0);
  await expect(cursor.frame).toHaveValue(selectedTime);
  await cursor.settings();
  await expect(cadence).toHaveValue("0.75");
  await cursor.bar.getByRole("button", { name: "Time settings", exact: true }).click();

  await page.getByRole("button", { name: "Compare charts", exact: true }).click();
  await expect(overlay).toBeHidden();
  for (const id of ["bio_confirmed_cases", "bio_hospital_occupancy"]) {
    const panel = await revealCanonicalPanel(page, id);
    await panel.getByRole("button", { name: "Add chart to comparison", exact: true }).click();
  }
  await page.getByRole("region", { name: "Chart comparison selection", exact: true }).getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Chart comparison", exact: true })).toBeVisible();
  await expect(overlay).toBeHidden();
  await page.getByRole("button", { name: "Exit comparison", exact: true }).click();
  await expect(overlay).toBeVisible();
  await expect(cursor.frame).toHaveValue(selectedTime);

  for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(cursor.bar).toBeVisible();
    await cursor.open();
    if (viewport.width < 768) {
      await expect(overlay).toHaveCount(0);
      await expect(cursor.frame).toHaveCSS("height", "56px");
    } else {
      await expectOverlayClearOfControls(page, overlay);
    }
    const geometry = await cursor.bar.locator(".time-bar__row button").evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => {
      const box = node.getBoundingClientRect(); return { height: box.height, width: box.width, left: box.left, right: box.right };
    }));
    expect(geometry.length).toBeGreaterThan(0);
    for (const box of geometry) {
      expect(box.height).toBeGreaterThanOrEqual(viewport.width < 768 ? 44 : 30);
      if (viewport.width < 768) expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(viewport.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  }
  const live = cursor.bar.getByRole("button", { name: "Return to Live", exact: true });
  await live.focus();
  await page.keyboard.press("Space");
  await expect(cursor.bar).toHaveAttribute("data-time-mode", "live");
});

test("time stamp remains movable at the viewport edge after settings close", async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const cursor = timeCursor(page);
  await cursor.open();
  await cursor.frame.fill(await cursor.frame.getAttribute("min"));
  const settings = await cursor.settings();
  await settings.getByLabel("Show observation availability", { exact: true }).check();
  await cursor.bar.getByRole("button", { name: "Time settings", exact: true }).click();
  const overlay = page.getByRole("note", { name: "Exercise time stamp", exact: true });
  const handle = page.getByLabel("Move Chrono date overlay", { exact: true });
  await handle.focus();
  await page.keyboard.press("ArrowUp");
  const before = await overlay.boundingBox();
  const move = await handle.boundingBox();
  await page.mouse.move(move.x + move.width / 2, move.y + move.height / 2);
  await page.mouse.down();
  await page.mouse.move(move.x + move.width / 2 + 40, move.y + move.height / 2 - 35, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await overlay.boundingBox()).x).toBeCloseTo(before.x + 40, 0);
  await expect.poll(async () => (await overlay.boundingBox()).y).toBeCloseTo(before.y - 35, 0);
  await page.getByRole("button", { name: "Compare charts", exact: true }).click();
  await expect(overlay).toBeHidden();
  await page.getByRole("region", { name: "Chart comparison selection", exact: true }).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(overlay).toBeVisible();
});

test("Time bar remains reachable after page scroll on tablet and phone", async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const cursor = timeCursor(page);
    await expect(cursor.instant).toBeInViewport();
    await expect.poll(() => cursor.instant.evaluate(node => {
      const box = node.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return hit === node || node.contains(hit);
    })).toBe(true);
    await cursor.instant.click();
    await expect(cursor.frame).toBeVisible();
    await expect(cursor.frame).toHaveCSS("height", viewport.width < 768 ? "56px" : "44px");
    await cursor.instant.click();
  }
});

async function expectOverlayClearOfControls(page, overlay) {
  const collisions = await page.evaluate(() => {
    const box = document.querySelector('[data-chrono-date-overlay="true"]').getBoundingClientRect();
    return [...document.querySelectorAll('.dashboard-command-crown button, .dashboard-command-crown select, .canonical-dashboard-frame .dashboard-header, .time-bar button, .time-bar select, .time-bar input')]
      .filter(node => node.getClientRects().length > 0).filter(node => {
        const other = node.getBoundingClientRect();
        return box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top;
      }).map(node => node.getAttribute('aria-label') || node.textContent?.trim() || node.tagName);
  });
  expect(collisions, JSON.stringify(collisions)).toEqual([]);
  await expect(overlay).toBeVisible();
}
