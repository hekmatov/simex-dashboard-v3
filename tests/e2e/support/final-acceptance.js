import { expect } from "@playwright/test";

export const WORKSPACE_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 1024, height: 768 }),
  Object.freeze({ width: 1280, height: 800 }),
  Object.freeze({ width: 1440, height: 900 }),
  Object.freeze({ width: 1920, height: 1080 }),
]);

export async function expectNoViewportOverflow(page, { vertical = false } = {}) {
  const overflow = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
    vertical: document.documentElement.scrollHeight > window.innerHeight,
  }));
  expect(overflow.horizontal).toBe(false);
  if (vertical) {
    expect(overflow.vertical).toBe(false);
  }
}

export async function captureCheckpoint(page, testInfo, name) {
  const path = testInfo.outputPath(name);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
  return path;
}
