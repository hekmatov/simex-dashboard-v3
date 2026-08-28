import { expect } from "@playwright/test";

export const WORKSPACE_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 390, height: 844 }),
  Object.freeze({ width: 768, height: 1024 }),
  Object.freeze({ width: 1024, height: 768 }),
  Object.freeze({ width: 1200, height: 900 }),
  Object.freeze({ width: 1440, height: 900 }),
]);

export async function setActualPageZoom(page, context, scale = 2) {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("A fixed viewport is required for the 200% reflow gate.");
  }
  const baselineDevicePixelRatio = await page.evaluate(() => window.devicePixelRatio);
  const cdp = await context.newCDPSession(page);
  const reflowViewport = {
    width: Math.floor(viewport.width / scale),
    height: Math.floor(viewport.height / scale),
  };
  // Chromium does not expose its browser-zoom control to Playwright. Device
  // metrics reproduce the decision-changing 200% signature: a halved CSS
  // viewport at doubled DPR, without compositor-only visual scaling.
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    ...reflowViewport,
    deviceScaleFactor: scale,
    mobile: false,
  });
  await expect.poll(() => page.evaluate(() => ({
    devicePixelRatio: window.devicePixelRatio,
    height: window.innerHeight,
    narrowLayout: matchMedia("(max-width: 767px)").matches,
    visualScale: window.visualViewport?.scale ?? 1,
    width: window.innerWidth,
  }))).toEqual({
    devicePixelRatio: scale,
    height: reflowViewport.height,
    narrowLayout: reflowViewport.width <= 767,
    visualScale: 1,
    width: reflowViewport.width,
  });
  return async () => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      ...viewport,
      deviceScaleFactor: baselineDevicePixelRatio,
      mobile: false,
    });
    await expect.poll(() => page.evaluate(() => ({
      height: window.innerHeight,
      width: window.innerWidth,
    }))).toEqual(viewport);
  };
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
    const viewport = window.visualViewport;
    const visualViewport = {
      left: viewport?.offsetLeft ?? 0,
      top: viewport?.offsetTop ?? 0,
      width: viewport?.width ?? window.innerWidth,
      height: viewport?.height ?? window.innerHeight,
    };
    visualViewport.right = visualViewport.left + visualViewport.width;
    visualViewport.bottom = visualViewport.top + visualViewport.height;
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineOffset: Number.parseFloat(style.outlineOffset),
      bounds: {
        left: bounds.left,
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
      },
      visualViewport,
      visible: bounds.bottom > visualViewport.top
        && bounds.top < visualViewport.bottom
        && bounds.right > visualViewport.left
        && bounds.left < visualViewport.right,
    };
  });
}
