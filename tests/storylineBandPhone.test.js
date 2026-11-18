import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { createServer as createHttpServer } from "node:http";

test("approved Storyline comparisons fit a 390px phone with reachable controls and real source charts", async () => {
  const vite = await createServer({ root: process.cwd(), logLevel: "silent", server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true } });
  const server = createHttpServer(vite.middlewares);
  let browser;
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/tests/fixtures/storyline-band-phone-harness.html`);
    await page.waitForFunction(() => Boolean(window.storylinePhoneFixture));
    await page.evaluate(async () => { await document.fonts.load('400 14px "PDPC Avenir"'); await document.fonts.ready; });
    console.log(JSON.stringify({ conditions: "isolated StorylineBand component; actual source config/CSV/profiles/styles/fonts; no whole-app or physical-device acceptance", browser: browser.version(), viewport: "390x844", reducedMotion: "reduce" }));
    const definitions = await page.evaluate(() => window.storylinePhoneFixture.scenes);
    assert.equal(definitions.length, 3);
    assert.ok(Object.values(await page.evaluate(() => window.storylinePhoneFixture.sourceRowCounts)).every(count => count > 0));
    for (const scene of definitions) {
      await page.getByRole("combobox", { name: "Fixture storyline", exact: true }).selectOption(scene.id);
      const band = page.getByRole("region", { name: "Storyline", exact: true });
      await band.getByRole("heading", { name: scene.name, exact: true }).waitFor();
      for (const member of scene.members) {
        const cell = band.locator(`[data-scene-chart-id="${member.chartId}"]`);
        await cell.scrollIntoViewIfNeeded();
        await page.waitForFunction(id => {
          const root = document.querySelector(`[data-scene-chart-id="${id}"]`);
          const ledger = root?.querySelector("[data-canonical-runtime-ledger]");
          const option = window.storylinePhoneFixture.chartOption(id);
          const numerical = option?.series?.some(series => series.data?.some(point => {
            const value = point && typeof point === "object" && !Array.isArray(point) ? point.value : point;
            return Number.isFinite(Array.isArray(value) ? value.at(-1) : value);
          }));
          const canvas = root?.querySelector("canvas");
          if (!ledger || JSON.parse(ledger.dataset.canonicalRuntimeLedger).render.status !== "ready" || !numerical || !canvas) return false;
          const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 4; i < pixels.length; i += 4) {
            if (pixels[i] !== pixels[0] || pixels[i + 1] !== pixels[1] || pixels[i + 2] !== pixels[2] || pixels[i + 3] !== pixels[3]) return true;
          }
          return false;
        }, member.chartId);
        assert.equal(await cell.getAttribute("data-scene-width"), String(member.width));
        assert.equal(await cell.getAttribute("data-scene-row-height"), String(member.height));
      }
      await band.locator(".storyline-band__header").scrollIntoViewIfNeeded();
      const geometry = await band.evaluate(element => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        controls: [...element.querySelectorAll(".storyline-band__header select, .storyline-band__header button")].map(node => { const box = node.getBoundingClientRect(); return { tag: node.tagName, x: box.x, right: box.right, width: box.width, height: box.height }; }),
        charts: [...element.querySelectorAll(".scene-view-composition-cell")].map(node => ({
          id: node.dataset.sceneChartId,
          height: node.getBoundingClientRect().height,
          width: node.getBoundingClientRect().width,
          ...window.storylinePhoneFixture.chartGeometry(node.dataset.sceneChartId),
          titleSize: parseFloat(getComputedStyle(node.querySelector(".chart-view-title")).fontSize),
        })),
      }));
      assert.equal(geometry.controls.length, 1);
      console.log(JSON.stringify({ viewport: "390x844", scene: scene.id, ...geometry }));
      assert.ok(geometry.overflow <= 1, `Root overflow ${geometry.overflow}px in ${scene.name}`);
      for (const control of geometry.controls) {
        assert.ok(control.width >= 44 && control.height >= 44, `${control.tag} needs 44px target`);
        assert.ok(control.x >= 0 && control.right <= 391, `${control.tag} must be reachable horizontally`);
      }
      for (const chart of geometry.charts) {
        assert.ok(chart.height <= 370 && chart.height >= 300, `${chart.id} readable phone height and cap`);
        assert.ok(chart.width >= 370, `${chart.id} uses the available phone width`);
        assert.ok(chart.plotWidth >= 270, `${chart.id} chart grid uses most of the viewport`);
        if (chart.legendClearance !== null) assert.ok(chart.legendClearance >= 18, `${chart.id} legend clears the horizontal axis`);
        assert.ok(chart.titleSize >= 12, `${chart.id} readable title`);
        const option = await page.evaluate(id => window.storylinePhoneFixture.chartOption(id), chart.id);
        for (const axis of [...(option.xAxis ?? []), ...(option.yAxis ?? [])]) {
          assert.ok(axis.axisLabel.fontSize >= 12, `${chart.id} readable axis`);
          if (axis.axisLabel.customValues) assert.ok(axis.axisLabel.customValues.length <= 5, `${chart.id} five-label cap`);
        }
      }
      await band.getByRole("button", { name: "Close Storyline", exact: true }).focus();
      assert.equal(await band.getByRole("button", { name: "Close Storyline", exact: true }).evaluate(node => document.activeElement === node), true);
    }
    await page.getByRole("button", { name: "Close Storyline", exact: true }).click();
    await page.getByRole("region", { name: "Storyline", exact: true }).waitFor({ state: "detached" });
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); if (server.listening) await new Promise(resolve => server.close(resolve)); await vite.close(); }
});
