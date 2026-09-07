import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

import { chromium } from "@playwright/test";

const VARIANT_PAGE_IDS = Object.freeze({
  biomedical: Object.freeze(["scenario", "biomedical"]),
  socioeconomic: Object.freeze(["scenario", "socio_economic"]),
});

const PDF_STYLES = `
@page { size: A4 landscape; margin: 8mm 8mm 13mm; }
html { background: #fff !important; margin: 0 !important; padding: 0 !important; }
body { background: #fff !important; margin: 0 !important; padding: 0 !important; width: 1440px !important; }
body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
#vanta-background { display: none !important; }
.pdpc-pdf-section { break-after: page; page-break-after: always; }
.pdpc-pdf-section:last-child { break-after: auto; page-break-after: auto; }
.pdpc-pdf-section > .app-frame { min-height: 0 !important; }
.pdpc-pdf-section .app-shell { min-height: 0 !important; }
.pdpc-pdf-section .pdpc-dashboard-pages { display: none !important; }
.pdpc-pdf-section .pdpc-dashboard-footer { display: none !important; }
.pdpc-pdf-section .page-stack,
.pdpc-pdf-section .dashboard-section { display: block !important; }
.pdpc-pdf-section .dashboard-section + .dashboard-section { margin-top: 18px; }
.pdpc-pdf-section .section-header {
  break-after: avoid;
  margin-bottom: 12px;
  page-break-after: avoid;
}
.pdpc-pdf-section[data-pdf-section-index="1"] .chart-panel {
  break-inside: avoid;
  page-break-inside: avoid;
}
.pdpc-pdf-section .pdpc-dashboard-header {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
}
.pdpc-pdf-section .pdpc-dashboard-logo { grid-column: 2 !important; }
.pdpc-pdf-chart { display: block; height: auto; max-width: 100%; }
`;

const PDF_FOOTER_TEMPLATE = `
<div style="box-sizing:border-box;color:#263a43;display:flex;font-family:Arial,sans-serif;font-size:7px;justify-content:space-between;padding:0 8mm;width:100%;">
  <span><strong>SimEx Dashboard V3</strong>&nbsp;&nbsp;<a href="https://simex-dashboard-v3.pages.dev/" style="color:#263a43;text-decoration:underline;">Build your own dashboard</a></span>
  <span>Developed by Hekmat Alrouh</span>
</div>`;

export async function buildPdpcPdf({ releaseDir, outputFile, variant }) {
  const pageIds = pageIdsForVariant(variant);
  const resolvedRelease = path.resolve(releaseDir);
  const resolvedOutput = path.resolve(outputFile);
  const server = await startStaticServer(resolvedRelease);
  const browser = await chromium.launch({ headless: true });
  const runtimeIssues = [];
  try {
    const context = await browser.newContext({
      colorScheme: "light",
      serviceWorkers: "block",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => runtimeIssues.push(`pageerror:${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeIssues.push(`console:${message.text()}`);
    });
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    page.on("request", (request) => {
      if (!request.url().startsWith(baseUrl) && !/^(?:data|blob):/.test(request.url())) {
        runtimeIssues.push(`remote:${request.url()}`);
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 400) runtimeIssues.push(`response:${response.status()}:${response.url()}`);
    });

    await page.goto(`${baseUrl}/?mode=view`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByLabel("Exercise disclaimer").waitFor({ timeout: 15_000 });
    const preparation = await preparePdpcPdfDocument({ page, variant });
    if (runtimeIssues.length > 0) {
      throw new Error(`PDPC PDF rendering encountered runtime issues: ${runtimeIssues.join(" | ")}`);
    }
    await mkdir(path.dirname(resolvedOutput), { recursive: true });
    await page.pdf({
      path: resolvedOutput,
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: PDF_FOOTER_TEMPLATE,
      scale: 0.62,
    });
    const output = await stat(resolvedOutput);
    return Object.freeze({
      variant,
      outputFile: resolvedOutput,
      bytes: output.size,
      pageIds: [...pageIds],
      sectionCount: preparation.sectionCount,
    });
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

export async function preparePdpcPdfDocument({ page, variant }) {
  const pageIds = pageIdsForVariant(variant);
  const snapshots = [];
  for (const pageId of pageIds) {
    const active = page.locator(`[data-canonical-page-id="${pageId}"]`);
    if (await active.count() === 0) {
      await page.locator(`[data-dashboard-page-id="${pageId}"]`).click();
    }
    await page.locator(`[data-canonical-page-id="${pageId}"]`).waitFor({
      state: "visible",
      timeout: 60_000,
    });
    await activateDeferredCharts(page);
    await waitForRenderableAssets(page);
    snapshots.push(await page.evaluate(() => {
      const source = document.querySelector(".app-frame");
      if (!source) throw new Error("PDPC PDF export could not find the application frame.");
      const clone = source.cloneNode(true);
      const sourceCanvases = [...source.querySelectorAll("canvas")];
      const clonedCanvases = [...clone.querySelectorAll("canvas")];
      if (sourceCanvases.length !== clonedCanvases.length) {
        throw new Error("PDPC PDF export could not pair chart canvases.");
      }
      for (let index = 0; index < sourceCanvases.length; index += 1) {
        const canvas = sourceCanvases[index];
        const image = document.createElement("img");
        image.className = "pdpc-pdf-chart";
        image.alt = canvas.getAttribute("aria-label") ?? "Dashboard chart";
        image.src = canvas.toDataURL("image/png");
        image.width = canvas.width;
        image.height = canvas.height;
        image.style.width = `${canvas.getBoundingClientRect().width}px`;
        clonedCanvases[index].replaceWith(image);
      }
      clone.querySelectorAll(".pdpc-dashboard-pages").forEach((navigation) => navigation.remove());
      return clone.outerHTML;
    }));
  }

  await page.evaluate(({ html, styles }) => {
    const style = document.createElement("style");
    style.dataset.pdpcPdfStyles = "true";
    style.textContent = styles;
    const sections = html.map((snapshot, index) => {
      const section = document.createElement("section");
      section.className = "pdpc-pdf-section";
      section.dataset.pdfSectionIndex = String(index);
      section.innerHTML = snapshot;
      return section;
    });
    document.body.replaceChildren(style, ...sections);
  }, { html: snapshots, styles: PDF_STYLES });
  await waitForRenderableAssets(page);
  return Object.freeze({ pageIds: [...pageIds], sectionCount: snapshots.length });
}

async function activateDeferredCharts(page) {
  await page.evaluate(async () => {
    const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const step = Math.max(400, Math.floor(window.innerHeight * 0.7));
    const bottom = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    for (let position = 0; position < bottom; position += step) {
      window.scrollTo(0, position);
      await settle();
    }
    window.scrollTo(0, bottom);
    await settle();
  });
  await page.waitForFunction(
    () => document.querySelectorAll(".chart-deferred-placeholder").length === 0,
    null,
    { timeout: 60_000 },
  );
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function waitForRenderableAssets(page) {
  await page.evaluate(async () => {
    await document.fonts?.ready;
    const images = [...document.images];
    await Promise.all(images.map((image) => (
      image.complete
        ? Promise.resolve()
        : new Promise((resolve, reject) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", reject, { once: true });
        })
    )));
    if (images.some((image) => image.naturalWidth === 0)) {
      throw new Error("PDPC PDF export found an unavailable image.");
    }
  });
}

function pageIdsForVariant(variant) {
  const pageIds = VARIANT_PAGE_IDS[variant];
  if (!pageIds) throw new Error(`Unsupported PDPC PDF variant "${String(variant)}".`);
  return pageIds;
}

async function startStaticServer(root) {
  const server = createServer(async (request, response) => {
    let relative;
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
    } catch {
      response.writeHead(400).end();
      return;
    }
    const filePath = path.resolve(root, relative);
    const contained = path.relative(root, filePath);
    if (contained.startsWith("..") || path.isAbsolute(contained)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const information = await stat(filePath);
      if (!information.isFile()) throw Object.assign(new Error("Not a file"), { code: "ENOENT" });
      response.writeHead(200, {
        "content-type": contentType(filePath),
        "cache-control": "no-store",
      });
      createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

function contentType(filePath) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".otf": "font/otf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ttf": "font/ttf",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  })[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}
