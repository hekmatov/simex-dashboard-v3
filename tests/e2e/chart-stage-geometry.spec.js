import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { chartFootprintPixelSize, resolveCanvasGeometry } from "../../src/components/chartStageGeometry.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

test.use({ storageState: { cookies: [], origins: [] } });

test("shared chart geometry matches canonical, constrained, tablet and real Build destinations", async ({ page, request }) => {
  test.setTimeout(120_000);
  // Cheap preflight: source identity, eligible source chart and destination.
  const response = await request.get("/config/dashboard.json");
  expect(response.ok()).toBe(true);
  const bytes = await response.body();
  expect(createHash("sha256").update(bytes).digest("hex")).toBe("a6092faf3463389fea17934c005f74802c9c843abcecfb31272221a2fea11f2f");
  const dashboard = JSON.parse(bytes);
  expect(dashboard.pages.find(p => p.id === "biomedical")?.sections.flatMap(s => s.panels)
    .find(c => c.id === "bio_current_cases_kpi")?.typeId).toBe("kpi");

  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.goto("/tests/e2e/chart-stage-geometry-harness.html");
  const compact = page.locator('[data-panel-id="compact"]');
  await expect(compact).toBeVisible();
  for (const [canvasWidth, deviceLayout] of [[1392, "auto"], [900.5, "auto"], [1180, "tablet"], [800, "tablet"]]) {
    await page.evaluate(value => window.renderGeometryCase(value), { canvasWidth, deviceLayout });
    const geometry = resolveCanvasGeometry({ canvasWidth, deviceLayout });
    await expect.poll(() => compact.evaluate(el => el.getBoundingClientRect().width))
      .toBeCloseTo(chartFootprintPixelSize({ columns: 1, rows: 1 }, geometry).width, 1);
    for (const [id, columns, rows] of [["compact", 1, 1], ["standard", 2, 1], ["wide", 4, 1], ["full", 4, 2], ["fractional", 3, 0.5]]) {
      const size = chartFootprintPixelSize({ columns, rows }, geometry);
      const box = await page.locator(`[data-panel-id="${id}"]`).boundingBox();
      expect(Math.abs(box.width - size.width)).toBeLessThan(1);
      expect(Math.abs(box.height - size.height)).toBeLessThan(1);
      if (canvasWidth === 1392 && id === "standard") expect([box.width, box.height]).toEqual([670, 418]);
    }
    const staticSize = await page.locator(".authoring-footprint-frame").boundingBox();
    expect(staticSize.height).toBe(201);
  }

  await page.setViewportSize({ width: 640, height: 900 });
  await page.evaluate(() => window.renderGeometryCase({ canvasWidth: 600, deviceLayout: "phone" }));
  await expect.poll(() => page.locator(".layout-grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(1);
  expect(await compact.evaluate(el => getComputedStyle(el).gridRowStart)).toBe("auto");

  // Measure the actual selected package under both Build rails. Use effective
  // grid width (including its padding), never viewport width or the max token.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const build = page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true });
  await expect(build).toBeVisible();
  await build.click();
  const panel = page.locator('.canonical-dashboard-frame [data-canonical-panel-id="bio_current_cases_kpi"]');
  await expect(panel).toBeVisible();
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(async () => {
      const measured = await panel.evaluate(el => {
        const grid = el.closest(".layout-grid");
        return { canvasWidth: grid.getBoundingClientRect().width, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height };
      });
      const expected = chartFootprintPixelSize({ columns: 2, rows: 1 }, resolveCanvasGeometry({ canvasWidth: measured.canvasWidth }));
      return Math.max(Math.abs(measured.width - expected.width), Math.abs(measured.height - expected.height));
    }).toBeLessThan(1);
    expect(await panel.evaluate(el => el.closest(".layout-grid").getBoundingClientRect().width)).toBeLessThan(1392);
  }
});
