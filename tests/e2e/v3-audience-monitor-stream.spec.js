import { test, expect } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { timeCursor } from "./support/time-cursor-workflow.js";
import { createHash } from "node:crypto";
import { migrateDashboardV6ToV7 } from "../../src/charting/config/migrateDashboardV6ToV7.js";
import { scenePresentLayoutToDisplayLayout } from "../../src/components/time/scenePresentLayout.js";

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
    .toBe("1fbde36ce8962f1b11c83ffbfedb424946716b6eff6bec3be79ff686914469ef");
  const config = migrateDashboardV6ToV7(await response.json());
  const national = config.scenes.find(scene => scene.name === "National outbreak and health-system playback");
  expect(national.present.chartIds).toContain("bio_confirmed_cases");
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  context.on("page", next => next.on("pageerror", error => errors.push(error.message)));
  await instrumentTransport(context);
  let audience;

  await test.step("Passport resolution persists through reload and Rehearse opens the real Audience", async () => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Open the dashboard", exact: true }).click({ noWaitAfter: true, timeout: 60000 });

    await openDashboardPage(page, "biomedical");
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
    await control(page, "output-controls").click();
    await timeCursor(page).selectScope({ name: national.name });
    await timeCursor(page).seekFrameIndex(0);
    // Storyline selection applies its authored composition. This lifecycle
    // witness deliberately keeps one real chart for the retained frame checks.
    for (const id of national.present.chartIds.filter(id => id !== "bio_confirmed_cases")) {
      await page.locator(`[data-presentable-item-id="${id}"] input`).uncheck();
    }
    await page.locator('[data-presentable-item-id="bio_confirmed_cases"] input').check();
    await expect.poll(() => page.locator(".audience-snapshot-controls .present-selected-chart").evaluateAll(els => els.map(el => el.dataset.displayedChartId))).toEqual(["bio_confirmed_cases"]);
    await expect(timeCursor(page).play).toBeEnabled();
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
    await timeCursor(page).frame.press("End");
    await acceptedFrame(page, audience, revision);
    expect((await imageMetrics(page)).checksum).not.toBe(before.checksum);
    await timeCursor(page).frame.press("Home");
    await (await timeCursor(page).settings()).getByLabel("Seconds per frame", { exact: true }).fill("1");
    await acceptedFrame(page, audience, revision);
    const beforePlay = Number(await monitorOf(page).getAttribute("data-accepted-sequence"));
    await timeCursor(page).play.click();
    await expect.poll(async () => Number(await audience.locator(".audience-display").getAttribute("data-frame-index"))).toBeGreaterThan(1);
    await expect.poll(async () => Number(await monitorOf(page).getAttribute("data-accepted-sequence"))).toBeGreaterThan(beforePlay);
    await expect(timeCursor(page).pause).toBeEnabled();
    await timeCursor(page).pause.click();
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

test("compact Present applies authored Storyline choices, keeps ordering beside the monitor and switches output directly", async ({ page, context, request }) => {
  test.setTimeout(120000);
  const response = await request.get("/config/dashboard.json");
  const config = migrateDashboardV6ToV7(await response.json());
  const national = config.scenes.find(scene => scene.name === "National outbreak and health-system playback");
  const municipal = config.scenes.find(scene => scene.name === "Municipal outbreak playback");
  const nationalIds = national.members.map(member => member.chartId);
  const municipalIds = municipal.members.map(member => member.chartId);
  expect(nationalIds.length).toBeGreaterThanOrEqual(4);
  await context.route("**/config/dashboard.json", route => route.fulfill({ json: config }));
  await instrumentTransport(context);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  context.on("page", popup => popup.on("pageerror", error => errors.push(error.message)));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open the dashboard", exact: true }).click({ noWaitAfter: true, timeout: 60000 });

  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click({ noWaitAfter: true });
  await control(page, "output-controls").click();
  const choices = page.locator(".present-scene-panel [data-presentable-item-id]");
  const choiceIds = () => choices.evaluateAll(els => els.map(el => el.dataset.presentableItemId).sort());
  await expect.poll(choiceIds).toEqual(expect.arrayContaining([...nationalIds, ...municipalIds]));
  const catalogueIds = await choiceIds();
  await timeCursor(page).selectScope({ name: national.name });
  await expect.poll(choiceIds).toEqual(catalogueIds);
  const selected = national.present.chartIds;
  expect(selected).toHaveLength(4);
  const selectedIds = () => page.locator(".audience-snapshot-controls .present-selected-chart").evaluateAll(els => els.map(el => el.dataset.displayedChartId));
  await expect.poll(selectedIds).toEqual(selected);
  await expect(control(page, "composition-layout")).toHaveValue(scenePresentLayoutToDisplayLayout(national.present.layout, selected.length));
  await timeCursor(page).selectScope({ name: municipal.name });
  await expect.poll(choiceIds).toEqual(catalogueIds);
  await expect.poll(selectedIds).toEqual(municipal.present.chartIds);
  await timeCursor(page).selectScope({ name: national.name });
  await expect.poll(selectedIds).toEqual(selected);
  const dock = page.locator("#present-output-controls");
  const dockGeometry = await dock.evaluate(el => {
    const rows = [".presentation-controller__output", ".present-controls-close"]
      .map(selector => el.querySelector(selector).getBoundingClientRect());
    return { height: el.getBoundingClientRect().height, rows: rows.map(row => Math.round((row.top + row.bottom) / 2)) };
  });
  expect(new Set(dockGeometry.rows).size).toBe(1);
  expect(dockGeometry.height).toBeLessThanOrEqual(90);
  await expect(dock.getByText("Presentation source", { exact: true })).toHaveCount(0);
  await expect(dock.locator("select, input")).toHaveCount(0);
  await expect(timeCursor(page).scope).toBeVisible();
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
  await control(page, "close-output-controls").click();
  await expect(dock).toBeHidden();
  await expect(control(page, "output-controls")).toHaveAttribute("aria-expanded", "false");
  await audience.close();
  await expect(control(page, "open-new-session")).toBeVisible();
  await expect(monitorOf(page)).toHaveAttribute("data-monitor-source", "local");
  expect(errors).toEqual([]);
});

test("Present reapplies authored Storylines, shares manual scope memory and safely restores accepted Audience state", async ({ page, context, request }) => {
  test.setTimeout(120000);
  const response = await request.get("/config/dashboard.json");
  const config = migrateDashboardV6ToV7(await response.json());
  const national = config.scenes.find(scene => scene.name === "National outbreak and health-system playback");
  const municipal = config.scenes.find(scene => scene.name === "Municipal outbreak playback");
  const n = national.members.map(member => member.chartId), m = municipal.members.map(member => member.chartId);
  const scene = { ...structuredClone(national), id: "source-memory-scene", name: "Source memory Storyline", pageId: "biomedical",
    period: { start: `${national.period.start.slice(0, 10)}T00:00:00.000Z`, end: `${national.period.end.slice(0, 10)}T23:59:59.999Z` },
    frames: { mode: "source", chartId: n[0], selection: "all" },
    members: national.members.slice(0, 2).map(member => ({ ...member, width: 1 })),
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

  await openDashboardPage(page, "biomedical");
  const cursor = timeCursor(page);
  const sceneScope = await cursor.selectScope({ name: scene.name });
  const present = page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true });
  await present.click({ noWaitAfter: true });
  await control(page, "output-controls").click();
  const source = cursor.scope;
  const rows = page.locator(".audience-snapshot-controls .present-selected-chart");
  const ids = () => rows.evaluateAll(els => els.map(el => el.dataset.displayedChartId));
  const choose = id => page.locator(`[data-presentable-item-id="${id}"] input`).check();
  await expect(source).toHaveValue(sceneScope);
  await expect.poll(ids).toEqual(scene.present.chartIds);
  await cursor.selectScope({ kind: "page" });
  await cursor.seekFrameIndex(0);
  await expect(source).toHaveValue("page");
  await expect(source.locator('option[value="page"]')).toHaveText("Page");
  await expect(rows).toHaveCount(0);
  await expect(page.locator(".present-workspace")).toHaveAttribute("data-active-scene-id", "");
  await expect(cursor.frame).toBeEnabled();
  await choose(n[0]); await choose(m[0]);
  const manualSelection = [n[0], m[0]];
  await cursor.selectScope({ kind: "dashboard" });
  await expect.poll(ids).toEqual(manualSelection);
  await cursor.selectScope({ kind: "page" });
  await expect.poll(ids).toEqual(manualSelection);
  const localPreview = page.locator(".audience-local-preview");
  const localCell = id => localPreview.locator(`[data-displayed-chart-id="${id}"]`);
  // The first Biomedical frame predates the confirmed-cases series. Keep the
  // chosen chart in the composition and require the explicit measurement gap.
  await expect(localCell(n[0]).locator('[role="note"]')).toContainText("No measurement at this time.");
  await expect(localCell(n[0]).locator("canvas")).toHaveCount(0);
  await expect(localCell(m[0]).locator(".chart-echarts-host")).toBeVisible();
  await expect(localCell(m[0]).locator("[data-chart-active-date]")).toBeVisible();
  const opened = page.waitForEvent("popup"); await control(page, "rehearse").click(); const audience = await opened;
  await expect(audience.locator(".audience-display")).toHaveAttribute("data-connection-status", "connected", { timeout: 45000 });
  const outputIds = () => audience.locator(".displayed-chart-cell").evaluateAll(els => els.map(el => el.dataset.displayedChartId));
  await expect.poll(outputIds).toEqual(manualSelection);
  const nationalScope = await cursor.selectScope({ name: national.name });
  await expect.poll(ids).toEqual(national.present.chartIds);
  await expect(control(page, "composition-layout")).toHaveValue(scenePresentLayoutToDisplayLayout(national.present.layout, national.present.chartIds.length));
  for (const id of national.present.chartIds.slice(2)) await page.locator(`.audience-snapshot-controls .present-selected-chart[data-displayed-chart-id="${id}"] [data-presentation-item-action="remove"]`).click();
  await control(page, "composition-layout").selectOption("overUnder");
  await rows.first().locator('[data-presentation-item-action="move-down"]').click();
  await expect.poll(ids).toEqual([n[1], n[0]]);
  await expect.poll(outputIds).toEqual([n[1], n[0]]);
  await cursor.selectScope({ name: municipal.name });
  await expect.poll(ids).toEqual(municipal.present.chartIds);
  await expect(control(page, "composition-layout")).toHaveValue(scenePresentLayoutToDisplayLayout(municipal.present.layout, municipal.present.chartIds.length));
  await rows.first().locator('[data-presentation-item-action="remove"]').click();
  await expect.poll(ids).toEqual(municipal.present.chartIds.slice(1));
  await cursor.selectScope({ name: national.name });
  await expect.poll(ids).toEqual(national.present.chartIds);
  await expect(control(page, "composition-layout")).toHaveValue(scenePresentLayoutToDisplayLayout(national.present.layout, national.present.chartIds.length));
  await expect.poll(outputIds).toEqual(national.present.chartIds);
  await cursor.selectScope({ kind: "page" });
  await expect.poll(ids).toEqual(manualSelection);
  await expect.poll(outputIds).toEqual(manualSelection);
  await expect(cursor.frame).toBeEnabled();
  await cursor.selectScope({ name: scene.name });
  await expect.poll(ids).toEqual(scene.present.chartIds);
  await expect(control(page, "composition-layout")).toHaveValue("overUnder");
  await cursor.selectScope({ name: municipal.name });
  await expect.poll(ids).toEqual(municipal.present.chartIds);
  for (const id of municipal.present.chartIds) await page.locator(`.audience-snapshot-controls .present-selected-chart[data-displayed-chart-id="${id}"] [data-presentation-item-action="remove"]`).click();
  await expect(rows).toHaveCount(0);
  await expect.poll(outputIds).toEqual([]);
  await cursor.selectScope({ kind: "page" });
  await cursor.selectScope({ name: municipal.name });
  await expect.poll(ids).toEqual(municipal.present.chartIds);
  await cursor.selectScope({ name: national.name });
  for (const id of national.present.chartIds.slice(2)) await page.locator(`.audience-snapshot-controls .present-selected-chart[data-displayed-chart-id="${id}"] [data-presentation-item-action="remove"]`).click();
  await control(page, "composition-layout").selectOption("overUnder");
  await rows.first().locator('[data-presentation-item-action="move-down"]').click();
  const output = audience.locator(".audience-display");
  const acceptedEpoch = await cursor.seekFrameIndex(2);
  await expect(output).toHaveAttribute("data-frame-index", "2");
  await expect.poll(outputIds).toEqual([n[1], n[0]]);
  const accepted = await output.getAttribute("data-audience-accepted-sequence");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click({ noWaitAfter: true });
  await timeCursor(page).selectScope({ name: scene.name });
  await expect(output).toHaveAttribute("data-audience-accepted-sequence", accepted);
  await present.click({ noWaitAfter: true });
  await control(page, "output-controls").click();
  await cursor.open();
  await expect(source).toHaveValue(nationalScope);
  await expect(cursor.frame).toHaveValue(String(acceptedEpoch));
  await expect(cursor.pause).toHaveCount(0);
  await expect.poll(ids).toEqual([n[1], n[0]]);
  await expect(output).toHaveAttribute("data-frame-index", "2");
  await expect(output).toHaveAttribute("data-audience-accepted-sequence", accepted);
  await expect.poll(outputIds).toEqual([n[1], n[0]]);
  await timeCursor(page).play.click();
  await expect.poll(async () => Number(await output.getAttribute("data-frame-index"))).toBeGreaterThan(2);
  await timeCursor(page).pause.click();
  await audience.close();
  await expect(control(page, "open-new-session")).toBeVisible();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click({ noWaitAfter: true });
  await present.click({ noWaitAfter: true });
  await control(page, "output-controls").click();
  await cursor.selectScope({ kind: "page" });
  await expect(source).toHaveValue("page");
  await expect.poll(ids).toEqual(manualSelection);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("simex-dashboard-config-v3-three-mode-v1")));
  expect(saved.scenes.find(item => item.id === national.id).present).toEqual(national.present);
  expect(saved.scenes.find(item => item.id === municipal.id).present).toEqual(municipal.present);
  expect(errors).toEqual([]);
});
