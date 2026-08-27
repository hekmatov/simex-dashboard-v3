import { expect, test } from "@playwright/test";

import {
  createSavedPresentationScene,
  enterPresentWithScene,
  injectIncompleteNextAudienceState,
  installAudienceFaultInstrumentation,
  LIVE_APP_URL,
  openAudienceSession,
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
});

test("END closes Audience and terminates the old channel", async ({ page }) => {
  test.setTimeout(120_000);
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  const first = await openAudienceSession(page);

  const closed = first.popup.waitForEvent("close");
  await page.locator('[data-presentation-control-id="end"]').click();
  await closed;
  await expect(page.locator('[data-presentation-control-id="open-new-session"]')).toBeVisible();
  await sendLateOldGenerationMessage(page, first.channelId);
  await expect(page.locator('[data-presentation-control-id="open-new-session"]')).toBeVisible();

  const second = await openAudienceSession(page);
  expect(second.channelId).not.toBe(first.channelId);
  await second.popup.close();
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

  await page.locator('[data-presentation-control-id="trace-full"]').click();
  await expect(audience).toHaveAttribute("data-connection-status", "connected");
  for (const chartId of scene.present.chartIds) {
    await expect(session.popup.locator(`[data-displayed-chart-id="${cssEscape(chartId)}"]`)).toBeVisible();
  }
  await session.popup.close();
});

test("Audience surface remaining after denied close shows neutral Ended projection and rejects old events", async ({ context, page }) => {
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

  await page.locator('[data-presentation-control-id="end"]').click();
  await expect(first.popup.locator(".audience-display")).toHaveAttribute("data-connection-status", "ended");
  await expect(first.popup.locator(".audience-ended h1")).toHaveText("Presentation ended");
  await expect(first.popup.locator(".audience-ended p")).toHaveText("This display is no longer active.");
  await expect(first.popup.locator("[data-displayed-chart-id], button, nav, a")).toHaveCount(0);
  await expect(first.popup.locator(".audience-ended")).not.toContainText(/reconnect|disconnect|channel|session/i);
  expect(first.popup.isClosed()).toBe(false);
  await sendLateOldSessionState(first.popup);
  await expect(first.popup.locator(".audience-display")).toHaveAttribute("data-connection-status", "ended");
  await expect(first.popup.locator(".audience-ended h1")).toHaveText("Presentation ended");
  await expect(first.popup.getByText("Waiting for the next scene.", { exact: true })).toHaveCount(0);

  const second = await openAudienceSession(page);
  expect(second.channelId).not.toBe(first.channelId);
  await first.popup.close({ runBeforeUnload: false });
  await second.popup.close({ runBeforeUnload: false });
});

test("Present composes output and saves Scene date position through its owner", async ({ context, page }) => {
  test.setTimeout(120_000);
  await installAudienceFaultInstrumentation(context);
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
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
    await remove.focus();
    await remove.press("Enter");
    await expect(session.popup.locator(`[data-displayed-chart-id="${cssEscape(removedId)}"]`)).toHaveCount(0);
    const layout = page.locator('[data-presentation-control-id="composition-layout"]');
    const choices = await layout.locator("option").evaluateAll((options) => options.map(({ value }) => value));
    if (choices.length > 1) await layout.selectOption(choices.at(-1));
  }
  expect(await readStoredScene(page, scene.id)).toEqual(savedBefore);

  await page.locator('[data-presentation-control-id="date-position-x"]').fill("125");
  await page.locator('[data-presentation-control-id="date-position-y"]').fill("250");
  await page.locator('[data-presentation-control-id="date-position-width"]').fill("375");
  await expect(page.getByText("Unsaved position", { exact: true })).toBeVisible();

  expect(await readStoredScene(page, scene.id)).toEqual(savedBefore);
  accepted = await readLastAcceptedAudienceState(session.popup);
  expect(accepted.audience.date_position).toEqual({
    x_permille: savedBefore.audience.datePosition.xPermille,
    y_permille: savedBefore.audience.datePosition.yPermille,
    width_permille: savedBefore.audience.datePosition.widthPermille,
  });

  await page.locator('[data-presentation-control-id="date-position-save"]').click();
  await expect(page.getByText("Unsaved position", { exact: true })).toHaveCount(0);
  const storedAfter = await expect.poll(() => readStoredDashboard(page)).toMatchObject({
    scenes: expect.arrayContaining([
      expect.objectContaining({
        id: scene.id,
        audience: {
          ...savedBefore.audience,
          datePosition: { xPermille: 125, yPermille: 250, widthPermille: 375 },
        },
      }),
    ]),
  }).then(() => readStoredDashboard(page));
  const expectedStored = structuredClone(storedBefore);
  expectedStored.scenes.find(({ id }) => id === scene.id).audience.datePosition = {
    xPermille: 125,
    yPermille: 250,
    widthPermille: 375,
  };
  expect(storedAfter).toEqual(expectedStored);

  await expect.poll(async () => (
    await readLastAcceptedAudienceState(session.popup)
  ).audience.date_position).toEqual({
    x_permille: 125,
    y_permille: 250,
    width_permille: 375,
  });
  expect(await date.evaluate((element) => ({
    left: element.style.left,
    top: element.style.top,
    width: element.style.width,
  }))).toEqual({ left: "12.5%", top: "25%", width: "37.5%" });
  await session.popup.close();
});

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}
