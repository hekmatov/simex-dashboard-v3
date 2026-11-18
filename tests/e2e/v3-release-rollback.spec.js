import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { enterBuildMode, chooseWholeDashboardPackage } from "./support/buildWorkflow.js";
import { enterAuthoredDashboard, openDashboardPage } from "./support/landingWorkflow.js";
import { DASHBOARD_STORAGE_KEY } from "../../src/lib/dashboardMode.js";
import { loadRollbackInputs, startRollbackOrigin, createRollbackBackupDirectory, rollbackSha256, rollbackArtifactIdentity, assertRollbackExportPreserved } from "./support/release-rollback-fixture.mjs";

let inputs;
test.beforeAll(async () => { inputs = await loadRollbackInputs(); });

test("candidate V7 rolls back on the same origin to retained V6 app/package/cache and reopens offline", {
  tag: ["@production-static", "@release-rollback"],
}, async ({ browser }, testInfo) => {
  const server = await startRollbackOrigin(inputs);
  let context;
  const evidence = { origin: server.origin, candidate: rollbackArtifactIdentity(inputs.candidate), previous: rollbackArtifactIdentity(inputs.previous),
    conditions: "One fresh isolated browser context; same loopback origin; actual build security headers; HTTP no-store; real service-worker lifecycle/cache; no storage replacement or cache clearing." };
  let page;
  try {
    context = await browser.newContext({ storageState: { cookies: [], origins: [] }, viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const backupDir = await createRollbackBackupDirectory(inputs);
    page = await context.newPage();
    await page.goto(server.origin);
    await importThroughPassport(page, inputs.candidate.packagePath);
    await expect.poll(() => storedVersion(page)).toBe(7);
    const newer = await exportThroughPassport(page, path.join(backupDir, "preserved-candidate-v7.json"));
    assertExportIdentity(newer.pkg, inputs.candidate);
    evidence.preservedNewerExport = { file: newer.file, sha256: newer.sha256 };
    await testInfo.attach("preserved-candidate-v7", { path: newer.file, contentType: "application/json" });
    await expectWorkerReady(page);
    await page.reload();
    await expectWorkerControl(page);
    await smokeView(page, inputs.candidate);
    await enterBuildMode(page);
    evidence.candidateCache = await expectCacheIdentity(page, inputs.candidate);

    server.selectPrevious();
    await page.reload();
    // Both inspected SW implementations (retained 107c1008 and candidate)
    // wait for old clients; neither skips waiting or claims clients forcibly.
    await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; await registration.update(); });
    await expect.poll(() => page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.waiting?.state ?? null;
    }), { timeout: 120_000, message: "previous application's actual worker reaches waiting state" }).toBe("installed");
    for (const client of context.pages()) await client.close();
    page = await context.newPage();
    await page.goto(server.origin);
    await expectWorkerReady(page);
    await page.reload();
    await expectWorkerControl(page);
    evidence.previousActivatedCache = await expectCacheIdentity(page, inputs.previous);
    await expect(page.locator(".application-recovery")).toBeVisible();
    const savedNewer = await storedText(page);
    expect(JSON.parse(savedNewer).configVersion).toBe(7);
    await page.getByLabel("Choose Dashboard Package", { exact: true }).setInputFiles(newer.file);
    await expect(page.locator(".application-recovery [role='alert']")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Replace the unavailable dashboard?", exact: true })).toHaveCount(0);
    expect(await storedText(page)).toBe(savedNewer);
    evidence.previousRejectedV7 = await page.locator(".application-recovery [role='alert']").innerText();

    // Loading the old source is session-only. Normal package import supplies
    // the supported durable config AND authored-media transaction.
    await page.getByRole("button", { name: "Load Dashboard Source", exact: true }).click();
    await expect(page.locator(".application-recovery")).toHaveCount(0);
    expect(await storedText(page)).toBe(savedNewer);
    await importThroughPassport(page, inputs.previous.packagePath);
    await expect.poll(() => storedVersion(page)).toBe(6);
    await smokeView(page, inputs.previous);
    const compatible = await exportThroughPassport(page, path.join(backupDir, "restored-compatible-v6.json"));
    assertExportIdentity(compatible.pkg, inputs.previous);
    evidence.restoredExport = { file: compatible.file, sha256: compatible.sha256 };
    await testInfo.attach("restored-compatible-v6", { path: compatible.file, contentType: "application/json" });
    evidence.previousCache = await expectCacheIdentity(page, inputs.previous);

    await page.close();
    await context.setOffline(true);
    page = await context.newPage();
    await page.goto(server.origin);
    await expectWorkerControl(page);
    await expect.poll(() => storedVersion(page)).toBe(6);
    await smokeView(page, inputs.previous);
    evidence.offlineImageChecks = await verifyImages(page, inputs.previous);
    await enterBuildMode(page);
    await page.locator('[data-build-command-action="add-chart"]').click();
    await expect(page.locator("#chart-wizard-title")).toBeVisible();
    evidence.offlineCache = await expectCacheIdentity(page, inputs.previous);
    expect(server.errors).toEqual([]);
    expect(rollbackSha256(await readFile(inputs.candidate.packagePath))).toBe(inputs.candidate.packageSha256);
    expect(rollbackSha256(await readFile(inputs.previous.packagePath))).toBe(inputs.previous.packageSha256);
    expect(rollbackSha256(await readFile(newer.file))).toBe(newer.sha256);
    await testInfo.attach("restored-offline-app", { body: await page.screenshot(), contentType: "image/png" });
  } finally {
    try {
      await testInfo.attach("rollback-identities-and-observations", { body: Buffer.from(JSON.stringify(evidence, null, 2)), contentType: "application/json" });
    } finally {
      if (context) await context.close().catch(() => {});
      await server.close();
    }
  }
});

async function importThroughPassport(page, filename) {
  await enterBuildMode(page);
  await page.locator(".dashboard-scenario-trigger").click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport", exact: true });
  const chooser = page.waitForEvent("filechooser");
  await passport.getByRole("button", { name: "Upload Dashboard Package", exact: true }).click();
  await (await chooser).setFiles(filename);
  const review = page.getByRole("dialog", { name: "Review package contents", exact: true });
  await chooseWholeDashboardPackage(review);
  await review.getByRole("button", { name: "Load package", exact: true }).click();
  await expect(review).toBeHidden();
}

async function exportThroughPassport(page, filename) {
  await enterBuildMode(page);
  const passport = page.getByRole("complementary", { name: "Scenario Passport", exact: true });
  if (!await passport.isVisible()) await page.locator(".dashboard-scenario-trigger").click();
  const prompt = page.waitForEvent("dialog").then(async dialog => {
    expect(dialog.type()).toBe("prompt"); expect(dialog.message()).toContain("Name this exported dashboard bundle");
    await dialog.accept(path.basename(filename, ".json"));
  });
  const downloadEvent = page.waitForEvent("download");
  await passport.getByRole("button", { name: "Download Dashboard Package", exact: true }).click();
  await prompt;
  const download = await downloadEvent;
  await download.saveAs(filename);
  const bytes = await readFile(filename);
  if (await passport.isVisible()) await passport.getByRole("button", { name: "Close", exact: true }).click();
  return { file: filename, sha256: rollbackSha256(bytes), pkg: JSON.parse(bytes) };
}

function assertExportIdentity(pkg, artifact) {
  expect(pkg.config.configVersion).toBe(artifact.configVersion);
  assertRollbackExportPreserved(pkg, artifact.pkg);
}

async function smokeView(page, artifact) {
  await enterAuthoredDashboard(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await openDashboardPage(page, artifact.smoke.pageId);
  const footer = page.locator('.dashboard-footer[aria-label="Dashboard information and feedback"]');
  await expect(footer).toHaveCount(1);
  await expect(footer.getByText(`App version ${artifact.appVersion}`, { exact: true })).toBeVisible();
  const panel = page.locator(`[data-canonical-panel-id="${artifact.smoke.chartId}"]`);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.getByRole("heading", { name: artifact.smokeChart.title, exact: true })).toBeVisible();
  await expect(panel.locator("[data-canonical-runtime-ledger]")).toBeVisible();
  await expect.poll(() => panel.locator("canvas").evaluateAll(canvases => canvases.some(canvas => canvas.width > 0 && canvas.height > 0))).toBe(true);
}

async function verifyImages(page, artifact) {
  let checked = 0;
  for (const pageConfig of artifact.pkg.config.pages) for (const section of pageConfig.sections) for (const placement of section.panels) {
    const chart = placement.chart ?? placement;
    if (chart.typeId !== "image") continue;
    await openDashboardPage(page, pageConfig.id);
    const panel = page.locator(`[data-canonical-panel-id="${chart.id}"]`);
    await panel.scrollIntoViewIfNeeded();
    await expect.poll(() => panel.locator(".chart-image-view img").evaluateAll(images => images.some(image => image.complete && image.naturalWidth > 0))).toBe(true);
    checked++;
  }
  return checked;
}

const storedText = page => page.evaluate(key => localStorage.getItem(key), DASHBOARD_STORAGE_KEY);
const storedVersion = async page => JSON.parse(await storedText(page) ?? "null")?.configVersion ?? null;
async function expectWorkerReady(page) { await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state), { timeout: 120_000 }).toBe("activated"); }
async function expectWorkerControl(page) { await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null)).toMatch(/\/service-worker\.js$/); }

async function expectCacheIdentity(page, artifact) {
  const expected = Object.fromEntries(Object.entries(artifact.files).map(([name, file]) => [name, file.sha256]));
  const read = () => page.evaluate(async ({ cacheName, paths }) => {
    const names = (await caches.keys()).filter(name => name.startsWith("simex-dashboard-"));
    if (!names.includes(cacheName)) return { names, hashes: {} };
    const cache = await caches.open(cacheName);
    const hashes = {};
    for (const file of paths) {
      const response = await cache.match(new URL(file, location.origin).href);
      hashes[file] = response ? [...new Uint8Array(await crypto.subtle.digest("SHA-256", await response.arrayBuffer()))].map(value => value.toString(16).padStart(2, "0")).join("") : null;
    }
    return { names, hashes };
  }, { cacheName: artifact.manifest.cacheName, paths: Object.keys(expected) });
  await expect.poll(async () => (await read()).names, { timeout: 120_000 }).toEqual([artifact.manifest.cacheName]);
  const actual = await read();
  expect(actual.hashes).toEqual(expected);
  return actual;
}
