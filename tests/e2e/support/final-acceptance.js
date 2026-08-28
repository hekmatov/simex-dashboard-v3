import { expect } from "@playwright/test";

export const WORKSPACE_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 390, height: 844 }),
  Object.freeze({ width: 768, height: 1024 }),
  Object.freeze({ width: 1024, height: 768 }),
  Object.freeze({ width: 1200, height: 900 }),
  Object.freeze({ width: 1440, height: 900 }),
]);

export async function setActualPageZoom(page, context, scale = 2) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: scale });
  await expect.poll(() => page.evaluate(() => window.visualViewport?.scale)).toBe(scale);
  return async () => cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
}

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

export async function expectMinimumTouchTargets(locator, minimum = 44) {
  const undersized = await locator.evaluateAll((controls, threshold) => controls.map((control) => {
    const box = control.getBoundingClientRect();
    return {
      label: control.getAttribute("aria-label") || control.textContent?.trim() || control.tagName,
      width: Math.round(box.width),
      height: Math.round(box.height),
    };
  }).filter(({ width, height }) => width < threshold || height < threshold), minimum);
  expect(undersized, JSON.stringify(undersized)).toEqual([]);
}

export async function captureCheckpoint(page, testInfo, name) {
  const path = testInfo.outputPath(name);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
  return path;
}

export async function readFocusVisibility(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      visible: bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth,
    };
  });
}
