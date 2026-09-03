import { expect, test } from "@playwright/test";

import { DASHBOARD_SURFACE_MANIFEST } from "./support/dashboard-surface-manifest.js";

const APP_URL = "http://127.0.0.1:4173";

test("chart authoring keeps single-line fields at 32px and grouping multirow", async ({ browser }) => {
  const surface = await openSurface(browser, "chart-wizard-configure");
  try {
    const titleAlignment = surface.page.locator('[data-field-id="titleAlignment"] select');
    await expect(titleAlignment).toBeVisible();
    expect(await controlGeometry(titleAlignment)).toEqual({
      height: 32,
      fontSize: 13,
      lineHeight: 18,
      paddingBlock: 8,
      paddingInline: 16,
    });

    const wizard = surface.page.getByRole("dialog", { name: "Add new chart" });
    await wizard.getByRole("button", { name: /^Map and prepare\./ }).click();
    for (const fieldId of ["category", "value"]) {
      const control = wizard.locator(`[data-field-id="${fieldId}"] select`).first();
      await expect(control).toBeVisible();
      expect(await controlGeometry(control)).toEqual({
        height: 32,
        fontSize: 13,
        lineHeight: 18,
        paddingBlock: 8,
        paddingInline: 16,
      });
    }

    const grouping = wizard.locator('[data-field-id="grouping"] select[multiple]');
    await expect(grouping).toBeVisible();
    const groupingGeometry = await grouping.evaluate((element) => {
      const style = getComputedStyle(element);
      const lineHeight = Number.parseFloat(style.lineHeight)
        || Number.parseFloat(style.getPropertyValue("--simex-control-line-height"));
      return {
        height: element.getBoundingClientRect().height,
        multiple: element.multiple,
        visibleOptions: element.clientHeight / lineHeight,
      };
    });
    expect(groupingGeometry.multiple).toBe(true);
    expect(groupingGeometry.height).toBeGreaterThan(32);
    expect(groupingGeometry.visibleOptions).toBeGreaterThan(1);
  } finally {
    await surface.context.close();
  }
});

test("color presets use exact 32px cells while the opener remains utility-sized", async ({ browser }) => {
  const surface = await openSurface(browser, "chart-color-palette");
  try {
    const opener = surface.page.locator(".chart-wizard .settings-color-swatch").first();
    const grid = surface.page.locator(".settings-color-preset-grid");
    const swatches = grid.locator("button");
    await expect(swatches.first()).toBeVisible();
    const evidence = await grid.evaluate((element) => {
      const style = getComputedStyle(element);
      const boxes = [...element.querySelectorAll("button")].map((button) => {
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      return {
        boxes,
        autoFlow: style.gridAutoFlow,
        columns: style.gridTemplateColumns.split(" "),
        overflows: element.scrollWidth > element.clientWidth,
      };
    });
    expect(await boxSize(opener)).toEqual({ width: 24, height: 24 });
    expect(evidence.boxes.length).toBeGreaterThan(1);
    expect(evidence.boxes.every(({ width, height }) => width === 32 && height === 32)).toBe(true);
    expect(evidence.autoFlow).toBe("row");
    expect(evidence.columns.every((column) => column === "32px")).toBe(true);
    expect(evidence.overflows).toBe(false);
  } finally {
    await surface.context.close();
  }
});

test("Scene unit move actions form two stable single-line rows", async ({ browser }) => {
  test.setTimeout(120_000);
  const surface = await openSurface(browser, "scene-unit-orbit");
  try {
    const buttons = surface.page.locator(".scene-unit-orbit__moves > button");
    await expect(buttons).toHaveCount(4);
    const boxes = await buttons.evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        wraps: element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight,
      };
    }));
    expect(boxes.every(({ height, wraps }) => height === 32 && !wraps)).toBe(true);
    expect(new Set(boxes.map(({ top }) => top)).size).toBe(2);
    expect(new Set(boxes.map(({ left }) => left)).size).toBe(2);
  } finally {
    await surface.context.close();
  }
});

test("Scene details keeps the simple frame source control at standard height", async ({ browser }) => {
  const surface = await openSurface(browser, "scene-studio-details");
  try {
    const frameSource = surface.page.locator("#scene-frame-source");
    await expect(frameSource).toBeVisible();
    const geometry = await controlGeometry(frameSource);
    expect(geometry.height).toBe(32);
    const [labelBox, timeModeBox] = await Promise.all([
      frameSource.locator("xpath=..").boundingBox(),
      surface.page.locator(".scene-details-stage__fields fieldset").first().boundingBox(),
    ]);
    expect(labelBox.height).toBeLessThan(timeModeBox.height);
  } finally {
    await surface.context.close();
  }
});

test("restore footer has a deliberate two-up row and full-width destructive row", async ({ browser }) => {
  const surface = await openSurface(browser, "restore-online-dashboard-dialog");
  try {
    const footer = surface.page.locator(".restore-online-dashboard-dialog .dashboard-dialog__footer");
    const evidence = await footer.evaluate((element) => {
      const style = getComputedStyle(element);
      const children = [...element.children].map((child) => {
        const rect = child.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
      });
      const contentLeft = element.getBoundingClientRect().left + Number.parseFloat(style.paddingLeft);
      const contentRight = element.getBoundingClientRect().right - Number.parseFloat(style.paddingRight);
      const destructive = element.querySelector(".control-tooltip");
      const destructiveButton = destructive.querySelector("button");
      return {
        display: style.display,
        columnCount: style.gridTemplateColumns.split(" ").length,
        columnGap: Number.parseFloat(style.columnGap),
        children,
        contentLeft,
        contentRight,
        destructiveButtonWidth: destructiveButton.getBoundingClientRect().width,
      };
    });
    const [keep, download, destructive] = evidence.children;
    expect(evidence.display).toBe("grid");
    expect(evidence.columnCount).toBe(2);
    expect(evidence.columnGap).toBe(8);
    expect(keep.top).toBe(download.top);
    expect(keep.right).toBeLessThan(download.left);
    expect(destructive.top).toBeGreaterThanOrEqual(Math.max(keep.bottom, download.bottom) + 8);
    expect(destructive.left).toBe(evidence.contentLeft);
    expect(destructive.right).toBe(evidence.contentRight);
    expect(evidence.destructiveButtonWidth).toBe(destructive.width);
  } finally {
    await surface.context.close();
  }
});

async function openSurface(browser, id) {
  const entry = DASHBOARD_SURFACE_MANIFEST.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Unknown dashboard surface: ${id}`);
  const context = await browser.newContext({
    baseURL: APP_URL,
    viewport: entry.viewport,
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const mounted = await entry.setup({ page, browserContext: context, entry });
  const activePage = mounted?.page ?? page;
  await activePage.locator(entry.root).filter({ visible: true }).first().waitFor();
  return { context, page: activePage };
}

async function controlGeometry(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight)
        || Number.parseFloat(style.getPropertyValue("--simex-control-line-height")),
      paddingBlock: Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom),
      paddingInline: Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight),
    };
  });
}

async function boxSize(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
}
