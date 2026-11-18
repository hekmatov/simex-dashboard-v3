import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import vm from "node:vm";
import { prepareDashboardPackageExport } from "../../src/lib/dashboardPackageExport.js";
import { parseDashboardBundle, serializeDashboardBundle } from "../../src/charting/config/dashboardBundleV3.js";
import { materializePdpcPackageAssets } from "../../scripts/lib/pdpc-release.mjs";
import { assertRollbackExportPreserved } from "./support/release-rollback-fixture.mjs";
import { parseCsvText } from "../../src/lib/loadCsv.js";
import { validateDataSourceDescriptor } from "../../src/lib/loadDashboard.js";
import { profileDataset } from "../../src/charting/data/profileDataset.js";
import { deriveCursorPlayback, initializeCursorPlaybackState } from "../../src/charting/time/cursorProviderModel.js";
import { resolveChartRendering } from "../../src/charting/rendering/resolveChartRendering.js";
import { projectCanonicalRuntimeLedger } from "../../src/charting/rendering/canonicalRuntimeLedger.js";

// Actual-build input, supplied by the release operator; this spec never creates a
// smaller dashboard or writes storage. Paths are relative to this declaration.
// SIMEX_VIEW_PERF_INPUTS: { sourceCommit, appVersion, indexSha256, configSha256,
// runtimeManifestSha256, cacheName, packagePath, packageSha256, expectedChartCount,
// deviceDescription, workloadConditions, pages:[{pageId,chartId},...],
// timeScopeValue, timePageId, timeChartId }
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const chartsOn = page => (page.sections ?? []).flatMap(section => section.panels ?? []).map(panel => panel.chart ?? panel);
const p95 = samples => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * 0.95) - 1];
const cpuSnapshot = () => os.cpus().reduce((sum, cpu) => {
  sum.idle += cpu.times.idle;
  sum.total += Object.values(cpu.times).reduce((a, b) => a + b, 0);
  return sum;
}, { idle: 0, total: 0 });
const ram = () => ({ usedPercent: 100 * (1 - os.freemem() / os.totalmem()), freeBytes: os.freemem() });

async function preflight(request) {
  if (!process.env.SIMEX_VIEW_PERF_INPUTS) throw new Error("View performance prerequisite: SIMEX_VIEW_PERF_INPUTS must name actual approved build/package identities");
  const inputPath = path.resolve(process.env.SIMEX_VIEW_PERF_INPUTS);
  const inputs = JSON.parse(await readFile(inputPath, "utf8"));
  expect(inputs.sourceCommit, "full actual source commit").toMatch(/^[a-f0-9]{40}$/);
  for (const key of ["appVersion", "cacheName", "deviceDescription", "workloadConditions", "timeScopeValue", "timePageId", "timeChartId"]) expect(inputs[key], `actual ${key}`).toBeTruthy();
  expect(inputs.timeScopeValue, "approved Storyline clock, excluding unrelated historical gaps").toMatch(/^storyline:.+/);
  const fetched = {};
  let origin;
  const getArtifact = url => request.get(url, { headers: { connection: "close" } });
  for (const [url, key] of [["/", "indexSha256"], ["/config/dashboard.json", "configSha256"], ["/runtime-precache-manifest.js", "runtimeManifestSha256"]]) {
    expect(inputs[key], key).toMatch(/^[a-f0-9]{64}$/);
    const response = await getArtifact(url);
    expect(response.ok(), `actual built ${url}`).toBe(true);
    if (url === "/") origin = new URL(response.url()).origin;
    fetched[url] = await response.body();
    expect(sha256(fetched[url]), `${url} exact served bytes`).toBe(inputs[key]);
  }
  const match = /^\s*self\.__SIMEX_RUNTIME_PRECACHE_MANIFEST__\s*=\s*({[\s\S]*})\s*;?\s*$/.exec(fetched["/runtime-precache-manifest.js"].toString("utf8"));
  expect(match, "generated native runtime manifest").toBeTruthy();
  const manifest = JSON.parse(match[1]);
  expect(manifest.cacheName).toBe(inputs.cacheName);
  expect(manifest.assets).toContain("./config/dashboard.json");
  const packageBytes = await readFile(path.resolve(path.dirname(inputPath), inputs.packagePath));
  expect(sha256(packageBytes), "retained operator package exact bytes").toBe(inputs.packageSha256);
  const pkg = JSON.parse(packageBytes.toString("utf8").replace(/^\uFEFF/, ""));
  expect(pkg.bundleType).toBe("simex-dashboard-bundle");
  const approved = parseDashboardBundle(packageBytes.toString("utf8").replace(/^\uFEFF/, ""), { includeEnvelope: true });
  const config = JSON.parse(fetched["/config/dashboard.json"]);
  const declaredSources = new Set();
  for (const [id, source] of Object.entries(config.dataSources)) {
    if (source.kind !== "csv" && source.kind !== "geojson") continue;
    const relative = validateDataSourceDescriptor(id, source);
    expect(manifest.assets, `offline precache includes ${id}`).toContain(`./${relative}`);
    declaredSources.add(new URL(relative, `${origin}/`).pathname);
  }
  const sourceEvidence = [];
  const readPublic = async relative => {
    const url = new URL(relative, `${origin}/`);
    expect(url.origin, "package dependencies must be served from the actual artifact").toBe(origin);
    const response = await getArtifact(url.href);
    expect(response.ok(), `served package dependency ${url.pathname}`).toBe(true);
    const bytes = await response.body();
    sourceEvidence.push({ path: url.pathname, sha256: sha256(bytes), byteLength: bytes.length });
    return { bytes, mediaType: response.headers()["content-type"]?.split(";")[0] };
  };
  const readers = {
    readText: async relative => (await readPublic(relative)).bytes.toString("utf8"),
    readJson: async relative => JSON.parse((await readPublic(relative)).bytes),
    readImageDataUrl: async relative => { const file = await readPublic(relative); return `data:${file.mediaType};base64,${file.bytes.toString("base64")}`; },
  };
  // The native factory is the only permitted asset representation change. Its
  // exact emitted bytes must exist at the served dependency paths as well.
  const materialized = materializePdpcPackageAssets(approved);
  for (const [relative, bytes] of materialized.files) expect((await readPublic(relative)).bytes, `served authored asset ${relative}`).toEqual(Buffer.from(bytes));
  readers.readAuthoredAsset = async assetId => {
    const relative = [...materialized.files.keys()].find(relative => path.posix.basename(relative).startsWith(`${assetId}.`));
    expect(relative, `native asset dependency ${assetId}`).toBeTruthy();
    return { ...approved.config.assets[assetId], assetId, bytes: (await readPublic(relative)).bytes };
  };
  const expectedConfig = Object.values(config.contentLibrary?.mediaItems ?? {}).some(item => item.current?.kind === "package")
    ? materialized.config : approved.config;
  const expectedExport = await prepareDashboardPackageExport(expectedConfig, readers);
  const servedExport = await prepareDashboardPackageExport(config, readers);
  // Includes every authored binding, Storyline, source row, content/media field
  // and verified payload; only native export timestamps/runtime fields differ.
  assertRollbackExportPreserved(
    serializeDashboardBundle(servedExport.config, { assetPayloads: servedExport.assetPayloads }),
    serializeDashboardBundle(expectedExport.config, { assetPayloads: expectedExport.assetPayloads }),
  );
  const charts = config.pages.flatMap(chartsOn);
  expect(inputs.expectedChartCount, "full selected exercise, including the Scenario panel").toBeGreaterThanOrEqual(37);
  expect(charts).toHaveLength(inputs.expectedChartCount);
  expect(pkg.config.pages.flatMap(chartsOn).map(chart => chart.id).sort()).toEqual(charts.map(chart => chart.id).sort());
  expect(Object.keys(pkg.config.dataSources).sort()).toEqual(Object.keys(config.dataSources).sort());
  expect(inputs.pages).toHaveLength(2);
  expect(new Set(inputs.pages.map(page => page.pageId)).size).toBe(2);
  for (const descriptor of [...inputs.pages, { pageId: inputs.timePageId, chartId: inputs.timeChartId }]) {
    const page = config.pages.find(candidate => candidate.id === descriptor.pageId);
    expect(page, `representative page ${descriptor.pageId}`).toBeTruthy();
    expect(chartsOn(page).length, "representative chart-heavy page").toBeGreaterThanOrEqual(5);
    expect(chartsOn(page).some(chart => chart.id === descriptor.chartId), `real smoke chart ${descriptor.chartId}`).toBe(true);
  }
  const loadedData = {}, profiles = {};
  const profileResponse = await getArtifact("/config/dataset-profiles.json");
  expect(profileResponse.ok()).toBe(true);
  const servedProfiles = await profileResponse.json();
  for (const [id, source] of Object.entries(approved.config.dataSources)) {
    const rows = source.kind === "inline" ? source.rows : source.type === "uploadedCsv" ? parseCsvText(source.csvText, id) : null;
    if (!rows) continue;
    loadedData[id] = rows;
    profiles[id] = profileDataset(rows, source.parsingMetadata ?? {});
    const actual = servedProfiles[id] ?? config.datasetProfiles?.[id];
    if (actual) expect((actual.datasetProfile ?? actual.profile ?? actual).fingerprint, `served profile ${id} belongs to approved rows`).toBe(profiles[id].fingerprint);
  }
  const options = { charts: approved.config.pages.flatMap(chartsOn), pageCharts: chartsOn(approved.config.pages.find(page => page.id === inputs.timePageId)),
    scenes: approved.config.scenes ?? [], groups: approved.config.chronoGroups ?? [], loadedData, profiles,
    activePageId: inputs.timePageId, timezone: approved.config.timezone, exerciseTime: approved.config.scenario?.exerciseTime };
  const initial = initializeCursorPlaybackState(options);
  const state = { ...initial, activeSceneId: inputs.timeScopeValue.slice("storyline:".length),
    cursor: { ...initial.cursor, scope: { kind: "storyline", id: inputs.timeScopeValue.slice("storyline:".length) } } };
  const projection = deriveCursorPlayback({ ...options, state });
  expect(projection.clock.length, "two actual adjacent approved observations").toBeGreaterThanOrEqual(2);
  const chart = options.charts.find(chart => chart.id === inputs.timeChartId);
  const expectedTimes = {};
  for (const epoch of projection.clock.slice(-2)) {
    const at = deriveCursorPlayback({ ...options, state: { ...state, cursor: { ...state.cursor, mode: "at", epochMs: epoch } } });
    const timeContext = at.contexts[chart.id];
    const resolution = resolveChartRendering({ chart, rows: loadedData[chart.sourceId], datasetProfile: profiles[chart.sourceId],
      renderContext: { sources: approved.config.dataSources }, timeContext });
    expect(resolution.status, `approved numerical observation at ${epoch}`).toBe("available");
    const ledger = projectCanonicalRuntimeLedger({ chart, resolution, timeContext });
    expect(ledger.series.some(series => series.values.some(point => Number.isFinite(Array.isArray(point) ? point.at(-1) : point))), "finite numerical measurement, not date-only/empty output").toBe(true);
    expectedTimes[epoch] = ledger.series;
  }
  expect(new Set(Object.values(expectedTimes).map(series => JSON.stringify(series))).size, "two distinguishable numerical outputs").toBe(2);
  return { inputs, manifest, config, inputPath, expectedTimes, sourceEvidence, declaredSources: [...declaredSources],
    chartCount: charts.length, sourceCount: Object.keys(config.dataSources).length };
}

// Runs in the document, before application code. All timing starts are browser
// navigation origin or trusted native events, never controller round-trip time.
function installMeasurement() {
  const state = window.__simexViewPerformance = { samples: [], longTasks: [], errors: [], pending: null, boot: null };
  state.longTaskSupported = PerformanceObserver.supportedEntryTypes.includes("longtask");
  if (state.longTaskSupported) new PerformanceObserver(list => {
    state.longTasks.push(...list.getEntries().map(entry => ({ startTime: entry.startTime, duration: entry.duration, name: entry.name })));
  }).observe({ type: "longtask", buffered: true });
  const visible = node => {
    if (!node || !node.getClientRects().length) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0;
  };
  const visiblePanel = chartId => {
    const storyline = document.querySelector(".time-bar__scope select")?.value.startsWith("storyline:");
    const attribute = storyline ? "data-scene-chart-id" : "data-panel-id";
    // Storyline selection opens its own visible member band above the ordinary
    // page. Never accept the offscreen/deferred duplicate as time feedback.
    return [...document.querySelectorAll(`main[data-canonical-mode="view"] [${attribute}="${CSS.escape(chartId)}"]`)].find(visible) ?? null;
  };
  const panelState = chartId => {
    const panel = visiblePanel(chartId);
    if (!panel) return null;
    const holder = panel.querySelector("[data-canonical-runtime-ledger]");
    if (!holder) return null;
    const ledger = JSON.parse(holder.getAttribute("data-canonical-runtime-ledger"));
    if (ledger.render.resolution !== "available") return null;
    const painted = [...panel.querySelectorAll("canvas, svg, img, [data-portable-qmd-sink]")].some(node => {
      if (!visible(node)) return false;
      if (node instanceof HTMLImageElement) return node.complete && node.naturalWidth > 0;
      if (node.matches("[data-portable-qmd-sink]")) return Boolean(node.textContent.trim());
      return true;
    });
    return painted ? ledger : null;
  };
  const viewReady = () => Boolean(document.querySelector('main[data-canonical-mode="view"]')
    && visible(document.querySelector('[aria-controls="crown-disclosure"]'))
    && visible(document.querySelector('.time-bar__instant')) && document.fonts.status === "loaded"
    && !document.querySelector('[data-static-failure], .dashboard-recovery'));
  state.panelState = panelState;
  const canvasSnapshot = chartId => {
    const canvas = visiblePanel(chartId)?.querySelector("canvas");
    if (!canvas || !visible(canvas)) return null;
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const nonuniform = pixels.some((value, index) => index >= 4 && value !== pixels[index % 4]);
    return nonuniform ? canvas.toDataURL() : null;
  };
  state.arm = descriptor => {
    if (state.pending) throw new Error("Previous native input has not completed");
    state.pending = { ...descriptor, started: null, completed: false,
      beforeCanvas: descriptor.kind === "time" ? canvasSnapshot(descriptor.chartId) : null };
  };
  const start = event => {
    const pending = state.pending;
    if (!event.isTrusted || !pending || pending.started !== null) return;
    const matches = pending.kind === "page"
      ? event.type === "pointerdown" && event.target.closest?.(`[data-dashboard-page-id="${CSS.escape(pending.pageId)}"]`)
      : event.type === "keydown" && event.key === pending.key && event.target.matches?.('input[aria-label="Selected time"]');
    if (matches) {
      // Chromium native Event.timeStamp shares performance.timeOrigin and
      // includes any time the trusted event waited for the main thread.
      pending.started = event.timeStamp;
      pending.handlerDelayMs = performance.now() - event.timeStamp;
    }
  };
  addEventListener("pointerdown", start, true);
  addEventListener("keydown", start, true);
  const afterPaint = (current, condition, finish, retry) => requestAnimationFrame(() => {
    // A second animation frame bounds a rendering opportunity, not physical
    // display/compositor latency. Revalidate so a transient DOM cannot pass.
    requestAnimationFrame(() => {
      if (!current()) return;
      if (condition()) finish();
      else retry();
    });
  });
  const tick = () => {
    const boot = state.boot;
    if (boot && !boot.scheduled && !boot.result) {
      const condition = () => viewReady() && document.querySelector('main[data-canonical-mode="view"]')?.dataset.canonicalPageId === boot.pageId && panelState(boot.chartId);
      if (condition()) {
        boot.scheduled = true;
        afterPaint(() => state.boot === boot && !boot.result, condition,
          () => { boot.result = { durationMs: performance.now(), pageId: boot.pageId, chartId: boot.chartId }; },
          () => { boot.scheduled = false; });
      }
    }
    const pending = state.pending;
    if (pending?.started !== null && pending?.started !== undefined && !pending.scheduled && !pending.completed) {
      const condition = () => {
        if (!viewReady() || document.querySelector('main[data-canonical-mode="view"]')?.dataset.canonicalPageId !== pending.pageId) return false;
        const ledger = panelState(pending.chartId);
        if (!ledger) return false;
        if (pending.kind === "page") return true;
        const range = document.querySelector('input[aria-label="Selected time"]');
        const selected = Number(range?.dataset?.frameEpoch ?? range?.value);
        const expected = pending.expectedTimes?.[selected];
        const timeBar = document.querySelector('.time-bar');
        const label = timeBar?.dataset?.timeLabel ?? document.querySelector('.time-bar__instant')?.textContent;
        if (!(range && selected !== pending.beforeEpochMs && ledger.time.activeEpochMs === selected
          && expected && JSON.stringify(ledger.series) === JSON.stringify(expected)
          && label !== pending.beforeLabel && timeBar?.dataset.timeMode === "at")) return false;
        const canvas = canvasSnapshot(pending.chartId);
        return canvas !== null && canvas !== pending.beforeCanvas;
      };
      if (condition()) {
        pending.scheduled = true;
        afterPaint(() => state.pending === pending && !pending.completed, condition, () => {
          pending.completed = true;
          state.samples.push({ kind: pending.kind, pageId: pending.pageId, chartId: pending.chartId, key: pending.key,
            startTime: pending.started, handlerDelayMs: pending.handlerDelayMs, durationMs: performance.now() - pending.started,
            numericalSeriesMatched: pending.kind === "time" ? true : undefined, canvasChanged: pending.kind === "time" ? true : undefined,
            activeEpochMs: panelState(pending.chartId)?.time.activeEpochMs ?? null });
          state.pending = null;
        }, () => { pending.scheduled = false; });
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } });

test("measurement rejects stale numerical paint and completes each queued sample once", { tag: "@production-static" }, async () => {
  // A deterministic instrumentation regression, not exercise/performance evidence.
  const frames = [], listeners = {}, window = {};
  let now = 1, pixels = "old", epoch = 1000, label = "old", values = [1], scopeValue = "page", ordinaryReads = 0;
  const expectedTimes = { 2000: [{ values: [2] }] };
  const visible = { getClientRects: () => [1], getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, bottom: 100 }) };
  const canvas = { ...visible, width: 2, height: 1, matches: () => false, toDataURL: () => pixels,
    getContext: () => ({ getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 0, 255, 0, 0, 255]) }) }) };
  const ledger = { getAttribute: () => JSON.stringify({ render: { resolution: "available" }, time: { activeEpochMs: epoch }, series: [{ values }] }) };
  const panel = { ...visible, querySelector: selector => selector === "canvas" ? canvas : ledger, querySelectorAll: () => [canvas] };
  const hiddenPanel = { ...panel, getClientRects: () => [] };
  const range = { get value() { return String(epoch); } };
  const main = { dataset: { canonicalPageId: "actual-page" } };
  const document = { fonts: { status: "loaded" }, querySelectorAll: selector => {
    if (selector.includes("data-scene-chart-id")) return [panel];
    if (selector.includes("data-panel-id")) { ordinaryReads++; return [scopeValue === "page" ? panel : hiddenPanel]; }
    return [];
  }, querySelector: selector => {
    if (selector.startsWith("main")) return main;
    if (selector.includes("data-panel-id")) return selector.endsWith(" canvas") ? canvas : panel;
    if (selector.includes("Selected time")) return range;
    if (selector === ".time-bar__scope select") return { value: scopeValue };
    if (selector === ".time-bar__instant") return { ...visible, get textContent() { return label; } };
    if (selector === ".time-bar") return { dataset: { timeMode: "at" } };
    if (selector.includes("crown-disclosure")) return visible;
    return null;
  } };
  vm.runInNewContext(`(${installMeasurement.toString()})()`, { window, document, CSS: { escape: value => value }, innerHeight: 844,
    performance: { now: () => now }, PerformanceObserver: { supportedEntryTypes: [] }, HTMLImageElement: class {},
    addEventListener: (name, listener) => { listeners[name] = listener; }, requestAnimationFrame: callback => frames.push(callback),
  });
  const state = window.__simexViewPerformance;
  const frame = () => { now += 16; for (const callback of frames.splice(0)) callback(); };
  const arm = () => {
    state.arm({ kind: "time", key: "ArrowRight", pageId: "actual-page", chartId: "actual-chart", beforeEpochMs: epoch, beforeLabel: label, expectedTimes });
    listeners.keydown({ type: "keydown", isTrusted: true, key: "ArrowRight", timeStamp: now, target: { matches: () => true } });
  };
  arm(); epoch = 2000; label = "new"; pixels = "new";
  frame(); expect(state.samples).toHaveLength(0); expect(state.pending.scheduled).toBeUndefined(); // wrong numbers
  values = [2]; pixels = "old";
  frame(); expect(state.samples).toHaveLength(0); expect(state.pending.scheduled).toBeUndefined(); // stale canvas
  pixels = "new"; frame(); expect(state.pending.scheduled).toBe(true);
  now += 200; frame(); frame(); frame();
  expect(state.samples).toHaveLength(1); expect(state.pending).toBeNull();
  // A callback queued for a superseded sample may never complete another one.
  epoch = 1000; label = "old"; pixels = "old"; values = [1]; arm();
  epoch = 2000; label = "new"; pixels = "new"; values = [2]; frame(); frame();
  state.pending = null; frame(); expect(state.samples).toHaveLength(1);
  const oldBoot = state.boot = { pageId: "actual-page", chartId: "actual-chart" };
  frame(); frame(); const currentBoot = state.boot = { pageId: "actual-page", chartId: "actual-chart" };
  frame(); frame(); frame();
  expect(oldBoot.result).toBeUndefined(); expect(currentBoot.result).toBeTruthy();
  // The selected Storyline owns the visible member. Its ordinary duplicate is
  // offscreen/deferred, and must not be needed for numerical/pixel completion.
  scopeValue = "storyline:approved-storyline"; ordinaryReads = 0;
  epoch = 1000; label = "old"; pixels = "old"; values = [1]; arm();
  epoch = 2000; label = "new"; pixels = "new"; values = [2];
  frame(); frame(); frame();
  expect(state.samples).toHaveLength(2); expect(state.pending).toBeNull();
  expect(ordinaryReads).toBe(0);
});

test("actual built View meets mobile warm-offline and native feedback budgets", { tag: "@production-static" }, async ({ context, page, request, browser }, testInfo) => {
  test.setTimeout(180_000);
  const evidence = { limitations: ["390×844 viewport on the actual runner; no physical-phone or minimum-device claim.",
    "Native input to matching visible DOM/chart state followed by a double-rAF rendering opportunity; physical display/compositor latency is not measured.",
    "Long-task entries report main-thread tasks over 50ms, a conservative potential input-blocking observation; tasks on workers are outside this observer.",
    "Numerical completion requires approved-engine series equality and changed nonuniform canvas pixels. Canvas readback adds measurement overhead; raster images stay in memory and are not attached.",
    "Twenty samples per action class provide an observed nearest-rank p95, not a population guarantee."], conditions: {
    platform: os.platform(), release: os.release(), architecture: os.arch(), node: process.version, browser: browser.version(),
    cpuModel: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalRamBytes: os.totalmem(), baseline: ram(), cpuThrottling: "none requested",
    viewport: { width: 390, height: 844 }, network: "online warm-up, then context offline; no network throttling requested",
  }, requests: [], documents: [] };
  const startCpu = cpuSnapshot();
  let peakRam = evidence.conditions.baseline.usedPercent;
  const monitor = setInterval(() => { peakRam = Math.max(peakRam, ram().usedPercent); }, 250);
  const observe = document => {
    document.on("request", request => {
      evidence.requests.push({ path: new URL(request.url()).pathname, type: request.resourceType(),
        workerOwned: Boolean(request.serviceWorker()), offline: evidence.offline === true });
    });
  };
  observe(page);
  await context.addInitScript(installMeasurement);
  let activePage = page;
  const collect = async (document, phase) => {
    evidence.documents.push({ phase, ...await document.evaluate(() => {
      const state = window.__simexViewPerformance;
      return { url: location.href, timeOrigin: performance.timeOrigin, samples: state.samples, longTasks: state.longTasks,
        longTaskSupported: state.longTaskSupported, boot: state.boot, pending: state.pending && {
          kind: state.pending.kind, chartId: state.pending.chartId, pageId: state.pending.pageId,
          started: state.pending.started, completed: state.pending.completed,
        },
        scripts: performance.getEntriesByType("resource").filter(entry => entry.initiatorType === "script").map(entry => new URL(entry.name).pathname),
        navigator: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory, online: navigator.onLine },
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio }, serviceWorker: navigator.serviceWorker.controller?.scriptURL,
      };
    }) });
  };
  try {
    const { inputs, manifest, config, chartCount, sourceCount, expectedTimes, sourceEvidence, declaredSources } = await preflight(request);
    Object.assign(evidence, { inputs, chartCount, sourceCount, sourceEvidence, runtimeAssets: manifest.assets,
      expectedNumericalSeries: Object.fromEntries(Object.entries(expectedTimes).map(([epoch, series]) => [epoch, { sha256: sha256(JSON.stringify(series)), seriesCount: series.length }])) });
    await page.goto("/?mode=view");
    await expect(page.locator('main[data-canonical-mode="view"]')).toBeVisible();
    await expect(page.locator('.dashboard-footer[aria-label="Dashboard information and feedback"]')).toContainText(`App version ${inputs.appVersion}`);
    const goPage = async (document, descriptor, measured) => {
      const button = document.locator(`.crown-compact-pages [data-dashboard-page-id="${descriptor.pageId}"]`);
      await expect(button).toBeVisible();
      if (measured) await document.evaluate(descriptor => window.__simexViewPerformance.arm({ kind: "page", ...descriptor }), descriptor);
      await button.click();
      await expect(document.locator('main[data-canonical-mode="view"]')).toHaveAttribute("data-canonical-page-id", descriptor.pageId);
      await document.waitForFunction(chartId => window.__simexViewPerformance.panelState(chartId),
        descriptor.chartId, { timeout: 10_000 });
      if (measured) await document.waitForFunction(() => window.__simexViewPerformance.pending === null);
    };
    const prepareTimeChart = async (document, range) => {
      const canvas = document.locator(`[data-scene-chart-id="${inputs.timeChartId}"] canvas`).first();
      await expect(canvas).toBeVisible();
      // The open phone scrubber and Storyline heading can place the chart
      // below the fold. Arrange both surfaces before accepting native input.
      await canvas.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
      await expect(canvas).toBeInViewport();
      await expect(range).toBeInViewport();
      await range.evaluate(node => node.focus({ preventScroll: true }));
      await document.waitForFunction(chartId => window.__simexViewPerformance.panelState(chartId),
        inputs.timeChartId, { timeout: 10_000 });
    };
    for (const descriptor of inputs.pages) await goPage(page, descriptor, false);
    // Validate the real clock/control/adjacent observation boundary before the
    // longer offline sampling loop. These public actions are warm-up, not samples.
    await goPage(page, { pageId: inputs.timePageId, chartId: inputs.timeChartId }, false);
    await page.locator('.time-bar__instant').click();
    const scope = page.getByRole("combobox", { name: "Apply time to", exact: true });
    await scope.selectOption(inputs.timeScopeValue);
    const onlineRange = page.getByRole("slider", { name: "Selected time", exact: true });
    await expect(onlineRange).toBeEnabled();
    await onlineRange.press("End");
    await prepareTimeChart(page, onlineRange);
    for (const key of ["ArrowLeft", "ArrowRight"]) {
      const before = await onlineRange.evaluate(range => Number(range.dataset.frameEpoch ?? range.value));
      await onlineRange.press(key);
      await page.waitForFunction(({ chartId, before, expectedTimes }) => {
        const range = document.querySelector('input[aria-label="Selected time"]');
        const ledger = window.__simexViewPerformance.panelState(chartId);
        const selected = Number(range.dataset.frameEpoch ?? range.value);
        return selected !== before && ledger?.time.activeEpochMs === selected
          && expectedTimes[selected] && JSON.stringify(ledger.series) === JSON.stringify(expectedTimes[selected]);
      }, { chartId: inputs.timeChartId, before, expectedTimes }, { timeout: 10_000 });
    }
    await scope.selectOption("page");
    await page.locator('.time-bar__live').click();
    await page.locator('.time-bar__instant').click();
    await page.evaluate(async expectedCache => {
      await navigator.serviceWorker.ready;
      // This app deliberately does not clients.claim(). The first page need
      // not be controlled; the actual warm reopen below must be controlled.
      if (!(await caches.keys()).includes(expectedCache)) throw new Error("Expected current build cache is absent");
      await document.fonts.ready;
    }, inputs.cacheName);
    const initialPage = config.pages[0], initialChart = chartsOn(initialPage)[0];
    expect(initialChart, "real initial authored View panel").toBeTruthy();
    await collect(page, "online warm-up");
    await page.close();
    await context.setOffline(true);
    evidence.offline = true;
    activePage = await context.newPage();
    observe(activePage);
    await activePage.addInitScript(({ pageId, chartId }) => {
      // Ordering among page and context init scripts is not guaranteed.
      const arm = () => {
        if (window.__simexViewPerformance) window.__simexViewPerformance.boot = { pageId, chartId };
        else setTimeout(arm, 0);
      };
      arm();
    }, { pageId: initialPage.id, chartId: initialChart.id });
    await activePage.goto("/?mode=view");
    await activePage.waitForFunction(() => window.__simexViewPerformance.boot?.result);
    evidence.warmOffline = await activePage.evaluate(async expectedCache => ({
      ...window.__simexViewPerformance.boot.result, cacheNames: await caches.keys(),
      expectedCachePresent: (await caches.keys()).includes(expectedCache), controlled: Boolean(navigator.serviceWorker.controller), online: navigator.onLine,
      cachedPaths: (await (await caches.open(expectedCache)).keys()).map(request => new URL(request.url).pathname),
    }), inputs.cacheName);
    expect(evidence.warmOffline.controlled).toBe(true);
    expect(evidence.warmOffline.online).toBe(false);
    expect(evidence.warmOffline.expectedCachePresent).toBe(true);
    const cachedPaths = new Set(evidence.warmOffline.cachedPaths);
    expect(declaredSources.filter(pathname => !cachedPaths.has(pathname)), "all declared local sources cached after one visit").toEqual([]);
    // Start from the second page so all twenty measured clicks change pages.
    await goPage(activePage, inputs.pages[1], false);
    for (let index = 0; index < 20; index++) await goPage(activePage, inputs.pages[index % 2], true);
    await goPage(activePage, { pageId: inputs.timePageId, chartId: inputs.timeChartId }, false);
    await activePage.locator('.time-bar__instant').click();
    await activePage.getByRole("combobox", { name: "Apply time to", exact: true }).selectOption(inputs.timeScopeValue);
    const range = activePage.getByRole("slider", { name: "Selected time", exact: true });
    await expect(range).toBeEnabled();
    // End is a public keyboard control. The approved scope must include two
    // adjacent observed frames for this chart; a gap fails instead of timing UI alone.
    await range.press("End");
    await prepareTimeChart(activePage, range);
    await activePage.waitForFunction(chartId => {
      const range = document.querySelector('input[aria-label="Selected time"]');
      return window.__simexViewPerformance.panelState(chartId)?.time.activeEpochMs === Number(range?.dataset.frameEpoch ?? range?.value);
    }, inputs.timeChartId);
    for (let index = 0; index < 20; index++) {
      const key = index % 2 ? "ArrowRight" : "ArrowLeft";
      await activePage.evaluate(({ key, pageId, chartId, expectedTimes }) => {
        const range = document.querySelector('input[aria-label="Selected time"]');
        const bar = document.querySelector('.time-bar');
        window.__simexViewPerformance.arm({ kind: "time", key, pageId, chartId, expectedTimes,
          beforeEpochMs: Number(range.dataset.frameEpoch ?? range.value),
          beforeLabel: bar.dataset.timeLabel ?? bar.querySelector('.time-bar__instant').textContent,
        });
      }, { key, pageId: inputs.timePageId, chartId: inputs.timeChartId, expectedTimes });
      await range.press(key);
      await activePage.waitForFunction(() => window.__simexViewPerformance.pending === null);
    }
    await collect(activePage, "warm offline View and measured interactions");
    const measured = evidence.documents.at(-1);
    expect(measured.longTaskSupported, "native long-task measurement is required").toBe(true);
    const pages = measured.samples.filter(sample => sample.kind === "page");
    const times = measured.samples.filter(sample => sample.kind === "time");
    expect(pages).toHaveLength(20); expect(times).toHaveLength(20);
    evidence.summary = { warmOfflineMs: evidence.warmOffline.durationMs, pageP95Ms: p95(pages.map(sample => sample.durationMs)),
      timeP95Ms: p95(times.map(sample => sample.durationMs)), maxMainThreadTaskMs: Math.max(0, ...evidence.documents.flatMap(document => document.longTasks).map(task => task.duration)) };
    const authoringChunk = /\/(?:BuildWorkspace|PresentWorkspace|AudienceDisplay|ChartWizardV3)-[^/]+\.js$/;
    const documentScripts = evidence.documents.flatMap(document => document.scripts);
    expect(documentScripts.filter(url => authoringChunk.test(url)), "View must not import authoring/presentation UI; SW precache is distinct").toEqual([]);
    expect(evidence.requests.filter(entry => !entry.workerOwned && entry.type === "script" && authoringChunk.test(entry.path)), "no document-owned authoring chunk requests").toEqual([]);
    expect(evidence.summary.warmOfflineMs, "usable authored View after real warm offline reopen").toBeLessThanOrEqual(3000);
    expect(evidence.summary.pageP95Ms, "native page feedback p95").toBeLessThanOrEqual(200);
    expect(evidence.summary.timeP95Ms, "native time feedback p95 including matching chart state").toBeLessThanOrEqual(200);
    expect(evidence.summary.maxMainThreadTaskMs, "no main-thread task blocks input for more than one second").toBeLessThanOrEqual(1000);
  } catch (error) {
    evidence.failure = { message: error.message, stack: error.stack };
    if (!activePage.isClosed()) await collect(activePage, "failure state").catch(collectionError => { evidence.collectionError = collectionError.message; });
    throw error;
  } finally {
    clearInterval(monitor);
    const endCpu = cpuSnapshot(), total = endCpu.total - startCpu.total;
    evidence.conditions.after = ram();
    evidence.conditions.peakRamPercent = peakRam;
    evidence.conditions.aggregateCpuBusyPercent = total ? 100 * (1 - (endCpu.idle - startCpu.idle) / total) : null;
    await testInfo.attach("actual-view-performance", { body: JSON.stringify(evidence, null, 2), contentType: "application/json" });
  }
});
