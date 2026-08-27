import { expect } from "@playwright/test";

export const LIVE_APP_URL = "http://127.0.0.1:4185/";
export const DASHBOARD_STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

export async function createSavedPresentationScene(page) {
  await page.goto(LIVE_APP_URL);
  await page.locator('[data-dashboard-page-id="biomedical"]').click();
  await page.locator('[data-dashboard-mode="build"]').click();
  await page.locator('[data-context-shelf-entry="scene"]').click();
  const studio = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await expect(studio).toBeVisible();
  const beforeIds = await readSceneIds(page);
  await studio.locator('[data-scene-workflow-id="create-scene"]').click();
  await studio.locator("#scene-name").fill(`Presentation fixture ${Date.now()}`);
  await studio.locator('[data-scene-workflow-id="save-scene"]').click();

  const scene = await expect.poll(async () => page.evaluate(({ key, oldIds }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return (dashboard.scenes ?? []).find(({ id }) => !oldIds.includes(id)) ?? null;
  }, { key: DASHBOARD_STORAGE_KEY, oldIds: beforeIds })).not.toBeNull().then(async () => (
    page.evaluate(({ key, oldIds }) => {
      const dashboard = JSON.parse(localStorage.getItem(key));
      return (dashboard.scenes ?? []).find(({ id }) => !oldIds.includes(id));
    }, { key: DASHBOARD_STORAGE_KEY, oldIds: beforeIds })
  ));

  await studio.getByRole("button", { name: "Close", exact: true }).click();
  return scene;
}

export async function enterPresentWithScene(page, scene) {
  await page.locator('[data-dashboard-mode="present"]').click();
  await page.locator('[data-presentation-control-id="source"]').selectOption(`scene:${scene.id}`);
  await expect(page.locator(".present-workspace")).toHaveAttribute("data-active-scene-id", scene.id);
  for (const chartId of scene.present.chartIds) {
    await expect(page.locator(`.present-selected-chart[data-displayed-chart-id="${cssEscape(chartId)}"]`)).toBeVisible();
  }
}

export async function openAudienceSession(page) {
  const popupPromise = page.context().waitForEvent("page");
  await page.locator('[data-presentation-control-id="open-new-session"]').click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  const channelId = new URL(popup.url()).searchParams.get("channel");
  expect(channelId).toBeTruthy();
  await expect(popup.locator(".audience-display")).toHaveAttribute("data-connection-status", "connected");
  return { popup, channelId };
}

export async function sendLateOldGenerationMessage(page, channelId) {
  await page.evaluate((sessionId) => {
    const channel = new BroadcastChannel(`simex-presentation-${sessionId}`);
    channel.postMessage({
      protocol_version: 3,
      session_id: sessionId,
      sequence: Number.MAX_SAFE_INTEGER,
      type: "heartbeat",
      payload: null,
    });
    channel.close();
  }, channelId);
}

async function readSceneIds(page) {
  return page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key)) ?? {};
    return (dashboard.scenes ?? []).map(({ id }) => id);
  }, DASHBOARD_STORAGE_KEY);
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}
