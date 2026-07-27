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
  await expect(page.getByRole("status")).toContainText("could not be rendered");
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
  await expect(page.getByRole("status")).toHaveCount(0);
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
  await expect(page.getByRole("status")).toContainText("test runtime failure");
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
  await expect(page.getByRole("status")).toHaveCount(0);
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

async function snapshot(page) {
  return page.evaluate(() => window.__embeddedEChartsHarness.snapshot());
}
