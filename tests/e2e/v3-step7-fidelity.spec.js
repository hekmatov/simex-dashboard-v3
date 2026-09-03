import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const VIEWPORTS = [
  { width: 900, height: 720 },
  { width: 1023, height: 768 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Step 7 canonical content remains available across the recommended 1024px boundary", async ({ page }) => {
  test.setTimeout(240_000);
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await openDashboardPage(page, "biomedical");
    const view = await readCanvasContract(page);
    await page.getByLabel("Dashboard mode")
      .getByRole("button", { name: "Build", exact: true }).click();
    const build = await readCanvasContract(page);
    const notice = page.locator('[data-desktop-width-notice="build"]');
    const workspace = page.locator(".build-mode-shell");

    expect(build.canvasId).toBe(view.canvasId);
    expect(build.ids).toEqual(view.ids);
    expect(build.maxWidth).toBe(view.maxWidth);
    expect(build.frameWidth).toBeLessThanOrEqual(Number.parseFloat(build.maxWidth));
    await expect(workspace).toBeVisible();

    if (viewport.width < 1024) {
      await expect(notice).toBeVisible();
      await expect(notice).toHaveText("A minimum width of 1024px is recommended for Build.");
      await expect(page.locator('[data-build-command-action="add-chart"]')).toBeEnabled();
    } else {
      await expect(notice).toBeHidden();
    }

    const screenshot = await page.screenshot({ animations: "disabled" });
    expect(screenshot.byteLength).toBeGreaterThan(10_000);
  }

  const footer = page.locator(".dashboard-footer");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toContainText("SimEx Dashboard V3");
});

async function readCanvasContract(page) {
  const canvas = page.locator("[data-canonical-canvas-id]");
  await expect(canvas).toBeVisible();
  return readMountedCanvasContract(page);
}

async function readMountedCanvasContract(page) {
  const canvas = page.locator("[data-canonical-canvas-id]");
  await expect(canvas).toHaveCount(1);
  return page.evaluate(() => {
    const canvasNode = document.querySelector("[data-canonical-canvas-id]");
    const frame = document.querySelector(".canonical-dashboard-frame");
    const ids = [...document.querySelectorAll("[data-canonical-panel-id]")]
      .map((node) => node.getAttribute("data-canonical-panel-id"));
    return {
      canvasId: canvasNode.getAttribute("data-canonical-canvas-id"),
      ids,
      frameWidth: frame.getBoundingClientRect().width,
      maxWidth: getComputedStyle(document.documentElement)
        .getPropertyValue("--simex-canonical-canvas-max-width").trim(),
    };
  });
}
