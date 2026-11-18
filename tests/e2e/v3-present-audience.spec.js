import { expect, test } from "@playwright/test";
import { timeCursor } from "./support/time-cursor-workflow.js";
import { normalizeDashboardBoundary } from "../../src/charting/config/dashboardBundleV3.js";

import {
  createSavedPresentationScene,
  enterPresentWithScene,
  injectIncompleteNextAudienceState,
  installAudienceFaultInstrumentation,
  LIVE_APP_URL,
  openAudienceSession,
  readLastAcceptedAudienceTheme,
  readLastAcceptedAudienceState,
  readStoredDashboard,
  readStoredScene,
  sendLateOldGenerationMessage,
  sendLateOldSessionState,
} from "./support/present-audience-workflow.js";

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  page.on("pageerror", (error) => console.error(`Browser page error: ${error.stack ?? error.message}`));
  await page.goto(LIVE_APP_URL);
  await page.evaluate(() => localStorage.clear());
  const response = await page.request.get(`${LIVE_APP_URL}config/dashboard.json`);
  expect(response.ok()).toBe(true);
  const fixture = normalizeDashboardBoundary(await response.json());
  await page.evaluate((dashboard) => {
    localStorage.setItem("simex-dashboard-config-v3-three-mode-v1", JSON.stringify(dashboard));
  }, fixture);
});

async function prepareAcceptedCursorComparison(context, page) {
  await installAudienceFaultInstrumentation(context);
  const fixture = await readStoredDashboard(page);
  const chartIds = fixture.pages.flatMap(item => item.sections.flatMap(section => section.panels.map(panel => (panel.chart ?? panel).id)));
  for (const id of ["bio_confirmed_cases", "socio_trust_trend"]) expect(chartIds).toContain(id);
  const scene = fixture.scenes.find(item => item.id === "cases_and_institutional_trust");
  expect(scene?.present.chartIds).toEqual(["bio_confirmed_cases", "socio_trust_trend"]);
  expect(scene.members.map(member => member.matching.policy)).toEqual(["exact", "lastKnown"]);
  fixture.scenario = { ...fixture.scenario, exerciseTime: "2027-03-31T00:00:00.000Z" };
  await page.evaluate(value => localStorage.setItem("simex-dashboard-config-v3-three-mode-v1", JSON.stringify(value)), fixture);
  await page.reload();
  await enterPresentWithScene(page, scene);
  const cursor = timeCursor(page);
  await cursor.open();
  await expect(cursor.frame).toBeEnabled();
  expect(Number(await cursor.frame.getAttribute("min"))).toBe(Date.parse("2027-03-15"));
  expect(Number(await cursor.frame.getAttribute("max"))).toBe(Date.parse("2027-08-01"));
  const session = await openAudienceSession(page);
  await expect(session.popup.locator('[data-exercise-context-stamp="audience"]')).toBeVisible();
  for (const id of scene.present.chartIds) {
    await expect(session.popup.locator(`[data-displayed-chart-id="${id}"] [data-canonical-plot-id="${id}"]`)).toBeVisible();
  }
  return { scene, cursor, ...session };
}

test.describe(() => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("accepted Present source preflight reaches two-page Audience charts and one shared time bar", acceptedPresentSourcePreflight);
  test("Present and Audience share accepted time, bounded matching and durable exercise advance through reload", sharedPresentAudienceCursor);
});

async function acceptedPresentSourcePreflight({ context, page }) {
  test.setTimeout(120_000);
  const { popup } = await prepareAcceptedCursorComparison(context, page);
  await expect(page.getByRole("region", { name: "Dashboard time", exact: true })).toHaveCount(1);
  await expect(popup.locator('[data-cursor-stamp="live"]')).toContainText("2027-03-31");
  const header = await popup.locator(".audience-context-header").boundingBox();
  const charts = await popup.locator('.displayed-chart-grid[data-display-surface="audience"]').boundingBox();
  expect(charts.y).toBeGreaterThanOrEqual(header.y + header.height);
  await popup.close();
}

async function sharedPresentAudienceCursor({ context, page }) {
  test.setTimeout(120_000);
  const { popup, channelId, cursor } = await prepareAcceptedCursorComparison(context, page);
  const trust = popup.locator('[data-displayed-chart-id="socio_trust_trend"]');
  const cases = popup.locator('[data-displayed-chart-id="bio_confirmed_cases"]');
  const august = Date.parse("2027-08-01"), july19 = Date.parse("2027-07-19");
  await cursor.frame.fill(String(august));
  await expect(popup.locator('[data-cursor-stamp="at"]')).toContainText("2027-08-01");
  await expect.poll(async () => (await readLastAcceptedAudienceState(popup)).time.epoch_ms).toBe(august);
  await expect(trust.locator('[data-chart-time-kind="observed"]')).toHaveAttribute("data-chart-observation-epochs", String(july19));
  await expect(trust.locator('[data-chart-time-kind="observed"]')).toHaveAttribute("data-chart-time-policy", "lastKnown");
  await expect(cases.locator('[data-chart-time-kind="observed"]')).toHaveAttribute("data-chart-observation-epochs", String(august));
  const settings = await cursor.settings();
  await settings.getByRole("combobox", { name: "Matching override", exact: true }).selectOption("concurrent");
  await expect(trust.locator('[data-chart-time-kind="missing"]')).toContainText("No measurement");
  await settings.getByRole("combobox", { name: "Matching override", exact: true }).selectOption("closest");
  await settings.getByLabel("Nearest maximum distance (hours)", { exact: true }).fill("24");
  await settings.getByRole("button", { name: "Apply nearest override", exact: true }).click();
  await expect.poll(async () => (await readLastAcceptedAudienceState(popup)).time.nearest_tolerance_ms).toBe(86_400_000);
  await expect(trust.locator('[data-chart-time-kind="missing"]')).toContainText("No measurement");
  await settings.getByRole("combobox", { name: "Matching override", exact: true }).selectOption("authored");
  await expect(trust.locator('[data-chart-time-kind="observed"]')).toHaveAttribute("data-chart-observation-epochs", String(july19));
  await cursor.bar.getByRole("button", { name: "Advance exercise time", exact: true }).click();
  await expect(cursor.bar).toHaveAttribute("data-time-mode", "live");
  await expect.poll(async () => (await readStoredDashboard(page)).scenario.exerciseTime).toBe("2027-08-01T00:00:00.000Z");
  await expect(popup.locator('[data-cursor-stamp="live"]')).toContainText("2027-08-01");
  await popup.reload();
  await expect(popup.locator(".audience-display")).toHaveAttribute("data-connection-status", "connected");
  await expect(popup.locator('[data-cursor-stamp="live"]')).toContainText("2027-08-01");
  await expect(trust.locator('[data-chart-time-kind="observed"]')).toHaveAttribute("data-chart-observation-epochs", String(july19));
  await page.evaluate(sessionId => {
    const channel = new BroadcastChannel(`simex-presentation-${sessionId}`);
    channel.postMessage({ protocol_version: 3, session_id: sessionId, sequence: 999999, type: "state", payload: null });
    channel.close();
  }, channelId);
  await expect.poll(() => popup.evaluate(() => window.__audienceTestTransport?.lastOffVersionCandidate)).toEqual({ version: 3, sequence: 999999 });
  await expect(popup.locator('[data-cursor-stamp="live"]')).toContainText("2027-08-01");
  await expect(popup.locator(".audience-time-context")).toContainText("Fictional scenario · Exercise use only");
  await expect(popup.locator(".audience-time-context")).toContainText("App version");
  await expect(popup.locator('.audience-display button, .audience-display nav, .audience-display input')).toHaveCount(0);
  await expect(page.locator('.time-bar [aria-live="polite"]')).toHaveCount(1);
  await popup.close();
}

test("manual Audience closure terminates the old channel", async ({ page }) => {
  test.setTimeout(120_000);
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  const first = await openAudienceSession(page);

  const closed = first.popup.waitForEvent("close");
  await first.popup.close();
  await closed;
  await expect(page.locator('[data-presentation-control-id="open-new-session"]')).toBeVisible();
  await sendLateOldGenerationMessage(page, first.channelId);
  await expect(page.locator('[data-presentation-control-id="open-new-session"]')).toBeVisible();

  const second = await openAudienceSession(page);
  expect(second.channelId).not.toBe(first.channelId);
  await second.popup.close();
});

test("an already-open Audience display follows live semantic Theme changes", async ({ context, page }) => {
  test.setTimeout(120_000);
  await installAudienceFaultInstrumentation(context);
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  const session = await openAudienceSession(page);
  const audienceRoot = session.popup.locator(".audience-theme-root");

  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const theme = page.getByRole("dialog", { name: "Theme" });
  await theme.getByRole("radio", { name: "Humanist", exact: true }).check();
  await theme.getByRole("radio", { name: "Forum", exact: true }).check();
  await theme.getByRole("radio", { name: "Dark", exact: true }).check();
  await theme.getByLabel("Profile colors", { exact: true }).check();

  await expect(audienceRoot).toHaveAttribute("data-dashboard-style", "humanist-standard");
  await expect(audienceRoot).toHaveAttribute("data-dashboard-color-profile", "humanist-standard/open-forum");
  await expect(audienceRoot).toHaveAttribute("data-resolved-appearance", "dark");
  expect(await readLastAcceptedAudienceState(session.popup)).not.toHaveProperty("theme");
  await expect.poll(() => readLastAcceptedAudienceTheme(session.popup)).toEqual({
    dashboard_style: "humanist-standard",
    dashboard_color_profile: "humanist-standard/open-forum",
    chart_color_mode: "profile",
    appearance_preference: "dark",
    resolved_appearance: "dark",
  });
  await session.popup.close();
});

test("Audience remains passive and last-valid through invalid output and reconnect", async ({ context, page }) => {
  test.setTimeout(120_000);
  await installAudienceFaultInstrumentation(context);
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  const session = await openAudienceSession(page);
  const audience = session.popup.locator(".audience-display");

  for (const chartId of scene.present.chartIds) {
    await expect(session.popup.locator(`[data-displayed-chart-id="${cssEscape(chartId)}"]`)).toBeVisible();
  }
  await expect(audience.locator("button, nav, a")).toHaveCount(0);
  await injectIncompleteNextAudienceState(session.popup);
  await expect(audience).toHaveAttribute("data-connection-status", "resync-required");
  await expect(audience).toHaveCSS("opacity", "1");
  await expect(audience.getByText("Audience display ready", { exact: true })).toHaveCount(0);
  for (const chartId of scene.present.chartIds) {
    await expect(session.popup.locator(`[data-displayed-chart-id="${cssEscape(chartId)}"]`)).toBeVisible();
  }

  const settings = await timeCursor(page).settings();
  await settings.getByRole("combobox", { name: "Trace behavior", exact: true }).selectOption("full");
  await expect(audience).toHaveAttribute("data-connection-status", "connected");
  for (const chartId of scene.present.chartIds) {
    await expect(session.popup.locator(`[data-displayed-chart-id="${cssEscape(chartId)}"]`)).toBeVisible();
  }
  await session.popup.close();
});

test("Audience surface remaining after presenter teardown with denied close shows neutral Ended projection and rejects old events", async ({ context, page }) => {
  test.setTimeout(120_000);
  await installAudienceFaultInstrumentation(context);
  await context.addInitScript(() => {
    window.__presentationCloseDeniedByPlatform = true;
    window.close = () => {};
  });
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  const first = await openAudienceSession(page);
  await expect.poll(() => first.popup.evaluate(() => (
    window.__presentationCloseDeniedByPlatform === true
    && window.close.toString().replace(/\s/g, "") === "()=>{}"
  ))).toBe(true);

  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Home", exact: true }).click();
  await expect(first.popup.locator(".audience-display")).toHaveAttribute("data-connection-status", "ended");
  await expect(first.popup.locator(".audience-ended-content h1")).toHaveText("Presentation ended");
  await expect(first.popup.locator(".audience-ended-content p")).toHaveText("This display is no longer active.");
  await expect(first.popup.locator("[data-displayed-chart-id], button, nav, a")).toHaveCount(0);
  await expect(first.popup.locator(".audience-ended-content")).not.toContainText(/reconnect|disconnect|channel|session/i);
  expect(first.popup.isClosed()).toBe(false);
  await sendLateOldSessionState(first.popup);
  await expect(first.popup.locator(".audience-display")).toHaveAttribute("data-connection-status", "ended");
  await expect(first.popup.locator(".audience-ended-content h1")).toHaveText("Presentation ended");
  await expect(first.popup.getByText("Waiting for the next scene.", { exact: true })).toHaveCount(0);

  await enterPresentWithScene(page, scene);
  const second = await openAudienceSession(page);
  expect(second.channelId).not.toBe(first.channelId);
  await first.popup.close({ runBeforeUnload: false });
  await second.popup.close({ runBeforeUnload: false });
});

test("Present composes output and Audience dragging saves the Scene date position", async ({ context, page }) => {
  test.setTimeout(120_000);
  await installAudienceFaultInstrumentation(context);
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  await page.getByRole("button", { name: "Audience display options" }).click();
  const options = page.getByRole("dialog", { name: "Audience display options" });
  await options.getByRole("checkbox", { name: "Display Storyline date", exact: true }).check();
  await options.getByRole("button", { name: "Close Audience display options" }).click();
  const storedBefore = await readStoredDashboard(page);
  const savedBefore = (storedBefore.scenes ?? []).find(({ id }) => id === scene.id);
  const session = await openAudienceSession(page);
  const date = session.popup.locator(".audience-scene-date");

  expect(await date.evaluate((element) => ({
    left: element.style.left,
    top: element.style.top,
    width: element.style.width,
  }))).toEqual({
    left: `${savedBefore.audience.datePosition.xPermille / 10}%`,
    top: `${savedBefore.audience.datePosition.yPermille / 10}%`,
    width: `${savedBefore.audience.datePosition.widthPermille / 10}%`,
  });
  let accepted = await readLastAcceptedAudienceState(session.popup);
  expect(accepted.audience.date_position).toEqual({
    x_permille: savedBefore.audience.datePosition.xPermille,
    y_permille: savedBefore.audience.datePosition.yPermille,
    width_permille: savedBefore.audience.datePosition.widthPermille,
  });

  const displayedIds = [...scene.present.chartIds];
  if (displayedIds.length > 1) {
    const removedId = displayedIds.at(-1);
    const remove = page.locator(`[data-presentation-item-action="remove"][data-presentation-item-id="${cssEscape(removedId)}"]`);
    await remove.click();
    await expect(session.popup.locator(`[data-displayed-chart-id="${cssEscape(removedId)}"]`)).toHaveCount(0);
    const layout = page.locator('[data-presentation-control-id="composition-layout"]');
    const choices = await layout.locator("option").evaluateAll((options) => options.map(({ value }) => value));
    if (choices.length > 1) await layout.selectOption(choices.at(-1));
  }
  expect(await readStoredScene(page, scene.id)).toEqual(savedBefore);

  await expect(date).toHaveAttribute("data-audience-date-draggable", "true");
  const surfaceBounds = await session.popup.locator(".audience-display").boundingBox();
  const dateBounds = await date.boundingBox();
  expect(surfaceBounds).not.toBeNull();
  expect(dateBounds).not.toBeNull();
  const movement = { x: -96, y: 72 };
  const expectedPosition = {
    xPermille: clampInteger(
      savedBefore.audience.datePosition.xPermille + (movement.x / surfaceBounds.width) * 1000,
      0,
      1000 - savedBefore.audience.datePosition.widthPermille,
    ),
    yPermille: clampInteger(
      savedBefore.audience.datePosition.yPermille
        + (movement.y / Math.max(1, surfaceBounds.height - dateBounds.height)) * 1000,
      0,
      1000,
    ),
    widthPermille: savedBefore.audience.datePosition.widthPermille,
  };
  const dragStart = {
    x: dateBounds.x + dateBounds.width / 2,
    y: dateBounds.y + dateBounds.height / 2,
  };
  await session.popup.mouse.move(dragStart.x, dragStart.y);
  await session.popup.mouse.down();
  await session.popup.mouse.move(
    dragStart.x + movement.x,
    dragStart.y + movement.y,
    { steps: 6 },
  );
  await session.popup.mouse.up();

  const storedAfter = await expect.poll(() => readStoredDashboard(page)).toMatchObject({
    scenes: expect.arrayContaining([
      expect.objectContaining({
        id: scene.id,
        audience: {
          ...savedBefore.audience,
          datePosition: expectedPosition,
        },
      }),
    ]),
  }).then(() => readStoredDashboard(page));
  const expectedStored = structuredClone(storedBefore);
  expectedStored.scenes.find(({ id }) => id === scene.id).audience.datePosition = expectedPosition;
  expect(storedAfter).toEqual(expectedStored);

  await expect.poll(async () => (
    await readLastAcceptedAudienceState(session.popup)
  ).audience.date_position).toEqual({
    x_permille: expectedPosition.xPermille,
    y_permille: expectedPosition.yPermille,
    width_permille: expectedPosition.widthPermille,
  });
  expect(await date.evaluate((element) => ({
    left: element.style.left,
    top: element.style.top,
    width: element.style.width,
  }))).toEqual({
    left: `${expectedPosition.xPermille / 10}%`,
    top: `${expectedPosition.yPermille / 10}%`,
    width: `${expectedPosition.widthPermille / 10}%`,
  });
  await session.popup.close();
});

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

function clampInteger(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.round(Number(value))));
}
