import { expect, test } from "@playwright/test";

import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { openAudienceSession } from "./support/present-audience-workflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const IMAGE_TITLE = "Audience readiness map";
const IMAGE_ALT = "Audience readiness districts";
const FREE_TEXT_TITLE = "Moderator-only notes";
const PNG = Buffer.from(imageFixtureBytes("image/png"));

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "match" },
  });
});

test("saved Image and temporal chart keep exact identity through passive Audience layouts, failure, and replay", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await openBiomedical(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await createFreeText(page);
  const imagePanelId = await createImage(page);
  const authored = await presentationFixtureIdentity(page, imagePanelId);

  await installAudienceStateObserver(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.locator(".present-workspace")).toBeVisible();
  await expect(page.locator(`[data-presentable-item-id="${authored.freeTextPanelId}"]`)).toHaveCount(0);
  await expect(page.getByText(FREE_TEXT_TITLE, { exact: true })).toHaveCount(0);

  await presentChoice(page, authored.temporalChartId).getByRole("checkbox").check();
  await presentChoice(page, imagePanelId).getByRole("checkbox").check();
  const audience = await openAudience(page);
  await audience.setViewportSize({ width: 1920, height: 1080 });
  await expectAudienceCount(audience, 2);
  await expect(audience.locator(`img[alt="${IMAGE_ALT}"]`)).toBeVisible();
  await expectNoOverflow(audience);
  const twoCellGeometry = await audienceGeometry(audience);
  expect(twoCellGeometry.viewport).toEqual({ width: 1920, height: 1080 });
  expect(twoCellGeometry.cells).toHaveLength(2);
  expect(twoCellGeometry.cells.every(({ width, height }) => width > 0 && height > 0)).toBe(true);
  await captureCheckpoint(audience, testInfo, "audience-1920x1080-two-cell.png");

  const firstProtocol = await observedAudienceState(page);
  expect(presentationItems(firstProtocol)).toEqual([
    { kind: "chart", chart_id: authored.temporalChartId },
    {
      kind: "image",
      panel_id: imagePanelId,
      media_id: authored.imageMediaId,
      revision: authored.imageRevision,
    },
  ]);
  expect(Object.keys(presentationItems(firstProtocol)[1]).sort()).toEqual([
    "kind", "media_id", "panel_id", "revision",
  ]);

  const rejectedSequence = await injectRejectedFreeTextEnvelope(page, firstProtocol);
  await page.waitForTimeout(250);
  await expectAudienceCount(audience, 2);
  await expect(audience.getByText("Injected protocol Free text", { exact: true })).toHaveCount(0);
  await expect(audience.locator('[data-presentation-item-kind="freeText"]')).toHaveCount(0);
  await expect(audience.locator(`img[alt="${IMAGE_ALT}"]`)).toBeVisible();

  const beforeTime = await audienceImageSnapshot(audience, imagePanelId);
  await page.locator('[data-presentation-control-id="source"]')
    .selectOption(`group:${authored.chronoGroupId}`);
  await expect.poll(() => observedControllerStateSequence(page))
    .toBeGreaterThan(rejectedSequence);
  await expect(audience.locator(".audience-output"))
    .toHaveAttribute("data-connection-status", "connected");
  const slider = page.getByLabel("Presentation time");
  await expect(slider).toBeEnabled();
  await expect.poll(async () => (await observedAudienceState(page)).source?.chrono_group_id)
    .toBe(authored.chronoGroupId);
  await audience.waitForTimeout(600);
  const beforeChart = await audienceChartSnapshot(audience, authored.temporalChartId);
  expectRenderedTemporalChart(beforeChart);
  const beforeChartTime = await observedAudienceState(page);
  const firstTarget = await moveRangeToOtherBoundary(slider);
  await expect.poll(async () => presentationActiveEpoch(await observedAudienceState(page)))
    .not.toBe(presentationActiveEpoch(beforeChartTime));
  await expect.poll(() => audienceChartSnapshot(audience, authored.temporalChartId), {
    timeout: 15_000,
  }).not.toEqual(beforeChart);
  const afterTimeProtocol = await observedAudienceState(page);
  const afterChart = await audienceChartSnapshot(audience, authored.temporalChartId);
  const afterTime = await audienceImageSnapshot(audience, imagePanelId);
  expect(presentationItems(afterTimeProtocol)[1]).toEqual(presentationItems(firstProtocol)[1]);
  expect(presentationActiveEpoch(afterTimeProtocol)).not.toBe(presentationActiveEpoch(beforeChartTime));
  expect(afterChart.activeDate).not.toBe(beforeChart.activeDate);
  expect(afterChart.pixelHash).not.toBe(beforeChart.pixelHash);
  expect(afterTime).toEqual(beforeTime);

  await presentChoice(page, authored.temporalChartId).getByRole("checkbox").uncheck();
  await expectAudienceCount(audience, 1);
  await captureCheckpoint(audience, testInfo, "audience-1920x1080-one-cell.png");
  await presentChoice(page, authored.temporalChartId).getByRole("checkbox").check();
  await expectAudienceCount(audience, 2);
  for (const chartId of authored.additionalChartIds) {
    await presentChoice(page, chartId).getByRole("checkbox").check();
  }
  await expectAudienceCount(audience, 4);
  await expect(audience.locator(".displayed-chart-grid")).toHaveClass(/layout-grid2x2/);
  await captureCheckpoint(audience, testInfo, "audience-1920x1080-four-cell.png");

  const failedAssetId = await removeDurableImageAsset(page, imagePanelId);
  expect(failedAssetId).toBe(authored.assetId);
  await audience.reload({ waitUntil: "domcontentloaded" });
  await expect(audience.locator('[data-static-failure="asset-read-failed"]')).toBeVisible();
  await expectAudienceCount(audience, 4);
  await expect(audience.locator('[data-presentation-item-kind="chart"]')).toHaveCount(3);
  await expect(audience.locator("button, .chart-image-actions, .static-content-state__actions")).toHaveCount(0);
  await expectNoOverflow(audience);
  const failedProtocol = await observedAudienceState(page);
  expect(presentationItems(failedProtocol).find(({ kind }) => kind === "image"))
    .toEqual(presentationItems(firstProtocol)[1]);
  await audience.waitForTimeout(600);
  const temporalSiblingIds = [authored.temporalChartId, ...authored.additionalChartIds];
  const failedChartsBefore = new Map(await Promise.all(temporalSiblingIds.map(async (chartId) => {
    const snapshot = await audienceChartSnapshot(audience, chartId);
    expectRenderedTemporalChart(snapshot);
    return [chartId, snapshot];
  })));
  const failedImageBefore = await audienceImageSnapshot(audience, imagePanelId);
  await moveRangeToOppositeBoundary(slider, firstTarget);
  await expect.poll(async () => presentationActiveEpoch(await observedAudienceState(page)))
    .not.toBe(presentationActiveEpoch(failedProtocol));
  await expect.poll(async () => {
    const after = await Promise.all(temporalSiblingIds.map((chartId) => audienceChartSnapshot(audience, chartId)));
    return after.every((snapshot, index) => (
      snapshot.activeDate !== failedChartsBefore.get(temporalSiblingIds[index]).activeDate
      && snapshot.pixelHash !== failedChartsBefore.get(temporalSiblingIds[index]).pixelHash
    ));
  }, {
    timeout: 15_000,
  }).toBe(true);
  const failedChartsAfter = new Map(await Promise.all(temporalSiblingIds.map(async (chartId) => (
    [chartId, await audienceChartSnapshot(audience, chartId)]
  ))));
  for (const chartId of temporalSiblingIds) {
    const before = failedChartsBefore.get(chartId);
    const after = failedChartsAfter.get(chartId);
    expectRenderedTemporalChart(after);
    expect(after.activeDate).not.toBe(before.activeDate);
    expect(after.pixelHash).not.toBe(before.pixelHash);
  }
  const failedAfterTime = await observedAudienceState(page);
  expect(presentationItems(failedAfterTime).find(({ kind }) => kind === "image"))
    .toEqual(presentationItems(firstProtocol)[1]);
  expect(await audienceImageSnapshot(audience, imagePanelId)).toEqual(failedImageBefore);
  await expect(audience.locator('[data-static-failure="asset-read-failed"]')).toBeVisible();
  await expect(audience.locator('[data-presentation-item-kind="chart"]')).toHaveCount(3);
  await expect(audience.locator("button, .chart-image-actions, .static-content-state__actions")).toHaveCount(0);
  await expectNoOverflow(audience);
  await captureCheckpoint(audience, testInfo, "audience-1920x1080-four-cell-failure.png");

  await restoreDurableImageAsset(page, failedAssetId);
  await audience.close();
  const reconnected = await reopenAudience(page);
  await reconnected.setViewportSize({ width: 1366, height: 768 });
  await expectAudienceCount(reconnected, 4);
  await expect(reconnected.locator(`img[alt="${IMAGE_ALT}"]`)).toBeVisible();
  await expectNoOverflow(reconnected);
  const replayed = await observedAudienceState(page);
  expect(presentationItems(replayed).find(({ kind }) => kind === "image"))
    .toEqual(presentationItems(firstProtocol)[1]);
  const compactGeometry = await audienceGeometry(reconnected);
  expect(compactGeometry.viewport).toEqual({ width: 1366, height: 768 });
  expect(compactGeometry.cells).toHaveLength(4);
  await captureCheckpoint(reconnected, testInfo, "audience-1366x768-four-cell-reconnected.png");
});

async function openBiomedical(page) {
  await openDashboardPage(page, "biomedical");
}

async function createFreeText(page) {
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(FREE_TEXT_TITLE);
  await wizard.getByRole("tab", { name: "Advanced QMD" }).click();
  await wizard.getByLabel("Portable QMD source").fill([
    "## Internal runbook",
    "<script>globalThis.__mustRemainInert = true</script>",
    "![remote](https://example.test/must-not-load.png)",
  ].join("\n"));
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
}

async function createImage(page) {
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("radio", { name: /^Image / }).check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(IMAGE_TITLE);
  await wizard.getByLabel("PNG, JPEG, or WebP file").setInputFiles({
    name: "audience-readiness.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(wizard.getByText(/audience-readiness\.png is ready/)).toBeVisible();
  await wizard.getByLabel("Alternative text").fill(IMAGE_ALT);
  await wizard.getByRole("button", { name: "Continue" }).click();
  await expect(wizard.getByLabel("Text/Image preview").locator(`img[alt="${IMAGE_ALT}"]`)).toBeVisible();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  await expect.poll(() => panelIdByTitle(page, IMAGE_TITLE)).not.toBeNull();
  return panelIdByTitle(page, IMAGE_TITLE);
}

async function panelIdByTitle(page, title) {
  return page.evaluate(({ key, expectedTitle }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .find((panel) => panel.title === expectedTitle)?.id ?? null;
  }, { key: STORAGE_KEY, expectedTitle: title });
}

async function presentationFixtureIdentity(page, imagePanelId) {
  return page.evaluate(({ key, requestedImagePanelId, freeTextTitle }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const panels = dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels: sectionPanels }) => sectionPanels)
      .map((placement) => placement.chart ?? placement);
    const image = panels.find(({ id }) => id === requestedImagePanelId);
    const source = dashboard.dataSources[image.sourceId];
    const mediaItem = dashboard.contentLibrary.mediaItems[source.mediaId];
    const panelIds = new Set(panels
      .filter(({ typeId }) => !["image", "freeText"].includes(typeId))
      .map(({ id }) => id));
    const chronoGroup = dashboard.chronoGroups.find((group) => (
      (group.members ?? []).filter(({ chartId }) => panelIds.has(chartId)).length >= 3
    ));
    const temporalChartIds = chronoGroup.members
      .map(({ chartId }) => chartId)
      .filter((chartId) => panelIds.has(chartId))
      .slice(0, 3);
    const [temporalChartId, ...additionalChartIds] = temporalChartIds;
    return {
      imageSourceId: image.sourceId,
      imageMediaId: source.mediaId,
      imageRevision: mediaItem.revision,
      assetId: mediaItem.current.assetId,
      freeTextPanelId: panels.find(({ title }) => title === freeTextTitle).id,
      chronoGroupId: chronoGroup.id,
      temporalChartId,
      additionalChartIds,
    };
  }, { key: STORAGE_KEY, requestedImagePanelId: imagePanelId, freeTextTitle: FREE_TEXT_TITLE });
}

function presentChoice(page, itemId) {
  return page.locator(`[data-presentable-item-id="${itemId}"]`);
}

async function openAudience(page) {
  const { popup } = await openAudienceSession(page);
  await expect(popup.locator(".audience-display")).toBeVisible();
  return popup;
}

async function reopenAudience(page) {
  const popup = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "Reopen audience display" }).click();
  const audience = await popup;
  await audience.waitForLoadState("domcontentloaded");
  await expect(audience.locator(".audience-display")).toBeVisible();
  return audience;
}

async function installAudienceStateObserver(page) {
  await page.evaluate(() => {
    const originalPostMessage = BroadcastChannel.prototype.postMessage;
    globalThis.__SIMEX_E2E_AUDIENCE_STATE__ = {
      latestState: null,
      latestEnvelope: null,
      latestControllerSequence: 0,
    };
    globalThis.__SIMEX_E2E_NATIVE_BROADCAST_POST__ = originalPostMessage;
    BroadcastChannel.prototype.postMessage = function observePresentationState(data) {
      if (
        data?.protocol_version === 3
        && ["state", "heartbeat", "ended"].includes(data.type)
        && Number.isSafeInteger(data.sequence)
      ) {
        globalThis.__SIMEX_E2E_AUDIENCE_STATE__.latestControllerSequence = Math.max(
          globalThis.__SIMEX_E2E_AUDIENCE_STATE__.latestControllerSequence,
          data.sequence,
        );
      }
      if (data?.protocol_version === 3 && data.type === "state") {
        globalThis.__SIMEX_E2E_AUDIENCE_STATE__.latestState = structuredClone(data.payload);
        globalThis.__SIMEX_E2E_AUDIENCE_STATE__.latestEnvelope = structuredClone(data);
      }
      return originalPostMessage.call(this, data);
    };
  });
}

async function injectRejectedFreeTextEnvelope(page, acceptedState) {
  return page.evaluate((state) => {
    const accepted = globalThis.__SIMEX_E2E_AUDIENCE_STATE__.latestEnvelope;
    const injectedSequence = globalThis.__SIMEX_E2E_AUDIENCE_STATE__.latestControllerSequence + 1;
    const channel = new BroadcastChannel(`simex-presentation-${accepted.session_id}`);
    globalThis.__SIMEX_E2E_NATIVE_BROADCAST_POST__.call(channel, {
      protocol_version: 3,
      session_id: accepted.session_id,
      sequence: injectedSequence,
      type: "state",
      payload: {
        ...structuredClone(state),
        composition: {
          ...structuredClone(state.composition),
          displayed_chart_ids: ["injected-free-text"],
          layout: "solo",
        },
        payload: {
          ...structuredClone(state.payload),
          items: [{
            kind: "freeText",
            panel_id: "injected-free-text",
            media_id: "injected-media",
            revision: 1,
            source: "Injected protocol Free text",
          }],
        },
      },
    });
    channel.close();
    return injectedSequence;
  }, acceptedState);
}

async function observedAudienceState(page) {
  await expect.poll(() => page.evaluate(() => Boolean(
    globalThis.__SIMEX_E2E_AUDIENCE_STATE__?.latestState,
  ))).toBe(true);
  return page.evaluate(() => structuredClone(
    globalThis.__SIMEX_E2E_AUDIENCE_STATE__.latestState,
  ));
}

async function observedControllerStateSequence(page) {
  return page.evaluate(() => (
    globalThis.__SIMEX_E2E_AUDIENCE_STATE__?.latestEnvelope?.sequence ?? 0
  ));
}

function presentationItems(state) {
  return state?.payload?.items ?? [];
}

function presentationActiveEpoch(state) {
  const timeline = state?.timeline;
  return timeline?.frame_epochs?.[timeline.frame_index] ?? null;
}

async function expectAudienceCount(audience, count) {
  await expect(audience.locator(".displayed-chart-grid")).toHaveClass(new RegExp(`displayed-count-${count}`));
  await expect(audience.locator("[data-displayed-chart-id]")).toHaveCount(count);
}

async function audienceImageSnapshot(audience, panelId) {
  return audience.locator(`[data-displayed-chart-id="${panelId}"]`).evaluate((cell) => {
    const image = cell.querySelector("img");
    return {
      sourceId: cell.getAttribute("data-image-source-id"),
      revision: cell.getAttribute("data-image-revision"),
      renderedRevision: cell.querySelector("[data-static-source-revision]")?.getAttribute("data-static-source-revision"),
      src: image?.getAttribute("src"),
      transform: cell.querySelector("[data-image-transform-order]")?.getAttribute("data-image-transform-order"),
    };
  });
}

async function audienceChartSnapshot(audience, chartId) {
  return audience.locator(`[data-displayed-chart-id="${chartId}"]`).evaluate((cell) => {
    const canvas = cell.querySelector("canvas");
    const pixelData = canvas?.toDataURL("image/png") ?? "";
    let pixelHash = 2166136261;
    for (let index = 0; index < pixelData.length; index += 1) {
      pixelHash ^= pixelData.charCodeAt(index);
      pixelHash = Math.imul(pixelHash, 16777619);
    }
    return {
      kind: cell.getAttribute("data-presentation-item-kind"),
      activeDate: cell.querySelector("[data-chart-active-date]")?.getAttribute("data-chart-active-date") ?? "",
      text: cell.textContent.replace(/\s+/g, " ").trim(),
      pixelHash: pixelHash >>> 0,
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0,
      table: cell.querySelector("table")?.textContent.replace(/\s+/g, " ").trim() ?? "",
      temporalStatus: cell.querySelector("[data-temporal-status]")?.getAttribute("data-temporal-status") ?? "",
    };
  });
}

function expectRenderedTemporalChart(snapshot) {
  expect(snapshot.kind).toBe("chart");
  expect(snapshot.activeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(snapshot.canvasWidth).toBeGreaterThan(0);
  expect(snapshot.canvasHeight).toBeGreaterThan(0);
  expect(snapshot.pixelHash).not.toBe(2166136261);
}

async function moveRangeToOtherBoundary(slider) {
  const current = Number(await slider.inputValue());
  const minimum = Number(await slider.getAttribute("min"));
  const maximum = Number(await slider.getAttribute("max"));
  const target = current === maximum ? minimum : maximum;
  await slider.press(target === minimum ? "Home" : "End");
  await expect(slider).toHaveValue(String(target));
  return target;
}

async function moveRangeToOppositeBoundary(slider, currentBoundary) {
  const minimum = Number(await slider.getAttribute("min"));
  const maximum = Number(await slider.getAttribute("max"));
  const target = currentBoundary === maximum ? minimum : maximum;
  await slider.press(target === minimum ? "Home" : "End");
  await expect(slider).toHaveValue(String(target));
  return target;
}

async function audienceGeometry(audience) {
  return audience.evaluate(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    cells: [...document.querySelectorAll("[data-displayed-chart-id]")].map((cell) => {
      const bounds = cell.getBoundingClientRect();
      return { width: Math.round(bounds.width), height: Math.round(bounds.height) };
    }),
  }));
}

async function expectNoOverflow(audience) {
  await expect.poll(() => audience.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
    && document.documentElement.scrollHeight <= document.documentElement.clientHeight
  ))).toBe(true);
}

async function removeDurableImageAsset(page, panelId) {
  return page.evaluate(async ({ key, requestedPanelId }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const panel = dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .find(({ id }) => id === requestedPanelId);
    const placement = dashboard.dataSources[panel.sourceId];
    const assetId = dashboard.contentLibrary.mediaItems[placement.mediaId].current.assetId;
    const store = globalThis[Symbol.for("simex.browser-authored-asset-store")];
    globalThis.__SIMEX_REMOVED_AUDIENCE_ASSET__ = await store.read(assetId);
    await store.remove(assetId);
    return assetId;
  }, { key: STORAGE_KEY, requestedPanelId: panelId });
}

async function restoreDurableImageAsset(page, expectedAssetId) {
  const restored = await page.evaluate(async () => {
    const asset = globalThis.__SIMEX_REMOVED_AUDIENCE_ASSET__;
    const store = globalThis[Symbol.for("simex.browser-authored-asset-store")];
    const transactionId = `audience-reconnect-${Date.now()}`;
    const staged = await store.stage({
      bytes: asset.bytes,
      mediaType: asset.mediaType,
      width: asset.width,
      height: asset.height,
      transactionId,
    });
    await store.commit(staged.assetId, { transactionId });
    delete globalThis.__SIMEX_REMOVED_AUDIENCE_ASSET__;
    return staged.assetId;
  });
  expect(restored).toBe(expectedAssetId);
}

async function captureCheckpoint(page, testInfo, name) {
  const path = testInfo.outputPath(name);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: "image/png" });
}
