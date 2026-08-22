import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1200, height: 900 },
  { width: 1440, height: 900 },
];

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Step 7 canonical content and responsive canvas contract hold at approved viewports", async ({ page }) => {
  test.setTimeout(240_000);
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator(".dashboard-command-page-scroller")
      .getByRole("button", { name: "Biomedical", exact: true }).click();
    const view = await readCanvasContract(page);
    await page.getByLabel("Dashboard mode")
      .getByRole("button", { name: "Build", exact: true }).click();
    const build = await readCanvasContract(page);

    expect(build.ids).toEqual(view.ids);
    expect(build.maxWidth).toBe(view.maxWidth);
    expect(build.frameWidth).toBeLessThanOrEqual(Number.parseFloat(build.maxWidth));
    if (viewport.width === 390) {
      await expect(page.locator('[data-phone-mode-notice="build"]')).toBeVisible();
      await expect(page.locator(".build-workspace")).toHaveCount(1);
    } else {
      await expect(page.locator('[data-phone-mode-notice="build"]')).toBeHidden();
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
  return page.evaluate(() => {
    const frame = document.querySelector(".canonical-dashboard-frame");
    const ids = [...document.querySelectorAll("[data-canonical-panel-id]")]
      .map((node) => node.getAttribute("data-canonical-panel-id"));
    return {
      ids,
      frameWidth: frame.getBoundingClientRect().width,
      maxWidth: getComputedStyle(document.documentElement)
        .getPropertyValue("--simex-canonical-canvas-max-width").trim(),
    };
  });
}
