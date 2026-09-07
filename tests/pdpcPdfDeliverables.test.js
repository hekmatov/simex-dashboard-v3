import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { chromium } from "@playwright/test";

test("PDF preparation captures both release sections while removing navigation controls", async () => {
  const { preparePdpcPdfDocument } = await import("../scripts/lib/pdpc-pdf.mjs");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.setContent(`
      <div class="app-frame" data-appearance-preference="light">
        <aside aria-label="Exercise disclaimer">Fictional scenario · Exercise use only</aside>
        <div class="app-shell" style="min-height: 100vh">Printable application shell</div>
        <div class="page-stack" style="display: grid">Printable page stack</div>
        <section class="dashboard-section" style="display: grid">Printable dashboard section</section>
        <header><nav class="pdpc-dashboard-pages" aria-label="Dashboard pages">
          <button data-dashboard-page-id="scenario">Scenario</button>
          <button data-dashboard-page-id="biomedical">Biomedical Information</button>
        </nav></header>
        <main data-canonical-page-id="scenario">
          <div class="section-header"><h1>Scenario content</h1></div><canvas width="20" height="20"></canvas>
          <section class="layout-grid"><article class="chart-panel">Printable chart card</article></section>
          <div style="height: 1800px"></div>
          <div class="chart-deferred-placeholder">Chart loads when it enters the viewport</div>
        </main>
        <footer class="pdpc-dashboard-footer">Dashboard footer</footer>
      </div>
      <script>
        addEventListener('scroll', () => {
          const placeholder = document.querySelector('.chart-deferred-placeholder');
          if (placeholder && scrollY > 500) {
            const canvas = document.createElement('canvas');
            canvas.width = 20;
            canvas.height = 20;
            canvas.getContext('2d').fillRect(0, 0, 10, 10);
            placeholder.replaceWith(canvas);
          }
        });
        document.querySelector('[data-dashboard-page-id="biomedical"]').addEventListener('click', () => {
          const main = document.querySelector('main');
          main.dataset.canonicalPageId = 'biomedical';
          main.querySelector('h1').textContent = 'Biomedical content';
          main.querySelector('canvas').getContext('2d').fillRect(0, 0, 10, 10);
        });
      </script>
    `);

    const result = await preparePdpcPdfDocument({ page, variant: "biomedical" });

    assert.deepEqual(result.pageIds, ["scenario", "biomedical"]);
    assert.equal(await page.locator(".pdpc-pdf-section").count(), 2);
    assert.deepEqual(
      await page.locator("[data-canonical-page-id]").evaluateAll((nodes) => nodes.map((node) => node.dataset.canonicalPageId)),
      ["scenario", "biomedical"],
    );
    assert.equal(await page.locator(".pdpc-dashboard-pages").count(), 0);
    assert.deepEqual(
      await page.locator(".app-shell").evaluateAll((nodes) => (
        nodes.map((node) => getComputedStyle(node).minHeight)
      )),
      ["0px", "0px"],
    );
    assert.equal(await page.locator(".chart-deferred-placeholder").count(), 0);
    assert.equal(await page.locator(".pdpc-pdf-chart").count(), 4);
    assert.deepEqual(
      await page.locator(".pdpc-dashboard-footer").evaluateAll((nodes) => (
        nodes.map((node) => getComputedStyle(node).display)
      )),
      ["none", "none"],
    );
    assert.match(await page.locator(".pdpc-pdf-chart").first().getAttribute("src"), /^data:image\/png;base64,/);
    await page.setViewportSize({ width: 1000, height: 900 });
    assert.equal(await page.evaluate(() => document.body.getBoundingClientRect().width), 1440);
    assert.deepEqual(
      await page.locator(".layout-grid, .chart-panel").evaluateAll((nodes) => (
        nodes.map((node) => getComputedStyle(node).breakInside)
      )),
      ["auto", "auto", "auto", "avoid"],
    );
    assert.deepEqual(
      await page.locator(".section-header").evaluateAll((nodes) => (
        nodes.map((node) => getComputedStyle(node).breakAfter)
      )),
      ["auto", "avoid"],
    );
    assert.deepEqual(
      await page.locator(".dashboard-section").evaluateAll((nodes) => (
        nodes.map((node) => getComputedStyle(node).display)
      )),
      ["block", "block"],
    );
    assert.deepEqual(
      await page.locator(".page-stack").evaluateAll((nodes) => (
        nodes.map((node) => getComputedStyle(node).display)
      )),
      ["block", "block"],
    );
  } finally {
    await browser.close();
  }
});

test("the release workflow records Cloudflare, offline, and PDF artifacts for a variant", async (t) => {
  const { buildPdpcVariantArtifacts } = await import("../scripts/build-pdpc-deliverables.mjs");
  const staging = await mkdtemp(path.join(os.tmpdir(), "simex-pdpc-pdf-workflow-"));
  t.after(() => rm(staging, { recursive: true, force: true }));
  const cloudflareDir = path.join(staging, "Cloudflare");
  const releaseDir = path.join(cloudflareDir, "biomedical");
  await mkdir(releaseDir, { recursive: true });
  await writeFile(path.join(releaseDir, "index.html"), "cloudflare");

  const result = await buildPdpcVariantArtifacts({
    staging,
    cloudflareDir,
    variant: { id: "biomedical", label: "Biomedical" },
    verifyVariant: async () => ({
      includedPageIds: ["scenario", "biomedical"],
      releaseId: "pdpc-test",
      fileCount: 1,
      runtimeAssetCount: 1,
    }),
    buildSingleFile: async ({ outputFile }) => {
      await mkdir(path.dirname(outputFile), { recursive: true });
      await writeFile(outputFile, "offline");
      return { bytes: 7, embeddedPackageAssets: 0 };
    },
    buildPdf: async ({ outputFile }) => {
      await mkdir(path.dirname(outputFile), { recursive: true });
      await writeFile(outputFile, "%PDF-fixture");
      return { bytes: 12, sectionCount: 2 };
    },
    createZip: async ({ outputFile }) => {
      await writeFile(outputFile, "zip");
      return { entries: ["index.html"] };
    },
  });

  assert.deepEqual(result.deliverables.map(({ path: artifactPath, format }) => [artifactPath, format]), [
    ["PDPC-Biomedical-Cloudflare.zip", "cloudflare-zip"],
    ["Offline/PDPC-Biomedical-Offline.html", "offline-single-html"],
    ["PDF/PDPC-Biomedical.pdf", "pdf"],
  ]);
  assert.equal(await readFile(path.join(staging, "PDF", "PDPC-Biomedical.pdf"), "utf8"), "%PDF-fixture");
  assert.equal(result.validation.pdfSections, 2);
});
