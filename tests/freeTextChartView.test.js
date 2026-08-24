import assert from "node:assert/strict";
import test, { after, afterEach, beforeEach } from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});
await vite.listen();
const address = vite.httpServer.address();
const baseURL = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch();
let page;

beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(5_000);
  await page.goto(`${baseURL}/tests/fixtures/free-text-harness.html`);
  await page.waitForFunction(() => window.freeTextHarnessReady === true, null, { timeout: 5_000 });
});

afterEach(async () => {
  await page?.close();
  page = null;
});

after(async () => {
  await browser.close();
  await vite.close();
});

test("canonical ChartView routes typed Free text without rows or playback projection and preserves semantic structure", async () => {
  const qmd = [
    "# Situation",
    "",
    "A [safe external link](https://example.test).",
    "",
    "| Facility | Ready |",
    "| --- | --- |",
    "| North | Yes |",
    "",
    "```text",
    "a-very-long-display-only-code-token-that-does-not-execute",
    "```",
    "",
    "::: {.callout-important}",
    "Confirm communications.",
    ":::",
  ].join("\n");
  await page.evaluate((source) => window.mountRoutedFreeText(source), qmd);

  const active = page.locator('[data-harness-mode="active"]');
  const passive = page.locator('[data-harness-mode="passive"]');
  await active.locator(".free-text-chart-view").waitFor();
  assert.equal(await active.locator("h2").textContent(), "Operational situation");
  assert.equal(await active.locator("h3").textContent(), "Situation");
  assert.equal(await active.locator("h3").getAttribute("id"), "situation-panel-situation");
  assert.equal(await active.locator("th").first().getAttribute("scope"), "col");
  assert.equal(await active.locator("aside").getAttribute("data-callout-type"), "important");
  assert.equal(await active.locator("a").first().getAttribute("rel"), "noopener noreferrer");
  assert.equal(await active.locator("a").first().getAttribute("target"), "_blank");
  assert.equal(await active.locator(".portable-qmd-table-scroll").getAttribute("tabindex"), "0");
  assert.equal(await active.locator(".portable-qmd-code-scroll").getAttribute("tabindex"), "0");
  assert.equal(await active.locator("[data-chart-state]").count(), 0);
  assert.equal(await active.locator('[data-chart-interaction-mode="active"]').count(), 1);
  assert.equal(await passive.locator('[data-chart-interaction-mode="passive"]').count(), 1);
  assert.equal(await active.locator(".free-text-chart-view__content").innerHTML(), await passive.locator(".free-text-chart-view__content").innerHTML());
});

test("editor debounces parsing, keeps the last valid preview stale on error, and recovers without losing source", async () => {
  const initial = "# Situation\n\nInitial valid preview.";
  await page.evaluate((source) => window.mountFreeTextEditor(source), initial);
  const editor = page.getByLabel("QMD-style source");
  const preview = page.locator('[data-free-text-pane="preview"]');
  await preview.getByText("Initial valid preview.").waitFor();
  assert.equal(await page.locator('[data-validation-ok="true"]').textContent(), "0 blocking errors");

  const blocked = "# Situation\n\n<iframe src=\"https://example.test\"></iframe>";
  await editor.fill(blocked);
  assert.match(await page.locator("#harness-qmd-status").textContent(), /Updating preview/i);
  await page.waitForTimeout(240);
  assert.match(await page.locator("#harness-qmd-status").textContent(), /1 blocking error|blocking errors/i);
  assert.equal(await page.locator(".free-text-preview-stale").textContent(), "Preview is stale");
  assert.equal(await preview.getByText("Initial valid preview.").count(), 1);
  assert.equal(await editor.inputValue(), blocked);
  const errorLink = page.locator(".free-text-validation-errors a").first();
  assert.match(await errorLink.textContent(), /line 3/i);
  await errorLink.click();
  assert.equal(await page.evaluate(() => document.activeElement?.id), "harness-qmd");

  await editor.fill("# Situation\n\nRecovered preview.");
  await page.waitForTimeout(240);
  await preview.getByText("Recovered preview.").waitFor();
  assert.equal(await page.locator(".free-text-preview-stale").count(), 0);
  assert.equal(await page.locator('[data-validation-ok="true"]').textContent(), "0 blocking errors");
});

test("responsive Source and Preview tabs preserve selected pane and logical focus across layout changes", async () => {
  await page.evaluate(() => window.mountFreeTextEditor("# Situation\n\nResponsive content."));
  const sourcePane = page.locator('[data-free-text-pane="source"]');
  const previewPane = page.locator('[data-free-text-pane="preview"]');
  await previewPane.getByText("Responsive content.").waitFor();
  assert.equal(await sourcePane.isVisible(), true);
  assert.equal(await previewPane.isVisible(), true);

  const editor = page.getByLabel("QMD-style source");
  await editor.focus();
  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForTimeout(50);
  assert.equal(await page.getByRole("tab", { name: "Source" }).getAttribute("aria-selected"), "true");
  assert.equal(await sourcePane.isVisible(), true);
  assert.equal(await previewPane.isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "harness-qmd");

  const sourceTab = page.getByRole("tab", { name: "Source" });
  const previewTab = page.getByRole("tab", { name: "Preview" });
  await sourceTab.focus();
  await sourceTab.press("ArrowRight");
  assert.equal(await previewTab.getAttribute("aria-selected"), "true");
  await page.waitForFunction(() => document.activeElement?.textContent === "Preview");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Preview");
  assert.equal(await sourcePane.isVisible(), false);
  assert.equal(await previewPane.isVisible(), true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(50);
  assert.equal(await sourcePane.isVisible(), true);
  assert.equal(await previewPane.isVisible(), true);
  assert.equal(await page.locator('[role="tab"]').filter({ hasText: "Preview" }).getAttribute("aria-selected"), "true");
});

test("panel, table, and code own their bounded overflow without growing the document", async () => {
  const longToken = "X".repeat(240);
  const qmd = `# Overflow\n\n${longToken}\n\n| Very wide heading ${longToken} | Value |\n| --- | --- |\n| Wide | ${longToken} |\n\n\`\`\`text\n${longToken}\n\`\`\``;
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate((source) => window.mountRoutedFreeText(source), qmd);
  await page.locator(".free-text-chart-view__content").first().waitFor();
  const overflow = await page.evaluate(() => {
    const view = document.querySelector(".free-text-chart-view");
    const table = document.querySelector(".portable-qmd-table-scroll");
    const code = document.querySelector(".portable-qmd-code-scroll");
    return {
      documentFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      viewY: getComputedStyle(view).overflowY,
      tableX: getComputedStyle(table).overflowX,
      codeX: getComputedStyle(code).overflowX,
      tableOwnsOverflow: table.scrollWidth > table.clientWidth,
      codeOwnsOverflow: code.scrollWidth > code.clientWidth,
    };
  });
  assert.deepEqual(overflow, {
    documentFits: true,
    viewY: "auto",
    tableX: "auto",
    codeX: "auto",
    tableOwnsOverflow: true,
    codeOwnsOverflow: true,
  });
});
