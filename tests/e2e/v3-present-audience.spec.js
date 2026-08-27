import { expect, test } from "@playwright/test";

import {
  createSavedPresentationScene,
  enterPresentWithScene,
  LIVE_APP_URL,
  openAudienceSession,
  sendLateOldGenerationMessage,
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

test("denied Audience close leaves a passive Ended surface", async ({ context, page }) => {
  test.setTimeout(120_000);
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
  expect(first.popup.isClosed()).toBe(false);
  await sendLateOldGenerationMessage(first.popup, first.channelId);
  await expect(first.popup.locator(".audience-display")).toHaveAttribute("data-connection-status", "ended");

  const second = await openAudienceSession(page);
  expect(second.channelId).not.toBe(first.channelId);
  await first.popup.close({ runBeforeUnload: false });
  await second.popup.close({ runBeforeUnload: false });
});
