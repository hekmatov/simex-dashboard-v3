import assert from "node:assert/strict";
import test, { after, afterEach, beforeEach } from "node:test";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), logLevel: "silent", server: { host: "127.0.0.1", port: 0 } });
await vite.listen();
const browser = await chromium.launch();
let page;
beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1600, height: 1400 } });
  page.setDefaultTimeout(5000);
  await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}/tests/fixtures/authoring-stage-harness.html`);
  await page.waitForFunction(() => window.stageHarnessReady === true);
});
afterEach(async () => { await page.close(); });
after(async () => { await browser.close(); await vite.close(); });

test("closing a stage map leaves the destination's independent rendering slot allocated", async () => {
  const destination = page.locator('main[data-canonical-page-id] .chart-echarts-view');
  await destination.locator("canvas").waitFor();
  await page.locator(".authoring-stage canvas").waitFor();
  await page.evaluate(() => window.setStageOpen(false));
  await page.waitForFunction(() => !document.querySelector(".authoring-stage"));
  assert.equal(await destination.getAttribute("data-map-budget-status"), "normal");
  assert.equal(await destination.locator("canvas").count(), 1);
});

test("the first chart in an empty section uses its constrained destination width", async () => {
  await page.evaluate(() => window.mountStageHarness(true));
  await page.waitForFunction(() => document.querySelector(".authoring-stage")?.dataset.stageWidth === "379");
  assert.equal(await page.locator(".authoring-stage").getAttribute("data-stage-height"), "418");
});

test("Show on canvas restores opacity and focus on Escape, cancellation and unmount", async () => {
  const show = page.getByRole("button", { name: "Show on canvas", exact: true });
  await show.focus();
  await show.press("Enter");
  assert.equal(await page.evaluate(() => window.revealActive), true);
  await show.press("Escape");
  assert.equal(await page.evaluate(() => window.revealActive), false);
  assert.equal(await show.evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator("[data-authoring-reveal]").count(), 0);
  await show.hover(); await page.mouse.down();
  assert.equal(await page.evaluate(() => window.revealActive), true);
  await show.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  assert.equal(await page.locator("[data-authoring-reveal]").count(), 0);
  await show.press("Enter");
  await page.evaluate(() => window.setStageOpen(false));
  await page.waitForFunction(() => !document.querySelector(".authoring-stage"));
  assert.equal(await page.evaluate(() => window.revealActive), false);
});
