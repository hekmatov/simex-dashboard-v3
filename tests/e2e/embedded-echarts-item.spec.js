import { expect, test } from "@playwright/test";

const HARNESS_URL = "http://127.0.0.1:4175/tests/e2e/embedded-echarts-harness.html";

test("embedded ECharts releases and recreates mounted resources across invalid and failed models", async ({ page }) => {
  await page.goto(HARNESS_URL);

  await expect(page.locator(".chart-embedded-echarts-host")).toHaveCount(1);
  await expect.poll(() => snapshot(page)).toEqual({
    events: ["mount:1", "listen", "observe:1", "update:1:first"],
    activeInstances: 1,
    activeListeners: 1,
    activeObservers: 1,
  });

  await page.getByRole("button", { name: "Invalid model", exact: true }).click();
  await expect(page.locator(".chart-embedded-echarts-error")).toContainText("could not be rendered");
  await expect.poll(() => snapshot(page)).toEqual({
    events: [
      "mount:1",
      "listen",
      "observe:1",
      "update:1:first",
      "disconnect:1",
      "unlisten",
      "dispose:1",
    ],
    activeInstances: 0,
    activeListeners: 0,
    activeObservers: 0,
  });

  await page.getByRole("button", { name: "Valid model", exact: true }).click();
  await expect(page.locator(".chart-embedded-echarts-host")).toHaveCount(1);
  await expect(page.locator(".chart-embedded-echarts-error")).toHaveCount(0);
  await expect.poll(() => snapshot(page)).toEqual({
    events: [
      "mount:1",
      "listen",
      "observe:1",
      "update:1:first",
      "disconnect:1",
      "unlisten",
      "dispose:1",
      "mount:2",
      "listen",
      "observe:2",
      "update:2:second",
    ],
    activeInstances: 1,
    activeListeners: 1,
    activeObservers: 1,
  });

  await page.getByRole("button", { name: "Runtime failure", exact: true }).click();
  await expect(page.locator(".chart-embedded-echarts-error")).toContainText("test runtime failure");
  await expect.poll(() => snapshot(page)).toEqual({
    events: [
      "mount:1",
      "listen",
      "observe:1",
      "update:1:first",
      "disconnect:1",
      "unlisten",
      "dispose:1",
      "mount:2",
      "listen",
      "observe:2",
      "update:2:second",
      "update:2:runtime-fail",
      "disconnect:2",
      "unlisten",
      "dispose:2",
    ],
    activeInstances: 0,
    activeListeners: 0,
    activeObservers: 0,
  });

  await page.getByRole("button", { name: "Recover", exact: true }).click();
  await expect(page.locator(".chart-embedded-echarts-error")).toHaveCount(0);
  await expect(page.locator(".chart-embedded-echarts-host")).toHaveCount(1);
  await expect.poll(() => snapshot(page)).toEqual({
    events: [
      "mount:1",
      "listen",
      "observe:1",
      "update:1:first",
      "disconnect:1",
      "unlisten",
      "dispose:1",
      "mount:2",
      "listen",
      "observe:2",
      "update:2:second",
      "update:2:runtime-fail",
      "disconnect:2",
      "unlisten",
      "dispose:2",
      "mount:3",
      "listen",
      "observe:3",
      "update:3:recovered",
    ],
    activeInstances: 1,
    activeListeners: 1,
    activeObservers: 1,
  });

  await page.getByRole("button", { name: "Unmount", exact: true }).click();
  await expect(page.locator(".chart-embedded-echarts-host")).toHaveCount(0);
  await expect.poll(() => snapshot(page)).toEqual({
    events: [
      "mount:1",
      "listen",
      "observe:1",
      "update:1:first",
      "disconnect:1",
      "unlisten",
      "dispose:1",
      "mount:2",
      "listen",
      "observe:2",
      "update:2:second",
      "update:2:runtime-fail",
      "disconnect:2",
      "unlisten",
      "dispose:2",
      "mount:3",
      "listen",
      "observe:3",
      "update:3:recovered",
      "disconnect:3",
      "unlisten",
      "dispose:3",
    ],
    activeInstances: 0,
    activeListeners: 0,
    activeObservers: 0,
  });
});

test("native Ctrl-wheel guarding, image zoom, reduced motion, and listener cleanup work when mounted", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(HARNESS_URL);

  const guard = page.locator(".chart-zoom-guard");
  const image = page.locator(".chart-image-view");
  await expect(guard).toHaveCount(1);
  await expect(image).toHaveAttribute("data-image-zoom-scale", "1");
  await expect.poll(() => zoomSnapshot(page)).toMatchObject({
    activeWheelListeners: 1,
    wheelListenerAdds: 1,
    wheelListenerRemoves: 0,
    rendererWheelEvents: [],
  });
  await expect(page.locator(".chart-zoom-hint")).toHaveCSS("transition-duration", "0s");

  const plain = await dispatchWheel(page, { ctrlKey: false, deltaY: -100 });
  expect(plain.defaultPrevented).toBe(false);
  expect(plain.dispatchResult).toBe(true);
  await expect(image).toHaveAttribute("data-image-zoom-scale", "1");
  await expect.poll(() => zoomSnapshot(page)).toMatchObject({
    rendererWheelEvents: [],
  });

  const beforeScroll = await page.evaluate(() => window.scrollY);
  await image.hover();
  await page.mouse.wheel(0, 320);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(beforeScroll);

  const controlled = await dispatchWheel(page, { ctrlKey: true, deltaY: -100 });
  expect(controlled.defaultPrevented).toBe(true);
  expect(controlled.dispatchResult).toBe(false);
  await expect(image).toHaveAttribute("data-image-zoom-scale", "1.25");
  await expect(page.locator(".chart-image-zoom-status")).toHaveText("Zoom 125%");
  await expect.poll(() => zoomSnapshot(page)).toMatchObject({
    rendererWheelEvents: [{ ctrlKey: true, defaultPrevented: true }],
  });

  await page.getByRole("button", { name: "Reset image zoom", exact: true }).click();
  await expect(image).toHaveAttribute("data-image-zoom-scale", "1");

  await page.getByRole("button", { name: "Rerender zoom guard", exact: true }).click();
  await expect.poll(() => zoomSnapshot(page)).toMatchObject({
    activeWheelListeners: 1,
    wheelListenerAdds: 1,
    wheelListenerRemoves: 0,
  });

  await page.getByRole("button", { name: "Unmount zoom guard", exact: true }).click();
  await expect(guard).toHaveCount(0);
  await expect.poll(() => zoomSnapshot(page)).toMatchObject({
    activeWheelListeners: 0,
    wheelListenerAdds: 1,
    wheelListenerRemoves: 1,
  });
});

async function snapshot(page) {
  return page.evaluate(() => window.__embeddedEChartsHarness.snapshot());
}

async function zoomSnapshot(page) {
  return page.evaluate(() => window.__embeddedEChartsHarness.zoomSnapshot());
}

async function dispatchWheel(page, init) {
  return page.evaluate((wheelInit) => (
    window.__embeddedEChartsHarness.dispatchWheel(wheelInit)
  ), init);
}
