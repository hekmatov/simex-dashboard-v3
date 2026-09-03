import { expect, test } from "@playwright/test";

import {
  createSavedPresentationScene,
  enterPresentWithScene,
  installAudienceFaultInstrumentation,
  openAudienceSession,
} from "./support/present-audience-workflow.js";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.error(`Browser page error: ${error.stack ?? error.message}`));
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("http://127.0.0.1:4185/");
  await page.evaluate(() => localStorage.clear());
});

test("Present remains usable below the recommended 1024px width and preserves its live session", async ({ page }) => {
  test.setTimeout(120_000);
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  const { popup, channelId } = await openAudienceSession(page);

  await page.setViewportSize({ width: 1023, height: 768 });
  const notice = page.locator('[data-desktop-width-notice="present"]');
  const workspace = page.locator(".present-workspace");
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText("A minimum width of 1024px is recommended for Present.");
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute("data-active-scene-id", scene.id);
  await page.locator('[data-presentation-control-id="output-holding"]').click();
  await expect(popup.locator(".audience-display")).toHaveAttribute("data-output-mode", "holding");
  await expect(page.locator('[data-presentation-control-id="pause"]')).toBeDisabled();
  await expect(page.locator('[data-presentation-control-id="play"]')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(notice).toBeHidden();
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute("data-active-scene-id", scene.id);
  await expect(page.locator('[data-presentation-control-id="reopen-audience"]')).toBeVisible();
  await expect(page.locator('[data-presentation-control-id="pause"]')).toBeDisabled();
  await expect(popup.locator(".audience-display")).toHaveAttribute("data-output-mode", "holding");
  expect(new URL(popup.url()).searchParams.get("channel")).toBe(channelId);
  await popup.close();
});

test("1920 Audience progresses passively through output, liveness, blackout, and denied-close Ended", async ({ context, page }) => {
  test.setTimeout(150_000);
  await installAudienceFaultInstrumentation(context);
  await context.addInitScript(() => {
    window.close = () => {};
  });
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  const { popup } = await openAudienceSession(page);
  await popup.setViewportSize({ width: 1920, height: 1080 });
  const audience = popup.locator(".audience-display");

  await expect(audience).toHaveAttribute("data-output-mode", "active");
  await assertAudiencePassiveAndBounded(popup, scene);

  await page.locator('[data-presentation-control-id="output-holding"]').click();
  await expect(audience).toHaveAttribute("data-output-mode", "holding");
  await expect(audience.getByText("Waiting for the next scene.", { exact: true })).toBeVisible();
  await expect(audience.locator("[data-displayed-chart-id]")).toHaveCount(0);

  await page.locator('[data-presentation-control-id="output-blank"]').click();
  await expect(audience).toHaveAttribute("data-output-mode", "blank");
  await expect(audience.locator("[data-displayed-chart-id], .audience-holding-message")).toHaveCount(0);

  await page.locator('[data-presentation-control-id="output-active"]').click();
  await expect(audience).toHaveAttribute("data-output-mode", "active");
  await page.locator('[data-presentation-control-id="blackout"]').click();
  await expect(audience.locator(".audience-blackout")).toBeVisible();
  for (const chartId of scene.present.chartIds) {
    await expect(audience.locator(`[data-displayed-chart-id="${cssEscape(chartId)}"]`)).toHaveCount(1);
  }
  await page.locator('[data-presentation-control-id="restore"]').click();
  await expect(audience.locator(".audience-blackout")).toHaveCount(0);

  await page.evaluate(() => {
    setTimeout(() => {
      const releaseAt = performance.now() + 8_000;
      while (performance.now() < releaseAt) {
        // Exercise a real unresponsive controller event loop without a product hook.
      }
    }, 0);
  });
  await expect(popup.locator(
    '.audience-display[data-connection-status="disconnected"] [data-connection-indicator="disconnected"] svg[aria-label="Audience display disconnected"]',
  )).toBeVisible({ timeout: 12_000 });

  await expect(popup.locator(
    '.audience-display[data-connection-status="reconnecting"] [data-connection-indicator="reconnecting"] svg[aria-label="Audience display reconnecting"]',
  )).toBeVisible({ timeout: 6_000 });
  await expect(audience).toHaveAttribute("data-connection-status", "connected", { timeout: 12_000 });
  await expect(audience.locator("[data-connection-indicator]")).toHaveCount(0);
  await assertAudiencePassiveAndBounded(popup, scene);

  await page.locator('[data-presentation-control-id="end"]').click();
  await expect(audience).toHaveAttribute("data-connection-status", "ended");
  await expect(audience.locator(".audience-ended-content h1")).toHaveText("Presentation ended");
  await expect(audience.locator(".audience-ended-content p")).toHaveText("This display is no longer active.");
  await expect(audience.locator("button, nav, a, [data-displayed-chart-id], [data-connection-indicator]")).toHaveCount(0);
  expect(popup.isClosed()).toBe(false);
  await popup.close({ runBeforeUnload: false });
});

test("Audience closes successfully after END", async ({ page }) => {
  test.setTimeout(120_000);
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  const { popup } = await openAudienceSession(page);
  const closed = popup.waitForEvent("close");
  await page.locator('[data-presentation-control-id="end"]').click();
  await closed;
  await expect(page.locator('[data-presentation-control-id="open-new-session"]')).toBeVisible();
});

test("Audience renderer failure retains the last-valid passive projection without technical copy", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("http://127.0.0.1:4185/tests/e2e/audience-failure-harness.html");
  const audience = page.locator(".audience-display");
  await expect(audience).toHaveAttribute("data-render-status", "current");
  await expect(audience.getByText("Waiting for the next scene.", { exact: true })).toBeVisible();

  await page.evaluate(() => window.triggerAudienceRenderFailure());

  await expect(audience).toHaveAttribute("data-render-status", "retained");
  await expect(audience.getByText("Waiting for the next scene.", { exact: true })).toBeVisible();
  await expect(audience.locator("button, nav, a, [tabindex]")).toHaveCount(0);
  await expect(audience).not.toContainText(/error|failed|renderer|retry|session|channel/i);
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth <= window.innerWidth
    && document.documentElement.scrollHeight <= window.innerHeight
  ))).toBe(true);
});

test("Audience preserves canonical passive geometry across the Step 8 viewport fan-out", async ({ page }) => {
  test.setTimeout(150_000);
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  const { popup } = await openAudienceSession(page);

  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1200, height: 900 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await popup.setViewportSize(viewport);
    await expect(popup.locator(".audience-display")).toHaveAttribute("data-output-mode", "active");
    await assertAudiencePassiveAndBounded(popup, scene, viewport);
  }
  await popup.close();
});

test("date-position endpoints remain fully visible after direct Audience dragging", async ({ page }) => {
  test.setTimeout(120_000);
  const scene = await createSavedPresentationScene(page);
  await enterPresentWithScene(page, scene);
  const { popup } = await openAudienceSession(page);
  const date = popup.locator(".audience-scene-date");
  await expect(date).toHaveAttribute("data-audience-date-draggable", "true");

  for (const yPermille of [0, 1000]) {
    await dragAudienceDateToY(popup, yPermille);
    await expect.poll(() => date.evaluate((element) => element.style.top))
      .toBe(`${yPermille / 10}%`);

    const geometry = await Promise.all([
      popup.locator(".audience-display").boundingBox(),
      date.boundingBox(),
    ]);
    const [audienceBounds, dateBounds] = geometry;
    expect(audienceBounds && dateBounds).toBeTruthy();
    expect(dateBounds.x).toBeGreaterThanOrEqual(audienceBounds.x);
    expect(dateBounds.y).toBeGreaterThanOrEqual(audienceBounds.y);
    expect(dateBounds.x + dateBounds.width).toBeLessThanOrEqual(audienceBounds.x + audienceBounds.width);
    expect(dateBounds.y + dateBounds.height).toBeLessThanOrEqual(audienceBounds.y + audienceBounds.height);
  }
  await popup.close();
});

async function dragAudienceDateToY(popup, yPermille) {
  const date = popup.locator(".audience-scene-date");
  const [audienceBounds, dateBounds, top] = await Promise.all([
    popup.locator(".audience-display").boundingBox(),
    date.boundingBox(),
    date.evaluate((element) => Number.parseFloat(element.style.top) * 10),
  ]);
  expect(audienceBounds && dateBounds).toBeTruthy();
  const verticalTravel = Math.max(1, audienceBounds.height - dateBounds.height);
  const movementY = ((yPermille - top) / 1000) * verticalTravel;
  const start = {
    x: dateBounds.x + dateBounds.width / 2,
    y: dateBounds.y + dateBounds.height / 2,
  };
  await popup.mouse.move(start.x, start.y);
  await popup.mouse.down();
  await popup.mouse.move(start.x, start.y + movementY, { steps: 6 });
  await popup.mouse.up();
}

async function assertAudiencePassiveAndBounded(popup, scene, viewport = null) {
  const audience = popup.locator(".audience-display");
  await expect(audience.locator("button, nav, a, [tabindex]")).toHaveCount(0);
  for (const chartId of scene.present.chartIds) {
    await expect(audience.locator(`[data-displayed-chart-id="${cssEscape(chartId)}"]`)).toHaveCount(1);
  }
  expect(await popup.evaluate(() => ({
    rootWidth: document.querySelector(".audience-display")?.getBoundingClientRect().width,
    rootHeight: document.querySelector(".audience-display")?.getBoundingClientRect().height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    verticalOverflow: document.documentElement.scrollHeight > window.innerHeight,
  }))).toEqual({
    rootWidth: viewport?.width ?? 1920,
    rootHeight: viewport?.height ?? 1080,
    viewportWidth: viewport?.width ?? 1920,
    viewportHeight: viewport?.height ?? 1080,
    horizontalOverflow: false,
    verticalOverflow: false,
  });
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}
