import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const REFERENCE_URL = "http://127.0.0.1:8765/.planning/sketches/003-dashboard-visual-language/index.html?round=1";
const PRODUCTION_URL = "http://127.0.0.1:4173/";
const output = path.resolve("docs/audits/2026-08-19-v3-step-6-sketch-fidelity/screenshots");
const pairs = Object.freeze([
  Object.freeze({ id: "evidence-ledger", label: "Ledger", profile: "evidence-ledger/brighter-vellum", sketchProfile: "evidence-signature" }),
  Object.freeze({ id: "humanist-standard", label: "Humanist", profile: "humanist-standard/common-ground", sketchProfile: "humanist-signature" }),
  Object.freeze({ id: "signal-instrument", label: "Instrument", profile: "signal-instrument/calibrated-steel", sketchProfile: "signal-signature" }),
]);

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const measurements = [];

for (const style of pairs) {
  for (const appearance of ["light", "dark"]) {
    const referenceContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: appearance });
    const reference = await referenceContext.newPage();
    await reference.goto(REFERENCE_URL);
    await reference.locator('[data-scene-button="V0"]').click();
    await reference.locator(`[data-style-button="${style.id}"]`).click();
    await reference.locator(`[data-palette-id-button="${style.sketchProfile}"]`).click();
    await reference.locator(`[data-appearance="${appearance}"]`).click();
    await reference.waitForTimeout(240);
    await reference.locator(".product-viewport").evaluate((viewport) => {
      const shell = viewport.querySelector(".dashboard-shell");
      viewport.scrollTop = shell.offsetTop;
    });
    await reference.locator("#toast").evaluate((toast) => { toast.style.display = "none"; });
    await reference.locator(".product-viewport").screenshot({
      path: path.join(output, `${style.id}-${appearance}-reference.png`),
    });
    const referenceMetrics = await readReferenceMetrics(reference);
    await referenceContext.close();

    const productionContext = await browser.newContext({ viewport: { width: 1440, height: 1080 }, colorScheme: appearance });
    const production = await productionContext.newPage();
    await production.goto(PRODUCTION_URL);
    await production.locator(".dashboard-command-page-scroller")
      .getByRole("button", { name: "Biomedical", exact: true }).click();
    await production.getByRole("button", { name: "Dashboard look", exact: true }).click();
    await production.getByLabel(style.label, { exact: true }).check();
    await production.locator(`[data-profile-option="${style.profile}"] input`).check();
    await production.getByLabel(appearance === "light" ? "Light" : "Dark", { exact: true }).check();
    await production.waitForTimeout(240);
    await production.locator(".look-drawer-layer").evaluate((drawer) => { drawer.style.display = "none"; });
    const chartCanvas = production.locator(".chart-echarts-host canvas").first();
    if (await chartCanvas.count()) await chartCanvas.waitFor({ state: "visible" });
    await production.waitForTimeout(1000);
    await production.evaluate(() => window.scrollTo(0, 0));
    await production.screenshot({
      path: path.join(output, `${style.id}-${appearance}-production.png`),
    });
    const productionMetrics = await readProductionMetrics(production);

    const oversized = [];
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
      await production.setViewportSize(viewport);
      await production.evaluate(() => window.scrollTo(0, 0));
      await production.waitForTimeout(60);
      oversized.push(await readOversizedMetrics(production, viewport));
      await production.screenshot({
        path: path.join(output, `${style.id}-${appearance}-${viewport.width}x${viewport.height}.png`),
      });
    }
    await productionContext.close();
    measurements.push({ style: style.id, profile: style.profile, appearance, reference: referenceMetrics, production: productionMetrics, oversized });
  }
}

await fs.writeFile(path.join(output, "measurements.json"), `${JSON.stringify(measurements, null, 2)}\n`);
await browser.close();
console.log(`Captured ${measurements.length} matched comparisons and ${measurements.length * 2} oversized views in ${output}`);

async function readReferenceMetrics(page) {
  return page.evaluate(readMetricsInPage, {
    shell: ".dashboard-shell",
    header: ".section-header",
    panel: ".chart-panel",
    grid: ".dashboard-grid",
  });
}

async function readProductionMetrics(page) {
  return page.evaluate(readMetricsInPage, {
    shell: ".canonical-dashboard-frame",
    header: "[data-canonical-section-id] .section-header",
    panel: "[data-canonical-section-id] [data-canonical-panel-id]",
    grid: "[data-canonical-section-id] > .layout-grid",
  });
}

async function readOversizedMetrics(page, viewport) {
  return page.evaluate(({ width, height }) => {
    const record = (rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    const app = document.querySelector(".app-frame");
    const frame = document.querySelector(".canonical-dashboard-frame");
    const appRect = app.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    return {
      viewport: `${width}x${height}`,
      outerPaint: getComputedStyle(app).backgroundColor,
      app: record(appRect),
      frame: record(frameRect),
      leftSide: frameRect.left,
      rightSide: document.documentElement.clientWidth - frameRect.right,
    };
  }, viewport);
}

function readMetricsInPage(selectors) {
  const record = (rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  const shell = document.querySelector(selectors.shell);
  const header = document.querySelector(selectors.header);
  const panel = document.querySelector(selectors.panel);
  const grid = document.querySelector(selectors.grid);
  const shellStyle = getComputedStyle(shell);
  const headerStyle = getComputedStyle(header);
  const panelStyle = getComputedStyle(panel);
  const gridStyle = getComputedStyle(grid);
  const headerRect = header.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  return {
    shell: { ...record(shell.getBoundingClientRect()), radius: shellStyle.borderRadius, border: shellStyle.border, shadow: shellStyle.boxShadow, paint: shellStyle.backgroundColor },
    sectionHeader: { ...record(headerRect), padding: headerStyle.padding, borderTop: headerStyle.borderTop, borderBottom: headerStyle.borderBottom, paint: headerStyle.backgroundColor },
    grid: { ...record(grid.getBoundingClientRect()), padding: gridStyle.padding, gap: gridStyle.gap },
    firstPanel: { ...record(panelRect), padding: panelStyle.padding, radius: panelStyle.borderRadius, border: panelStyle.border, shadow: panelStyle.boxShadow, paint: panelStyle.backgroundColor },
    titleBandToFirstPanelBorder: panelRect.top - headerRect.bottom,
  };
}
