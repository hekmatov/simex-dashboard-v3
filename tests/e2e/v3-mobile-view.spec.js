import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { enterAuthoredDashboard } from "./support/landingWorkflow.js";
import { collectPhoneViewDensity } from "./support/dashboard-density-audit.js";

const CONTROL_URL = "http://127.0.0.1:4174";
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  const config = await request.get("/config/dashboard.json");
  expect(createHash("sha256").update(await config.body()).digest("hex"))
    .toBe("4392eadf2b03788f0542f1b465b1970769a74f503c7024824d64b66b440fae47");
});

test("phone Scenario leads with exercise content and offers time through one bottom control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?mode=view");
  await expect(page.locator('main[data-canonical-page-id="scenario"]')).toBeVisible();
  const time = page.getByRole("button", { name: "Time", exact: true });
  await expect(time).toHaveAttribute("aria-expanded", "false");
  const box = await time.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBe(44);
  await expect(time.locator('[data-icon-id="time"]')).toBeVisible();
  expect(box.y + box.height).toBeGreaterThan(800);
  await expect(page.getByRole("button", { name: "Play time", exact: true })).toHaveCount(0);
  await expect(page.getByText("No observations for this selection.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Operating instructions", { exact: true })).toBeInViewport();
  await expect(page.locator(".exercise-disclaimer .exercise-context-stamp__notice")).toBeVisible();
  await expect(page.locator(".exercise-disclaimer .exercise-context-stamp__version")).toBeHidden();
  const footer = page.locator(".view-shell .dashboard-footer");
  await expect(footer.locator(".dashboard-footer__version")).toBeVisible();
  expect((await footer.boundingBox()).height).toBeLessThanOrEqual(69);
  await time.click();
  const closeTime = page.getByRole("button", { name: "Hide time controls", exact: true });
  await expect(closeTime.locator('[data-icon-id="close"]')).toBeVisible();
  expect((await closeTime.boundingBox()).width).toBe(box.width);
  await expect(page.getByRole("combobox", { name: "Apply time to" }).locator('option[value="dashboard"]')).toHaveText("All pages");
  await expect(page.getByText("No observations for this selection.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Time settings", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Apply time to" }).focus();
  await page.keyboard.press("Escape");
  await expect(time).toBeFocused();
  await expect(time).toHaveAttribute("aria-expanded", "false");
});

test("phone Time settings pair related fields without empty rows", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto("/?mode=view");
  await page.getByRole("button", { name: "Time", exact: true }).click();
  await page.getByRole("combobox", { name: "Apply time to" }).selectOption("dashboard");
  const settings = page.getByRole("button", { name: "Time settings", exact: true });
  const panel = page.locator(".time-bar__phone-view-controls");
  const panelBox = await panel.boundingBox();
  expect(panelBox.height).toBeLessThanOrEqual(94);
  const slider = await panel.getByRole("slider", { name: "Selected time" }).boundingBox();
  const transport = await settings.boundingBox();
  expect(slider.width).toBeGreaterThanOrEqual(panelBox.width - 16);
  expect(slider.y + slider.height).toBeLessThanOrEqual(transport.y + 1);
  expect(transport.height).toBeLessThanOrEqual(36);
  const matching = panel.getByRole("combobox", { name: "Matching override" });
  await expect(matching.locator("option")).toHaveText(["Defaults", "Concurrent", "Latest", "Closest", "Interpolate"]);
  expect(Math.abs((await matching.boundingBox()).y - (await panel.getByRole("combobox", { name: "Apply time to" }).boundingBox()).y)).toBeLessThanOrEqual(1);
  await settings.click();
  for (const [left, right] of [
    [panel.getByRole("combobox", { name: "Speed preset" }), panel.getByRole("spinbutton", { name: "Seconds per frame" })],
    [panel.getByLabel("Window start", { exact: true }), panel.getByLabel("Window end", { exact: true })],
  ]) {
    const first = await left.boundingBox({ timeout: 5000 });
    const second = await right.boundingBox({ timeout: 5000 });
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1);
    expect(first.x + first.width).toBeLessThan(second.x);
    expect(first.height).toBeGreaterThanOrEqual(44);
    expect(second.height).toBeGreaterThanOrEqual(44);
  }
  expect(await panel.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  await expect(panel.getByRole("button", { name: "Apply window", exact: true })).toBeInViewport();
  const trace = panel.getByRole("combobox", { name: "Chart trace" });
  await expect(trace.locator("option")).toHaveText(["Draw up to selected date", "Full trace with date marker"]);
  await trace.selectOption("full");
  await expect(trace).toHaveValue("full");
  const availability = panel.getByRole("checkbox", { name: "Show observation availability" });
  expect((await availability.boundingBox()).y).toBeGreaterThan((await panel.getByRole("button", { name: "Apply window" }).boundingBox()).y);
  await matching.selectOption("closest");
  await expect(panel.getByRole("button", { name: "Apply nearest override" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute("aria-expanded", "false");
});

test("phone View keeps the chart title and plots the closest observation for a concurrent gap", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?mode=view");
  await page.locator('.crown-compact-pages [data-dashboard-page-id="biomedical"]').click();
  await page.getByRole("button", { name: "Time", exact: true }).click();
  await page.getByRole("combobox", { name: "Matching override" }).selectOption("concurrent");
  await page.getByRole("slider", { name: "Selected time", exact: true }).press("Home");
  await page.getByRole("button", { name: "Hide time controls", exact: true }).click();

  const chart = page.locator('[data-canonical-plot-id="bio_confirmed_cases"]');
  await expect(chart.getByRole("heading", { name: "Confirmed cases", exact: true })).toBeVisible();
  await expect(chart.locator('canvas').first()).toBeVisible();
  await expect(chart).toHaveAttribute("data-chart-time-fallback", "true");
  await expect(chart.getByText(/Not concurrent · Observed/)).toHaveCount(1);
  await expect(chart.getByText(/No measurement at this time/)).toHaveCount(0);
});

test("phone side menu opens Theme, dark Time fields are legible, and cards pass through scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 468, height: 771 });
  await page.goto("/?mode=view");
  const menu = page.getByRole("button", { name: "Dashboard menu", exact: true });
  await menu.click();
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const theme = page.getByRole("dialog", { name: "Theme", exact: true });
  const dark = theme.getByRole("radio", { name: "Dark", exact: true });
  await expect(dark).toBeInViewport();
  await dark.check();
  await theme.getByRole("button", { name: "Close Theme" }).click();
  await expect(page.locator(".app-frame").first()).toHaveAttribute("data-resolved-appearance", "dark");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await page.locator('.crown-compact-pages [data-dashboard-page-id="biomedical"]').click();
  await page.getByRole("button", { name: "Time", exact: true }).click();
  await page.getByRole("button", { name: "Time settings", exact: true }).click();
  const fields = page.locator(".time-bar__phone-view-controls").locator("select, input[type=date], input[type=number]");
  const contrasts = await fields.evaluateAll(elements => {
    const luminance = color => color.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number).reduce((sum, value, index) => {
      const rgb = value / 255;
      return sum + [0.2126, 0.7152, 0.0722][index] * (rgb <= 0.04045 ? rgb / 12.92 : ((rgb + 0.055) / 1.055) ** 2.4);
    }, 0);
    return elements.map(element => {
      const { backgroundColor, color } = getComputedStyle(element);
      const values = [luminance(backgroundColor), luminance(color)];
      return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
    });
  });
  expect(contrasts.length).toBeGreaterThanOrEqual(7);
  expect(Math.min(...contrasts)).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "Hide time controls", exact: true }).click();
  const card = page.locator('[data-canonical-panel-id="bio_case_deltas"] .chart-card--footer-delta').filter({ hasText: /Zuid-Holland/i }).first();
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});

test("phone-width View shows page tabs in one crown row and caps chart height", async ({ page }) => {
  const modeRequests = [];
  page.on("request", request => {
    if (/\/(?:BuildWorkspace|PresentWorkspace)[^/]*\.(?:jsx?|tsx?)(?:\?|$)/.test(request.url())) modeRequests.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await enterAuthoredDashboard(page);

  const crown = page.locator('.dashboard-command-crown[data-crown-compact="true"]');
  await expect(crown).toBeVisible();
  await crown.locator('.crown-compact-pages [data-dashboard-page-id="biomedical"]').click();
  await expect(page.locator("[data-canonical-page-id]")).toHaveAttribute("data-canonical-page-id", "biomedical");
  const plot = page.locator(".view-shell .chart-echarts-host").first();
  await expect(plot.locator("canvas").first()).toBeVisible();
  const plotBox = await plot.boundingBox();
  expect(plotBox.x).toBeLessThanOrEqual(10);
  expect(plotBox.width).toBeGreaterThanOrEqual(370);
  const row = crown.locator('[data-command-crown-layer="location"]');
  const rowBox = await row.boundingBox();
  expect(rowBox.height).toBeGreaterThanOrEqual(44);
  expect(rowBox.height).toBeLessThanOrEqual(48);
  await expect(crown.locator('[data-command-crown-layer="mode"]')).toHaveCount(0);

  const trigger = crown.getByRole("button", { name: "Dashboard menu" });
  const pageTabs = row.getByRole("navigation", { name: "Dashboard pages" });
  await expect(pageTabs.getByRole("button")).toHaveText(["Scenario", "Biomedical", "Socio-economic"]);
  await expect(pageTabs.getByRole("button", { name: "Biomedical" })).toHaveAttribute("aria-current", "page");
  await trigger.click();
  const disclosure = page.locator("#crown-disclosure");
  await expect(disclosure).toBeVisible();
  await expect(disclosure.getByText("HeV-A26 Day 2 Simulation", { exact: true })).toHaveCount(0);
  await expect(disclosure.getByRole("button", { name: "Theme" })).toBeVisible();
  await expect(disclosure.getByRole("navigation", { name: "Dashboard mode" })).toBeVisible();
  const menuBox = await disclosure.boundingBox();
  expect(menuBox.width).toBeLessThanOrEqual(180);
  expect(menuBox.height).toBeLessThanOrEqual(126);
  for (const button of await disclosure.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(34);
    expect(box.height).toBeLessThanOrEqual(36);
    await expect(button).toBeInViewport();
  }
  await expect(disclosure.getByRole("navigation", { name: "Dashboard pages" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(disclosure).toBeHidden();
  await expect(trigger).toBeFocused();
  await pageTabs.getByRole("button", { name: "Socio-economic" }).click();
  await expect(disclosure).toBeHidden();
  await expect(page.locator("[data-canonical-page-id]")).toHaveAttribute("data-canonical-page-id", "socio_economic");

  await expect(page.locator(".dashboard-header[data-header-compact='true']")).toBeVisible();
  await expect(page.locator(".dashboard-meta")).toHaveCount(0);

  const footprints = page.locator(".view-shell .chart-panel-footprint");
  const count = await footprints.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const box = await footprints.nth(index).boundingBox();
    if (box) expect(box.height).toBeLessThanOrEqual(421);
  }
  const density = await collectPhoneViewDensity(page);
  expect(density.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(density.undersizedControls).toEqual([]);
  expect(density.oversizedCharts).toEqual([]);
  await page.getByRole("button", { name: "Focus chart", exact: true }).first().click();
  const fullscreen = page.getByRole("dialog", { name: "Focused chart", exact: true });
  await expect(fullscreen).toBeVisible();
  await expect(fullscreen.locator(".cursor-time-readout")).toBeHidden();
  expect((await fullscreen.locator(".fullscreen-context-header").boundingBox()).height).toBeLessThanOrEqual(48);
  expect((await collectPhoneViewDensity(page)).undersizedControls).toEqual([]);
  const swipe = fullscreen.locator(".fullscreen-swipe-handle");
  await swipe.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 1, clientX: 180, clientY: 20 });
  await swipe.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 1, clientX: 185, clientY: 120 });
  await expect(fullscreen).toBeHidden();
  await page.getByRole("button", { name: "Focus chart", exact: true }).first().click();
  await expect(fullscreen).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fullscreen).toBeHidden();
  expect(modeRequests).toEqual([]);
});

test("phone View mounts offscreen charts once without changing their footprint", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.locator('.crown-compact-pages [data-dashboard-page-id="biomedical"]').click();
  const deferred = page.locator('[data-deferred-panel][data-panel-mounted="false"]').last();
  await expect(deferred).toBeAttached();
  const id = await deferred.getAttribute("data-deferred-panel");
  const before = await deferred.boundingBox();
  await deferred.scrollIntoViewIfNeeded();
  const mounted = page.locator(`[data-deferred-panel="${id}"]`);
  await expect(mounted).toHaveAttribute("data-panel-mounted", "true");
  expect(Math.abs((await mounted.boundingBox()).height - before.height)).toBeLessThanOrEqual(1);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(mounted).toHaveAttribute("data-panel-mounted", "true");
});

test("phone card collections stay capped with keyboard-reachable overflowing content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.locator('.crown-compact-pages [data-dashboard-page-id="socio_economic"]').click();
  const panel = page.locator('[data-canonical-panel-id="socio_risk_deltas"]');
  await panel.scrollIntoViewIfNeeded();
  expect((await panel.boundingBox()).height).toBeLessThanOrEqual(421);
  const cards = panel.locator('.chart-card-collection');
  await expect(cards).toHaveAttribute("tabindex", "0");
  await cards.focus();
  await cards.press("End");
  await expect.poll(async () => {
    const viewport = await cards.boundingBox();
    const last = await cards.locator('.chart-card').last().boundingBox();
    return last.y + last.height - (viewport.y + viewport.height);
  }).toBeLessThanOrEqual(1);
});

for (const fallback of ["reduced motion", "missing observer"]) {
  test(`phone View eagerly mounts charts with ${fallback}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    if (fallback === "reduced motion") await page.emulateMedia({ reducedMotion: "reduce" });
    else await page.addInitScript(() => { delete window.IntersectionObserver; });
    await page.goto("/");
    await enterAuthoredDashboard(page);
    await page.locator('.crown-compact-pages [data-dashboard-page-id="biomedical"]').click();
    await expect(page.locator('[data-deferred-panel]')).not.toHaveCount(0);
    await expect(page.locator('[data-deferred-panel][data-panel-mounted="false"]')).toHaveCount(0);
    await expect(page.locator('.chart-deferred-placeholder')).toHaveCount(0);
  });
}

test("phone chart, exit, layout and comparison controls retain 44px geometry after the complete stylesheet cascade", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.locator('.crown-compact-pages [data-dashboard-page-id="biomedical"]').click();
  const focus = page.getByRole("button", { name: "Focus chart", exact: true }).first();
  const size = await focus.boundingBox();
  expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44);
  await focus.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 1 });
  await expect(page.getByRole("region", { name: "Chart comparison selection" })).toBeVisible();
  await page.getByRole("button", { name: "Add chart to comparison", exact: true }).first().click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  const comparison = page.getByRole("dialog", { name: "Chart comparison", exact: true });
  await expect(comparison).toBeVisible();
  for (const selector of [".fullscreen-toolbar-close", ".fullscreen-layout-button", ".multi-cell-icon-button"]) {
    const controls = comparison.locator(selector);
    expect(await controls.count()).toBeGreaterThan(0);
    for (const control of await controls.all()) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
});
