import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_VERSION } from "../../src/lib/appVersion.js";
import { APPEARANCE_STORAGE_KEY } from "../../src/theme/dashboardTheme.js";
import { resolvePdpcArtifactRoots } from "../../playwright.pdpc.config.js";
import { parseCsvText } from "../../src/lib/loadCsv.js";
import { resolveChartRendering } from "../../src/charting/rendering/resolveChartRendering.js";
import { projectCanonicalRuntimeLedger } from "../../src/charting/rendering/canonicalRuntimeLedger.js";
import { initializeCursorPlaybackState, deriveCursorPlayback } from "../../src/charting/time/cursorProviderModel.js";
import { resolveChartTimeEvidence } from "../../src/charting/time/chartTimeEvidence.js";

const { deliverableRoot, releaseRoot } = resolvePdpcArtifactRoots();
// Evidence contains metadata only. Avoid native traces/videos/screenshots that
// could otherwise retain chart frames or DOM/storage values on a failed run.
test.use({ trace: "off", screenshot: "off", video: "off" });
const variants = [{ id: "biomedical", pageId: "biomedical" }, { id: "socioeconomic", pageId: "socio_economic" }];
const plotTypes = new Set(["line", "area", "bar", "horizontalBar", "groupedBar", "stackedBar", "pie", "scatter", "heatmap", "mixed"]);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const readJson = async file => JSON.parse(await readFile(file, "utf8"));
const numericalCount = series => series.reduce((count, entry) => count + entry.values.filter(point => {
  const value = Array.isArray(point) ? point.at(-1) : point;
  return typeof value === "number" && Number.isFinite(value);
}).length, 0);

function artifactProvenance() {
  const git = args => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const harnessCommit = git(["rev-parse", "HEAD"]).trim();
  const pin = process.env.SIMEX_ARTIFACT_SOURCE_COMMIT;
  if (pin === undefined) return { sourceCommit: harnessCommit, harnessCommit };
  if (!/^[a-f0-9]{40}$/i.test(pin)) throw new Error("Artifact provenance prerequisite: SIMEX_ARTIFACT_SOURCE_COMMIT must be a full 40-character commit SHA.");
  const sourceCommit = pin.toLowerCase();
  try {
    if (git(["cat-file", "-t", sourceCommit]).trim() !== "commit") throw new Error("Source pin is not a commit object.");
    git(["merge-base", "--is-ancestor", sourceCommit, harnessCommit]);
  } catch (cause) {
    throw new Error("Artifact provenance prerequisite: pinned source must be an existing commit and an ancestor of the actual harness HEAD.", { cause });
  }
  if (git(["status", "--porcelain=v1", "--untracked-files=no"]).trim()) {
    throw new Error("Artifact provenance prerequisite: an explicitly pinned run requires a clean tracked worktree.");
  }
  const changedPaths = git(["diff", "--name-only", "--no-renames", "-z", sourceCommit, harnessCommit, "--"])
    .split("\0").filter(Boolean);
  const unsupported = changedPaths.filter(file => !file.startsWith("tests/") && !file.startsWith("docs/"));
  if (unsupported.length) throw new Error(`Artifact provenance prerequisite: source-to-harness changes outside tests/ or docs/: ${unsupported.join(", ")}`);
  return { sourceCommit, harnessCommit };
}

async function artifactFor(variant) {
  // Establish immutable application provenance before any imported Node engine
  // computes expectations. A later test/docs commit does not relabel artifacts.
  const { sourceCommit, harnessCommit } = artifactProvenance();
  // Missing real artifacts or ownership manifests fail preflight. No fake
  // inputs, fallback fixture, test.skip, or source-dev renderer can satisfy it.
  const deliverables = await readJson(path.join(deliverableRoot, "pdpc-deliverables.json"));
  const record = deliverables.deliverables?.find(entry => entry.format === "offline-single-html" && entry.variant === variant.id);
  expect(record, `standalone ${variant.id} manifest record`).toBeTruthy();
  const file = path.resolve(deliverableRoot, record.path);
  const relativeFile = path.relative(path.join(deliverableRoot, "Offline"), file);
  expect(relativeFile.startsWith("..") || path.isAbsolute(relativeFile)).toBe(false);
  expect(path.extname(file)).toBe(".html");
  const bytes = await readFile(file);
  expect(bytes.byteLength).toBe(record.byteLength);
  expect(sha256(bytes)).toBe(record.sha256);
  const manifest = await readJson(path.join(releaseRoot, variant.id, "release-manifest.json"));
  const configBytes = await readFile(path.join(releaseRoot, variant.id, "config", "dashboard.json"));
  const config = JSON.parse(configBytes);
  expect(manifest.sourceCommit).toBe(sourceCommit);
  expect(manifest.releaseId).toBe(deliverables.releaseId);
  expect(manifest.inputSha256).toBe(deliverables.sourceBundleSha256);
  expect(manifest.variant).toBe(variant.id);
  expect(manifest.includedPageIds).toEqual(config.pages.map(page => page.id));
  const discipline = config.pages.find(page => page.id === variant.pageId);
  expect(discipline, `${variant.id} actual discipline page`).toBeTruthy();
  const profiles = await readJson(path.join(releaseRoot, variant.id, "config", "dataset-profiles.json"));
  const loadedData = {};
  for (const [id, source] of Object.entries(config.dataSources)) {
    if (["csv", "inline"].includes(source.kind) || (source.kind === "dataset" && source.type === "uploadedCsv")) {
      loadedData[id] = await rowsFor(source, id, variant.id);
    }
  }
  const pageCharts = discipline.sections.flatMap(section => section.panels ?? []).map(panel => panel.chart ?? panel);
  const options = { charts: config.pages.flatMap(page => page.sections.flatMap(section => section.panels ?? []).map(panel => panel.chart ?? panel)),
    pageCharts, scenes: config.scenes ?? [], loadedData, profiles, activePageId: variant.pageId,
    timezone: config.timezone, exerciseTime: config.scenario?.exerciseTime };
  const projection = deriveCursorPlayback({ ...options, state: initializeCursorPlaybackState(options) });
  const candidates = discipline.sections.flatMap(section => section.panels ?? [])
    .map(panel => panel.chart ?? panel).filter(panel => plotTypes.has(panel.typeId));
  let chart, rows, datasetProfile, timeContext, timeEvidence;
  const unavailable = [];
  for (const candidate of candidates) {
    const source = config.dataSources[candidate.sourceId];
    expect(source).toBeTruthy();
    const profile = profiles[candidate.sourceId];
    expect(profile, "actual generated source profile").toBeTruthy();
    const candidateRows = loadedData[candidate.sourceId];
    expect(candidateRows, "actual loaded numerical rows").toBeTruthy();
    const context = projection.contexts[candidate.id];
    const viewTimeContext = context && { ...context, showClosestOnExactMiss: true };
    const resolution = resolveChartRendering({ chart: candidate, rows: candidateRows,
      datasetProfile: profile, renderContext: { sources: config.dataSources }, timeContext: viewTimeContext });
    const evidence = resolveChartTimeEvidence({ chart: candidate, profile, prepared: resolution.prepared, timeContext: viewTimeContext });
    if (resolution.status === "available") {
      const ledger = projectCanonicalRuntimeLedger({ chart: candidate, resolution, timeContext: viewTimeContext });
      expect(numericalCount(ledger.series), "actual finite measurements").toBeGreaterThan(0);
      chart = candidate; rows = candidateRows; datasetProfile = profile;
      timeContext = viewTimeContext; timeEvidence = evidence;
      break;
    }
    // Original snapshot filters and exact-matching gaps can be unavailable at
    // this page's actual Live time. Prove their state without inventing data.
    expect(resolution.status).toBe("unavailable");
    expect(["empty", "ready"]).toContain(resolution.prepared?.status);
    unavailable.push({ chartId: candidate.id, sourceId: candidate.sourceId,
      filters: candidate.transformations.filters, reason: evidence?.kind === "missing" ? evidence.label : resolution.message, timeControlled: Boolean(context) });
  }
  expect(chart, `${variant.id} released numerical chart in actual package`).toBeTruthy();
  return { file, config, chart, rows, datasetProfile, timeContext, timeEvidence, unavailable, evidence: {
    variant: variant.id, file: path.basename(file), fileBytes: bytes.byteLength, fileSha256: record.sha256,
    sourceCommit: manifest.sourceCommit, harnessCommit, releaseId: manifest.releaseId,
    appVersion: APP_VERSION, manifestVersion: manifest.manifestVersion, configVersion: config.configVersion,
    inputSha256: manifest.inputSha256, bundleType: manifest.bundleType, bundleVersion: manifest.bundleVersion,
    configSha256: sha256(configBytes), pageIds: config.pages.map(page => page.id),
    observedChartId: chart.id, observedChartType: chart.typeId, liveEpochMs: projection.activeEpochMs,
    unavailableSnapshots: unavailable,
  } };
}

async function rowsFor(source, sourceId, variantId) {
  let rows;
  if (source.kind === "csv") {
    const sourceFile = path.resolve(releaseRoot, variantId, source.path);
    const sourceRelative = path.relative(path.join(releaseRoot, variantId), sourceFile);
    expect(sourceRelative.startsWith("..") || path.isAbsolute(sourceRelative)).toBe(false);
    rows = parseCsvText(await readFile(sourceFile, "utf8"), sourceId);
  } else if (source.kind === "dataset") {
    expect(source.type).toBe("uploadedCsv");
    rows = parseCsvText(source.csvText, sourceId);
  } else {
    expect(source.kind).toBe("inline");
    rows = source.rows;
  }
  expect(rows.length, "generated numerical source rows").toBeGreaterThan(0);
  return rows;
}

async function storageMetadata(page) {
  return page.evaluate(async () => {
    const keys = storage => { try { return Object.keys(storage).sort(); } catch { return null; } };
    let databases = null;
    try { databases = (await indexedDB.databases()).map(database => database.name).sort(); } catch { /* metadata unavailable */ }
    return { localStorageKeys: keys(localStorage), sessionStorageKeys: keys(sessionStorage), indexedDbNames: databases };
  });
}

for (const variant of variants) {
  test(`real ${variant.id} standalone HTML first-launches offline with Light and retains saved appearance`, async ({ browser }, testInfo) => {
    const artifact = await artifactFor(variant);
    // Fresh context is the first launch. file:// is never primed by an online
    // visit or an HTTP server; OS-dark proves release Light initialization.
    const context = await browser.newContext({ offline: true, colorScheme: "dark", viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    const requests = [], errors = [], requestMetadata = new Map();
    let phase = "first-launch";
    page.on("pageerror", error => errors.push({ name: error.name }));
    page.on("request", request => {
      const url = new URL(request.url());
      // Never attach data URI payloads, query values, storage values or frames.
      const metadata = { phase, scheme: url.protocol, resourceType: request.resourceType(), method: request.method(), ...(url.protocol === "file:" ? { file: path.basename(url.pathname) } : {}) };
      requestMetadata.set(request, metadata);
      requests.push(metadata);
    });
    page.on("response", response => { const metadata = requestMetadata.get(response.request()); if (metadata) metadata.status = response.status(); });
    page.on("requestfailed", request => { const metadata = requestMetadata.get(request); if (metadata) metadata.failed = true; });
    const observed = { scope: "two standalone first launches, numerical chart/logo/fonts, appearance retention and inline CSP only", offline: true, requests, errors };
    try {
      await page.goto(pathToFileURL(artifact.file).href, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".app-frame")).toHaveAttribute("data-resolved-appearance", "light");
      expect(await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches)).toBe(true);
      await expect(page.locator('meta[name="simex-release-id"]')).toHaveAttribute("content", artifact.evidence.releaseId);
      const notice = page.getByLabel("Exercise disclaimer");
      await expect(notice.locator("[data-exercise-notice]")).toHaveText("Fictional scenario · Exercise use only");
      await expect(notice.locator("[data-app-version]")).toHaveText(`App version ${APP_VERSION}`);
      const logo = page.getByRole("img", { name: "Pandemic and Disaster Preparedness Center (PDPC)", exact: true });
      await expect(logo).toBeVisible();
      await expect.poll(() => logo.evaluate(img => img.complete && img.naturalWidth > 0 && img.src.startsWith("data:image/"))).toBe(true);
      const fonts = await page.evaluate(async () => {
        await document.fonts.load('400 16px "PDPC Avenir"');
        await document.fonts.ready;
        return [...document.fonts].filter(face => face.family.replaceAll('"', "") === "PDPC Avenir").map(face => ({ family: face.family, status: face.status }));
      });
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts.every(face => face.status === "loaded")).toBe(true);
      observed.fonts = fonts;
      await page.locator(`[data-dashboard-page-id="${variant.pageId}"]`).click();
      await expect(page.locator(`[data-canonical-page-id="${variant.pageId}"]`)).toBeVisible();
      for (const snapshot of artifact.unavailable) {
        const unavailablePanel = page.locator(`[data-canonical-panel-id="${snapshot.chartId}"]`);
        await unavailablePanel.scrollIntoViewIfNeeded();
        const feedback = unavailablePanel.getByRole(snapshot.timeControlled ? "note" : "status");
        await expect(feedback).toBeVisible();
        await expect(feedback).toContainText(snapshot.reason);
        await expect(feedback).toHaveAttribute("aria-live", snapshot.timeControlled ? "off" : "polite");
        await expect(unavailablePanel.locator("[data-chart-source-citation]")).toHaveCount(1);
        const ledgers = await unavailablePanel.locator("[data-canonical-runtime-ledger]").evaluateAll(nodes =>
          nodes.map(node => JSON.parse(node.getAttribute("data-canonical-runtime-ledger"))));
        for (const ledger of ledgers) {
          expect(ledger.render.resolution).toBe("unavailable");
          expect(numericalCount(ledger.series)).toBe(0);
        }
      }
      const panelId = artifact.chart.id.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
      const panel = page.locator(`[data-canonical-panel-id="${panelId}"]`);
      await panel.scrollIntoViewIfNeeded();
      await expect(panel).toBeVisible();
      const ledgerElement = panel.locator("[data-canonical-runtime-ledger]").first();
      await expect(ledgerElement).toBeVisible();
      await expect.poll(async () => JSON.parse(await ledgerElement.getAttribute("data-canonical-runtime-ledger")).render.status).toBe("ready");
      const ledger = JSON.parse(await ledgerElement.getAttribute("data-canonical-runtime-ledger"));
      expect(ledger.panelId).toBe(artifact.chart.id);
      expect(ledger.render).toMatchObject({ kind: "echarts", resolution: "available", status: "ready", typeId: artifact.chart.typeId });
      const { timeContext, timeEvidence } = artifact;
      expect(ledger.time.activeEpochMs ?? null).toBe(timeContext?.activeEpochMs ?? null);
      if (timeEvidence?.kind === "nonconcurrent") {
        await expect(panel.locator('[data-chart-time-fallback="true"] [data-chart-time-kind="nonconcurrent"]')).toHaveText(timeEvidence.label);
      }
      const expectedResolution = resolveChartRendering({ chart: artifact.chart, rows: artifact.rows,
        datasetProfile: artifact.datasetProfile, renderContext: { sources: artifact.config.dataSources }, timeContext });
      expect(expectedResolution.status).toBe("available");
      const expectedLedger = projectCanonicalRuntimeLedger({ chart: artifact.chart, resolution: expectedResolution, timeContext });
      expect(numericalCount(expectedLedger.series)).toBeGreaterThan(0);
      expect(numericalCount(ledger.series)).toBeGreaterThan(0);
      const expectedSeriesSha256 = sha256(JSON.stringify(expectedLedger.series));
      const renderedSeriesSha256 = sha256(JSON.stringify(ledger.series));
      expect(renderedSeriesSha256).toBe(expectedSeriesSha256);
      observed.numericalSeries = { expectedSeriesSha256, renderedSeriesSha256,
        seriesCount: ledger.series.length, finiteMeasurementCount: numericalCount(ledger.series) };
      await expect.poll(() => panel.locator("canvas").first().evaluate(canvas => {
        const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 4; i < pixels.length; i += 4) {
          if (pixels[i] !== pixels[0] || pixels[i + 1] !== pixels[1] || pixels[i + 2] !== pixels[2] || pixels[i + 3] !== pixels[3]) return true;
        }
        return false;
      })).toBe(true);
      observed.firstLaunchStorage = await storageMetadata(page);
      const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
      expect(policy).toMatch(/script-src[^;]*'sha256-/);
      await page.evaluate(() => {
        window.__offlineCspDirectives = [];
        document.addEventListener("securitypolicyviolation", event => {
          if (event.blockedURI === "inline") window.__offlineCspDirectives.push(event.effectiveDirective);
        });
        const script = document.createElement("script");
        script.textContent = "window.__offlineUnauthorizedInline = true";
        document.body.append(script);
      });
      await expect.poll(() => page.evaluate(() => window.__offlineCspDirectives.some(value => value.startsWith("script-src")))).toBe(true);
      expect(await page.evaluate(() => window.__offlineUnauthorizedInline === true)).toBe(false);
      observed.blockedCspDirectives = await page.evaluate(() => window.__offlineCspDirectives);
      // Release outputs have no appearance editor. Seed a valid existing saved
      // choice through its production key, then verify actual reload behavior.
      await page.evaluate(key => localStorage.setItem(key, "dark"), APPEARANCE_STORAGE_KEY);
      phase = "saved-choice-reload";
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator(".app-frame")).toHaveAttribute("data-appearance-preference", "dark");
      await expect(page.locator(".app-frame")).toHaveAttribute("data-resolved-appearance", "dark");
      observed.afterReloadStorage = await storageMetadata(page);
      expect(requests.filter(request => ["http:", "https:", "ws:", "wss:"].includes(request.scheme))).toEqual([]);
      expect(errors).toEqual([]);
    } finally {
      await testInfo.attach(`${variant.id}-offline-identity-and-observations`, { body: JSON.stringify({ ...artifact.evidence, observed }, null, 2), contentType: "application/json" });
      await context.close();
    }
  });
}
