import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });

const control = (page, id) => page.locator(`[data-presentation-control-id="${id}"]`);
const monitorOf = page => page.locator(".audience-snapshot-monitor");
const frameRevision = async page => Number(await monitorOf(page).getAttribute("data-frame-revision"));

// Retain only counters and geometry. Exercise image bytes never enter test logs.
async function instrumentTransport(context) {
  await context.addInitScript(() => {
    window.__streamTest = { frames: 0, staticHeartbeats: 0, failFrames: false, dropController: false, visibility: null };
    const visibility = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState").get;
    Object.defineProperty(Document.prototype, "visibilityState", { configurable: true, get() { return window.__streamTest.visibility ?? visibility.call(this); } });
    const NativeChannel = window.BroadcastChannel;
    window.BroadcastChannel = class extends NativeChannel {
      postMessage(message) {
        const flags = window.__streamTest;
        if (flags.dropAudienceControl && ["ready", "heartbeat"].includes(message.type)) return;
        if (flags.dropController && ["state", "heartbeat"].includes(message.type)) return;
        if (message.type === "audience_heartbeat" && message.payload.status === "static") flags.staticHeartbeats++;
        if (message.type === "audience_frame") {
          flags.frames++;
          const { stream_id, accepted_sequence, dashboard_revision, image, stage, viewport } = message.payload;
          flags.last = { bytes: image.length, stage, viewport };
          if (flags.failFrames) {
            super.postMessage({ ...message, type: "audience_frame_unavailable", payload: { stream_id, accepted_sequence, dashboard_revision, reason: "capture-failed" } });
            return;
          }
        }
        super.postMessage(message);
      }
    };
  });
}

async function acceptedFrame(page, audience, after = 0) {
  await expect(monitorOf(page)).toHaveAttribute("data-monitor-source", "audience");
  await expect.poll(() => frameRevision(page)).toBeGreaterThan(after);
  await expect.poll(async () => ({
    rendered: await audience.locator(".audience-display").getAttribute("data-audience-accepted-sequence"),
    captured: await monitorOf(page).getAttribute("data-accepted-sequence"),
    requested: await monitorOf(page).getAttribute("data-requested-sequence"),
  })).toMatchObject({ rendered: expect.any(String), captured: expect.any(String), requested: expect.any(String) });
  await expect.poll(async () => {
    const accepted = await monitorOf(page).getAttribute("data-accepted-sequence");
    return accepted === await audience.locator(".audience-display").getAttribute("data-audience-accepted-sequence")
      && accepted === await monitorOf(page).getAttribute("data-requested-sequence");
  }).toBe(true);
  await expect(monitorOf(page).locator("img")).toBeVisible();
}

async function imageMetrics(page, includePixels = false) {
  return monitorOf(page).locator("img").evaluate((image, includePixels) => {
    const canvas = document.createElement("canvas"); canvas.width = 80; canvas.height = 50;
    const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0, 80, 50);
    const pixels = ctx.getImageData(0, 0, 80, 50).data;
    const colours = new Set(); let checksum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      colours.add(`${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`);
      checksum = ((checksum * 31) + pixels[i] + pixels[i + 1] + pixels[i + 2]) | 0;
    }
    return { colours: colours.size, checksum, width: image.naturalWidth, height: image.naturalHeight,
      pixels: includePixels ? Array.from(pixels) : undefined };
  }, includePixels);
}

test("real Audience frames follow accepted state, target geometry and presentation lifecycle", async ({ page, context, request }) => {
  test.setTimeout(210_000);
  const response = await request.get("/config/dashboard.json");
  expect(createHash("sha256").update(await response.body()).digest("hex"))
    .toBe("a6092faf3463389fea17934c005f74802c9c843abcecfb31272221a2fea11f2f");
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  context.on("page", next => next.on("pageerror", error => errors.push(error.message)));
  await instrumentTransport(context);
  let audience;

  await test.step("Passport resolution persists through reload and Rehearse opens the real Audience", async () => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Open the dashboard", exact: true }).click({ noWaitAfter: true, timeout: 60000 });
    await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click({ noWaitAfter: true });
    await page.locator(".dashboard-scenario-trigger").click();
    const passport = page.getByRole("complementary", { name: "Scenario Passport" });
    await passport.getByLabel("Presentation width", { exact: true }).fill("1280");
    await passport.getByLabel("Presentation height", { exact: true }).fill("800");
    await passport.getByRole("button", { name: "Save Scenario", exact: true }).click();
    await expect(passport.locator(".build-draft-status")).toHaveText("Scenario saved");
    await page.reload({ waitUntil: "domcontentloaded" });
    const present = page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true });
    await expect(present).toBeVisible({ timeout: 60000 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("simex-dashboard-config-v3-three-mode-v1")).presentationResolution))
      .toEqual({ width: 1280, height: 800 });
    await present.click({ noWaitAfter: true });
    await control(page, "chrono-groups").click();
    await control(page, "source").selectOption("group:national_outbreak");
    await page.locator('[data-presentable-item-id="bio_confirmed_cases"] input').check();
    await expect(control(page, "play")).toBeEnabled();
    await expect(control(page, "rehearse")).toHaveText("Rehearse at 1280 × 800");
    await expect(monitorOf(page)).toHaveAttribute("data-monitor-source", "local");
    const opened = page.waitForEvent("popup"); await control(page, "rehearse").click(); audience = await opened;
    await expect(audience.locator(".audience-display")).toHaveAttribute("data-connection-status", "connected", { timeout: 45000 });
    expect(await audience.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual({ width: 1280, height: 800 });
    await acceptedFrame(page, audience);
    const initial = await imageMetrics(page);
    expect(initial.colours).toBeGreaterThan(10);
    expect(initial.width).toBeLessThanOrEqual(960);
    expect(initial.width / initial.height).toBeCloseTo(1.6, 2);
    expect(await audience.evaluate(() => window.__streamTest.last.bytes)).toBeLessThanOrEqual(600 * 1024);
  });

  await test.step("seek and playback change nonblank frames; idle keeps images still and sends metadata", async () => {
    const before = await imageMetrics(page), revision = await frameRevision(page);
    await control(page, "seek").press("End");
    await acceptedFrame(page, audience, revision);
    expect((await imageMetrics(page)).checksum).not.toBe(before.checksum);
    await control(page, "seek").press("Home");
    await control(page, "cadence").fill("1");
    await acceptedFrame(page, audience, revision);
    const beforePlay = Number(await monitorOf(page).getAttribute("data-accepted-sequence"));
    await control(page, "play").click();
    await expect.poll(async () => Number(await audience.locator(".audience-display").getAttribute("data-frame-index"))).toBeGreaterThan(1);
    await expect.poll(async () => Number(await monitorOf(page).getAttribute("data-accepted-sequence"))).toBeGreaterThan(beforePlay);
    await expect(control(page, "pause")).toBeEnabled();
    await control(page, "pause").click();
    await acceptedFrame(page, audience);
    await expect(monitorOf(page)).toHaveAttribute("data-monitor-status", "static");
    const idle = await audience.evaluate(() => ({ frames: window.__streamTest.frames, beats: window.__streamTest.staticHeartbeats }));
    await audience.waitForFunction(beats => window.__streamTest.staticHeartbeats > beats, idle.beats, { timeout: 18000 });
    expect(await audience.evaluate(() => window.__streamTest.frames)).toBe(idle.frames);
  });

  await test.step("resize letterboxes the declared stage; hidden suspends and visible resumes", async () => {
    const revision = await frameRevision(page);
    await audience.setViewportSize({ width: 1600, height: 900 });
    await acceptedFrame(page, audience, revision);
    const geometry = await audience.locator(".audience-display").evaluate(el => {
      const box = el.getBoundingClientRect(); return { width: el.offsetWidth, height: el.offsetHeight, x: box.x, y: box.y, paintedWidth: box.width, paintedHeight: box.height };
    });
    expect(geometry).toEqual({ width: 1280, height: 800, x: 80, y: 0, paintedWidth: 1440, paintedHeight: 900 });
    await expect(monitorOf(page)).toHaveAttribute("data-viewport-width", "1600");
    await expect(monitorOf(page)).toHaveAttribute("data-viewport-height", "900");
    expect(await monitorOf(page).locator(".audience-snapshot-frame").evaluate(el => getComputedStyle(el).aspectRatio)).toBe("1280 / 800");
    expect(await audience.evaluate(() => { window.__streamTest.visibility = "hidden"; return document.visibilityState; })).toBe("hidden");
    await audience.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(monitorOf(page)).toHaveAttribute("data-monitor-status", "hidden");
    const hiddenFrames = await audience.evaluate(() => window.__streamTest.frames);
    await audience.waitForTimeout(2200);
    expect(await audience.evaluate(() => window.__streamTest.frames)).toBe(hiddenFrames);
    const hiddenRevision = await frameRevision(page);
    await audience.evaluate(() => { window.__streamTest.visibility = "visible"; document.dispatchEvent(new Event("visibilitychange")); });
    await acceptedFrame(page, audience, hiddenRevision);
  });

  await test.step("capture failure falls back locally and controller silence retains safety and reconnects", async () => {
    await audience.evaluate(() => { window.__streamTest.failFrames = true; });
    await audience.setViewportSize({ width: 1590, height: 900 });
    await expect(monitorOf(page)).toHaveAttribute("data-monitor-source", "local");
    await expect(monitorOf(page).locator(".audience-snapshot-heading strong")).toHaveAttribute("title", /capture unavailable/);
    const fallbackCanvas = monitorOf(page).locator(".audience-local-preview .audience-display canvas").first();
    await expect(fallbackCanvas).toBeVisible();
    await expect.poll(() => fallbackCanvas.evaluate(source => {
      const canvas = document.createElement("canvas"); canvas.width = 80; canvas.height = 50;
      const ctx = canvas.getContext("2d"); ctx.drawImage(source, 0, 0, 80, 50);
      const pixels = ctx.getImageData(0, 0, 80, 50).data, colours = new Set();
      for (let i = 0; i < pixels.length; i += 4) colours.add(`${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`);
      return colours.size;
    })).toBeGreaterThan(3);
    await audience.evaluate(() => { window.__streamTest.failFrames = false; });
    await audience.setViewportSize({ width: 1600, height: 900 });
    await acceptedFrame(page, audience);
    await page.evaluate(() => { window.__streamTest.dropController = true; });
    await expect(audience.locator(".audience-display")).toHaveAttribute("data-connection-status", "disconnected", { timeout: 8000 });
    await expect(monitorOf(page)).toHaveAttribute("data-monitor-source", "local");
    await expect(monitorOf(page).locator(".audience-snapshot-heading strong")).toHaveAttribute("title", /Audience connection lost/);
    await page.evaluate(() => { window.__streamTest.dropController = false; });
    await expect(audience.locator(".audience-display")).toHaveAttribute("data-connection-status", "connected");
    await acceptedFrame(page, audience);
  });

  await test.step("Black and Active reach the monitor, and manual closure cleans up the session", async () => {
    const active = await imageMetrics(page, true), revision = await frameRevision(page);
    const output = audience.locator(".audience-display");
    const activeIndex = await output.getAttribute("data-frame-index");
    await control(page, "output-black").click();
    await expect(audience.locator(".audience-display")).toHaveAttribute("data-output-mode", "blank");
    await acceptedFrame(page, audience, revision);
    expect((await imageMetrics(page)).checksum).not.toBe(active.checksum);
    expect((await imageMetrics(page)).colours).toBe(1);
    const blackRevision = await frameRevision(page);
    await control(page, "output-active").click();
    await expect(audience.locator(".audience-display")).toHaveAttribute("data-output-mode", "active");
    await acceptedFrame(page, audience, blackRevision);
    await expect(output).toHaveAttribute("data-frame-index", activeIndex);
    const restored = await imageMetrics(page, true);
    expect([restored.width, restored.height]).toEqual([active.width, active.height]);
    expect(restored.colours).toBeGreaterThan(10);
    const meanChannelDifference = restored.pixels.reduce((sum, value, index) => (
      sum + (index % 4 === 3 ? 0 : Math.abs(value - active.pixels[index]))
    ), 0) / (restored.pixels.length * 3 / 4);
    expect(meanChannelDifference).toBeLessThan(2);
    await audience.close();
    await expect.poll(() => audience.isClosed()).toBe(true);
    await expect(monitorOf(page)).toHaveAttribute("data-monitor-source", "local");
    expect(errors).toEqual([]);
  });
});

test("compact Present filters group choices, keeps ordering beside the monitor and switches output directly", async ({ page, context, request }) => {
  test.setTimeout(120000);
  const response = await request.get("/config/dashboard.json");
  const config = await response.json();
  const national = config.chronoGroups.find(group => group.id === "national_outbreak");
  const municipal = config.chronoGroups.find(group => group.id === "municipal_outbreak");
  const nationalIds = national.members.map(member => member.chartId);
  const municipalIds = municipal.members.map(member => member.chartId);
  expect(nationalIds.length).toBeGreaterThanOrEqual(4);
  await instrumentTransport(context);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  context.on("page", popup => popup.on("pageerror", error => errors.push(error.message)));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open the dashboard", exact: true }).click({ noWaitAfter: true, timeout: 60000 });
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click({ noWaitAfter: true });
  await control(page, "chrono-groups").click();
  await control(page, "source").selectOption("group:national_outbreak");
  const choices = page.locator(".present-scene-panel [data-presentable-item-id]");
  await expect.poll(() => choices.evaluateAll(els => els.map(el => el.dataset.presentableItemId).sort())).toEqual([...nationalIds].sort());
  const selected = nationalIds.slice(0, 4);
  for (const id of selected) await page.locator(`[data-presentable-item-id="${id}"] input`).check();
  await control(page, "source").selectOption("group:municipal_outbreak");
  await expect.poll(() => choices.evaluateAll(els => els.map(el => el.dataset.presentableItemId).sort())).toEqual([...municipalIds].sort());
  await expect(page.locator(".audience-snapshot-controls .present-selected-chart")).toHaveCount(0);
  await control(page, "source").selectOption("group:national_outbreak");
  await expect(page.locator(".audience-snapshot-controls .present-selected-chart")).toHaveCount(4);
  const dock = page.locator("#present-chrono-groups");
  const dockGeometry = await dock.evaluate(el => {
    const rows = [".presentation-controller__source", ".presentation-controller__output", ".present-controls-close", ".presentation-controller__timeline"]
      .map(selector => el.querySelector(selector).getBoundingClientRect());
    return { height: el.getBoundingClientRect().height, rows: rows.map(row => Math.round((row.top + row.bottom) / 2)) };
  });
  expect(new Set(dockGeometry.rows).size).toBe(2);
  expect(dockGeometry.height).toBeLessThanOrEqual(90);
  await expect(dock.getByText("Presentation source", { exact: true })).toHaveCount(0);
  for (const id of ["blackout", "restore", "output-blank", "end"]) await expect(control(page, id)).toHaveCount(0);
  await expect(monitorOf(page).locator(".audience-snapshot-caption, .audience-snapshot-resolution")).toHaveCount(0);
  const opened = page.waitForEvent("popup"); await control(page, "rehearse").click(); const audience = await opened;
  await expect(audience.locator(".audience-display")).toHaveAttribute("data-connection-status", "connected", { timeout: 45000 });
  await acceptedFrame(page, audience);
  await expect(page.locator(".present-status-strip strong").first()).toHaveText("Audience display connected");
  const rows = page.locator(".audience-snapshot-controls .present-selected-chart");
  for (const row of await rows.all()) await expect(row).toBeInViewport({ ratio: 1 });
  const panel = await page.locator(".present-context-panel").boundingBox();
  const frame = await monitorOf(page).locator(".audience-snapshot-frame").boundingBox();
  const last = await rows.last().boundingBox();
  expect(frame.y + frame.height).toBeLessThanOrEqual(last.y);
  expect(last.y + last.height).toBeLessThanOrEqual(panel.y + panel.height);
  await rows.first().locator('[data-presentation-item-action="move-down"]').click();
  const order = [selected[1], selected[0], ...selected.slice(2)];
  await expect.poll(() => audience.locator(".displayed-chart-cell").evaluateAll(els => els.map(el => el.dataset.displayedChartId))).toEqual(order);
  const revised = await frameRevision(page);
  for (const [choice, mode] of [["output-black", "blank"], ["output-holding", "holding"], ["output-active", "active"], ["output-black", "blank"], ["output-active", "active"]]) {
    await control(page, choice).click();
    await expect(audience.locator(".audience-display")).toHaveAttribute("data-output-mode", mode);
    await expect(control(page, choice)).toHaveAttribute("aria-pressed", "true");
    await expect(audience.locator(".audience-blackout")).toHaveCount(0);
    if (mode === "blank") await expect(audience.locator(".audience-display")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  }
  await acceptedFrame(page, audience, revised);
  await audience.evaluate(() => { window.__streamTest.dropAudienceControl = true; });
  await expect(page.locator(".present-status-strip strong").first()).toHaveText("Audience display disconnected", { timeout: 8000 });
  await expect(audience.locator(".audience-display")).toHaveAttribute("data-connection-status", "connected");
  await audience.evaluate(() => { window.__streamTest.dropAudienceControl = false; });
  await expect(page.locator(".present-status-strip strong").first()).toHaveText("Audience display connected", { timeout: 8000 });
  await acceptedFrame(page, audience);
  await control(page, "close-chrono-groups").click();
  await expect(dock).toBeHidden();
  await expect(control(page, "chrono-groups")).toHaveAttribute("aria-expanded", "false");
  await audience.close();
  await expect(control(page, "open-new-session")).toBeVisible();
  await expect(monitorOf(page)).toHaveAttribute("data-monitor-source", "local");
  expect(errors).toEqual([]);
});

test("Present starts on None and recalls isolated None and Chrono Group selections", async ({ page, context, request }) => {
  test.setTimeout(120000);
  const response = await request.get("/config/dashboard.json");
  const config = await response.json();
  const national = config.chronoGroups.find(group => group.id === "national_outbreak");
  const municipal = config.chronoGroups.find(group => group.id === "municipal_outbreak");
  const n = national.members.map(member => member.chartId), m = municipal.members.map(member => member.chartId);
  const scene = { id: "source-memory-scene", name: "Source memory scene", pageId: "biomedical",
    chronoGroupId: national.id, period: { start: `${national.period.start.slice(0, 10)}T00:00:00.000Z`,
      end: `${national.period.end.slice(0, 10)}T23:59:59.999Z` },
    frames: { mode: "source", chartId: n[0], selection: "all" },
    members: n.slice(0, 2).map(chartId => ({ chartId, width: 1 })),
    present: { chartIds: n.slice(0, 2), layout: "horizontal-divider" },
    audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } } };
  config.scenes = [...(config.scenes ?? []), scene];
  await instrumentTransport(context);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  context.on("page", popup => popup.on("pageerror", error => errors.push(error.message)));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(config => localStorage.setItem("simex-dashboard-config-v3-three-mode-v1", JSON.stringify(config)), config);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open the dashboard", exact: true }).click({ noWaitAfter: true, timeout: 60000 });
  await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  await page.getByRole("region", { name: "Chrono playback controls" }).getByLabel("Chrono source").selectOption(`scene:${scene.id}`);
  const present = page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true });
  await present.click({ noWaitAfter: true });
  await control(page, "chrono-groups").click();
  const source = control(page, "source");
  const rows = page.locator(".audience-snapshot-controls .present-selected-chart");
  const ids = () => rows.evaluateAll(els => els.map(el => el.dataset.displayedChartId));
  const choose = id => page.locator(`[data-presentable-item-id="${id}"] input`).check();
  await expect(source).toHaveValue("");
  await expect(source.locator('option[value=""]')).toHaveText("None");
  await expect(rows).toHaveCount(0);
  await expect(page.locator(".present-workspace")).toHaveAttribute("data-active-scene-id", "");
  await expect(control(page, "seek")).toBeDisabled();
  await choose(n[0]); await choose(m[0]);
  const noneSelection = [n[0], m[0]];
  await expect(page.locator(".audience-local-preview .chart-echarts-host")).toHaveCount(2);
  await expect(page.locator(".audience-local-preview [data-chart-active-date]")).toHaveCount(0);
  const opened = page.waitForEvent("popup"); await control(page, "rehearse").click(); const audience = await opened;
  await expect(audience.locator(".audience-display")).toHaveAttribute("data-connection-status", "connected", { timeout: 45000 });
  const outputIds = () => audience.locator(".displayed-chart-cell").evaluateAll(els => els.map(el => el.dataset.displayedChartId));
  await expect.poll(outputIds).toEqual(noneSelection);
  await source.selectOption(`group:${national.id}`);
  await expect(rows).toHaveCount(0);
  await expect.poll(outputIds).toEqual([]);
  await choose(n[0]); await choose(n[1]);
  await control(page, "composition-layout").selectOption("overUnder");
  await rows.first().locator('[data-presentation-item-action="move-down"]').click();
  await source.selectOption(`group:${municipal.id}`);
  await expect(rows).toHaveCount(0);
  await choose(m[1]);
  await source.selectOption(`group:${national.id}`);
  await expect.poll(ids).toEqual([n[1], n[0]]);
  await expect(control(page, "composition-layout")).toHaveValue("overUnder");
  await expect.poll(outputIds).toEqual([n[1], n[0]]);
  await source.selectOption("");
  await expect.poll(ids).toEqual(noneSelection);
  await expect.poll(outputIds).toEqual(noneSelection);
  await expect(control(page, "seek")).toBeDisabled();
  await source.selectOption(`scene:${scene.id}`);
  await expect.poll(ids).toEqual(scene.present.chartIds);
  await expect(control(page, "composition-layout")).toHaveValue("overUnder");
  await source.selectOption(`group:${municipal.id}`);
  await expect.poll(ids).toEqual([m[1]]);
  await rows.first().locator('[data-presentation-item-action="remove"]').click();
  await source.selectOption(`group:${national.id}`);
  await source.selectOption(`group:${municipal.id}`);
  await expect(rows).toHaveCount(0);
  await source.selectOption(`group:${national.id}`);
  const output = audience.locator(".audience-display");
  await control(page, "seek").fill("2");
  await expect(output).toHaveAttribute("data-frame-index", "2");
  await expect.poll(outputIds).toEqual([n[1], n[0]]);
  const accepted = await output.getAttribute("data-audience-accepted-sequence");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click({ noWaitAfter: true });
  const viewControls = page.getByRole("region", { name: "Chrono playback controls" });
  if (!await viewControls.isVisible()) await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  await viewControls.getByLabel("Chrono source").selectOption(`scene:${scene.id}`);
  await expect(output).toHaveAttribute("data-audience-accepted-sequence", accepted);
  await present.click({ noWaitAfter: true });
  await control(page, "chrono-groups").click();
  await expect(source).toHaveValue(`group:${national.id}`);
  await expect(control(page, "seek")).toHaveValue("2");
  await expect(control(page, "pause")).toBeDisabled();
  await expect.poll(ids).toEqual([n[1], n[0]]);
  await expect(output).toHaveAttribute("data-frame-index", "2");
  await expect(output).toHaveAttribute("data-audience-accepted-sequence", accepted);
  await expect.poll(outputIds).toEqual([n[1], n[0]]);
  await control(page, "play").click();
  await expect.poll(async () => Number(await output.getAttribute("data-frame-index"))).toBeGreaterThan(2);
  await control(page, "pause").click();
  await audience.close();
  await expect(control(page, "open-new-session")).toBeVisible();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click({ noWaitAfter: true });
  await present.click({ noWaitAfter: true });
  await control(page, "chrono-groups").click();
  await expect(source).toHaveValue("");
  await expect.poll(ids).toEqual(noneSelection);
  expect(errors).toEqual([]);
});
