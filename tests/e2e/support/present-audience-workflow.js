import { expect } from "@playwright/test";
import { openDashboardPage } from "./landingWorkflow.js";

export const LIVE_APP_URL = "http://127.0.0.1:4185/";
export const DASHBOARD_STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

export async function installAudienceFaultInstrumentation(context) {
  await context.addInitScript(() => {
    const NativeBroadcastChannel = window.BroadcastChannel;
    window.BroadcastChannel = class ObservedBroadcastChannel extends NativeBroadcastChannel {
      constructor(name) {
        super(name);
        window.__audienceTestTransport = {
          ...(window.__audienceTestTransport ?? {}),
          channelName: name,
        };
        this.addEventListener("message", ({ data }) => {
          if (data?.protocol_version === 3 && Number.isSafeInteger(data.sequence)) {
            window.__audienceTestTransport.lastControllerSequence = Math.max(
              window.__audienceTestTransport.lastControllerSequence ?? 0,
              data.sequence,
            );
            if (
              window.__audienceTestTransport.injectIncompleteAfterNextControllerMessage === true
              && ["state", "heartbeat"].includes(data.type)
            ) {
              window.__audienceTestTransport.injectIncompleteAfterNextControllerMessage = false;
              const channel = new NativeBroadcastChannel(name);
              channel.postMessage({
                protocol_version: 3,
                session_id: data.session_id,
                sequence: data.sequence + 1,
                type: "state",
                payload: null,
              });
              channel.close();
            }
          }
          if (data?.protocol_version === 3 && ["state", "ended"].includes(data.type)) {
            window.__audienceTestTransport.lastControllerMessage = structuredClone(data);
            if (data.type === "state") {
              if (data.payload === null) {
                window.__audienceTestTransport.incompleteStateSequence = data.sequence;
                window.__audienceTestTransport.incompleteStateCount =
                  (window.__audienceTestTransport.incompleteStateCount ?? 0) + 1;
              } else {
                window.__audienceTestTransport.lastStateMessage = structuredClone(data);
              }
            }
          }
        });
      }

    };
  });
}

export async function createSavedPresentationScene(page, {
  chronoGroupId = null,
  entry = "fresh",
  url = LIVE_APP_URL,
} = {}) {
  if (entry === "fresh") {
    await page.goto(url);
    await openDashboardPage(page, "biomedical");
    await page.locator('[data-dashboard-mode="build"]').click();
  } else if (entry !== "build-biomedical") {
    throw new Error(`Unknown presentation Scene workflow entry: ${entry}`);
  }
  await page.locator('[data-context-shelf-entry="scene"]').click();
  const studio = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await expect(studio).toBeVisible();
  const beforeIds = await readSceneIds(page);
  await studio.locator('[data-scene-workflow-id="create-scene"]').click();
  if (chronoGroupId) {
    await studio.locator('[data-scene-workflow-id="parent-chrono-group"]').selectOption(chronoGroupId);
  }
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
  await expect(popup.locator(".audience-display")).toHaveAttribute(
    "data-connection-status",
    "connected",
    { timeout: 45_000 },
  );
  return { popup, channelId };
}

export async function readStoredDashboard(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), DASHBOARD_STORAGE_KEY);
}

export async function readStoredScene(page, sceneId) {
  const dashboard = await readStoredDashboard(page);
  return (dashboard.scenes ?? []).find(({ id }) => id === sceneId) ?? null;
}

export async function readLastAcceptedAudienceState(popup) {
  await expect.poll(() => popup.evaluate(() => (
    window.__audienceTestTransport?.lastStateMessage?.payload ?? null
  ))).not.toBeNull();
  return popup.evaluate(() => structuredClone(
    window.__audienceTestTransport.lastStateMessage.payload,
  ));
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

export async function injectIncompleteNextAudienceState(popup) {
  const initialCount = await popup.evaluate(() => (
    window.__audienceTestTransport?.incompleteStateCount ?? 0
  ));
  await popup.evaluate(() => {
    const transport = window.__audienceTestTransport;
    transport.injectIncompleteAfterNextControllerMessage = true;
  });
  await expect.poll(() => popup.evaluate(() => (
    window.__audienceTestTransport?.incompleteStateCount ?? 0
  ))).toBeGreaterThan(initialCount);
}

export async function sendFreshAudienceSnapshot(popup) {
  await popup.evaluate(() => {
    const transport = window.__audienceTestTransport;
    const message = structuredClone(transport.lastStateMessage);
    message.sequence = Math.min(
      Number.MAX_SAFE_INTEGER,
      (transport.lastControllerSequence ?? transport.lastControllerMessage.sequence) + 1_024,
    );
    const channel = new BroadcastChannel(transport.channelName);
    channel.postMessage(message);
    channel.close();
  });
}

export async function sendLateOldSessionState(popup) {
  await popup.evaluate(() => {
    const transport = window.__audienceTestTransport;
    const message = structuredClone(transport.lastStateMessage);
    message.sequence = transport.lastControllerMessage.sequence + 1;
    message.payload.output_mode = "holding";
    message.payload.blackout = false;
    const channel = new BroadcastChannel(transport.channelName);
    channel.postMessage(message);
    channel.close();
  });
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
