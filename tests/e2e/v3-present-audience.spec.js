import { expect, test } from "@playwright/test";

import {
  createSavedPresentationScene,
  enterPresentWithScene,
  injectIncompleteNextAudienceState,
  installAudienceFaultInstrumentation,
  LIVE_APP_URL,
  openAudienceSession,
  sendLateOldGenerationMessage,
  sendLateOldSessionState,
} from "./support/present-audience-workflow.js";

test.beforeEach(async ({ page }) => {
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

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}
