import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { serializeDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { sha256HexSync } from "../src/static-content/assets/assetPayloadEnvelope.js";
import { buildPortableData } from "../scripts/build-portable-data.mjs";
import { packageFlashDrive } from "../scripts/package-flashdrive.mjs";
import { preparePromotedDashboard } from "../scripts/promote-dashboard-bundle.mjs";
import { enterAuthoredDashboard } from "./e2e/support/landingWorkflow.js";
import { imageFixtureBytes } from "./fixtures/imageFixtureBytes.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGE_TITLE = "PS04 portable audience image";
const IMAGE_ALT = "PS04 offline readiness marker";
const PNG = Buffer.from(imageFixtureBytes("image/png"));

test("PS-04 copied Windows flash package launches offline main and separate Audience", {
  skip: process.platform !== "win32",
  timeout: 180_000,
}, async (t) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "simex-ps04-launch-"));
  const fixtureRoot = path.join(temporaryRoot, "fixture-root");
  const generatedPackage = path.join(temporaryRoot, "generated-package");
  const copiedPackage = path.join(temporaryRoot, "copied-flash-package");
  let launcher = null;
  let browser = null;
  let serverUrl = null;
  assertSafeTemporaryTarget(temporaryRoot);
  try {
    await cp(path.join(ROOT, "dist"), path.join(fixtureRoot, "dist"), { recursive: true });
    await cp(path.join(ROOT, "public"), path.join(fixtureRoot, "public"), { recursive: true });
    const promotedPath = await installPromotedImageFixture(fixtureRoot);
    await buildPortableData({ rootDir: fixtureRoot });
    await cp(
      path.join(fixtureRoot, "public", "portable-dashboard-data.js"),
      path.join(fixtureRoot, "dist", "portable-dashboard-data.js"),
    );
    await cp(
      path.join(fixtureRoot, "public", "config", "dashboard.json"),
      path.join(fixtureRoot, "dist", "config", "dashboard.json"),
    );
    await mkdir(path.dirname(path.join(fixtureRoot, "dist", promotedPath)), { recursive: true });
    await cp(
      path.join(fixtureRoot, "public", promotedPath),
      path.join(fixtureRoot, "dist", promotedPath),
    );
    await packageFlashDrive({ rootDir: fixtureRoot, releaseDir: generatedPackage });
    await cp(generatedPackage, copiedPackage, { recursive: true });

    launcher = launchPortableServer(copiedPackage);
    const launch = await waitForLauncher(launcher);
    serverUrl = launch.url;
    t.diagnostic(`copied package ${copiedPackage}`);
    t.diagnostic(`launcher ${serverUrl} pid=${launcher.pid}`);

    const imageResponse = await fetch(new URL(promotedPath, serverUrl));
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), PNG);
    const containment = await rawHttpStatus(serverUrl, "/%2e%2e/START_HERE.md");
    assert.equal([403, 404].includes(containment), true);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const externalRequests = [];
    context.on("request", (request) => {
      const url = new URL(request.url());
      if (url.hostname !== "127.0.0.1" && !["blob:", "data:"].includes(url.protocol)) {
        externalRequests.push(request.url());
      }
    });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "127.0.0.1" || ["blob:", "data:"].includes(url.protocol)) {
        await route.continue();
      } else {
        await route.abort("internetdisconnected");
      }
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(serverUrl, { waitUntil: "domcontentloaded" });
    await enterAuthoredDashboard(page);
    await page.locator(".dashboard-command-page-scroller")
      .getByRole("button", { name: "Biomedical", exact: true }).click();
    const runtimeDiagnostic = await page.evaluate(async ({ title }) => {
      const served = await fetch("./config/dashboard.json").then((response) => response.json());
      const panels = served.pages.flatMap((pageItem) => pageItem.sections)
        .flatMap((section) => section.panels)
        .map((placement) => placement.chart ?? placement);
      return {
        servedPanel: panels.some((panel) => panel.title === title),
        bodyHasTitle: document.body.innerText.includes(title),
        failures: [...document.querySelectorAll("[data-static-failure]")].map((node) => ({
          code: node.getAttribute("data-static-failure"),
          text: node.textContent.trim(),
        })),
      };
    }, { title: IMAGE_TITLE });
    t.diagnostic(`runtime ${JSON.stringify(runtimeDiagnostic)}`);
    t.diagnostic(`page errors ${JSON.stringify(pageErrors)}`);
    assert.equal(runtimeDiagnostic.servedPanel, true);
    const imagePanel = page.locator('[data-panel-id="ps04_image_panel"]');
    await imagePanel.waitFor({ state: "attached", timeout: 20_000 });
    await imagePanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1_000);
    const panelDiagnostic = await imagePanel.evaluate((panel) => ({
      src: panel.querySelector("img")?.getAttribute("src") ?? null,
      failure: panel.querySelector("[data-static-failure]")?.getAttribute("data-static-failure") ?? null,
      rect: panel.getBoundingClientRect().toJSON(),
    }));
    t.diagnostic(`panel ${JSON.stringify(panelDiagnostic)}`);
    const mainImage = page.locator(`img[alt="${IMAGE_ALT}"]`);
    await assertVisible(mainImage);
    assert.equal(new URL(await mainImage.getAttribute("src"), serverUrl).pathname, `/${promotedPath}`);

    await waitForServiceWorker(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await enterAuthoredDashboard(page);
    await page.locator(".dashboard-command-page-scroller")
      .getByRole("button", { name: "Biomedical", exact: true }).click();
    await imagePanel.waitFor({ state: "attached", timeout: 20_000 });
    await imagePanel.scrollIntoViewIfNeeded();
    await assertVisible(page.locator(`img[alt="${IMAGE_ALT}"]`));
    await context.setOffline(true);
    await page.getByLabel("Dashboard mode")
      .getByRole("button", { name: "Present", exact: true }).click();
    const choice = page.locator('[data-presentable-item-id="ps04_image_panel"]');
    await choice.getByRole("checkbox").check();
    const audiencePromise = context.waitForEvent("page");
    await page.getByRole("button", { name: "Open new audience session" }).click();
    const audience = await audiencePromise;
    await audience.waitForLoadState("domcontentloaded");
    await assertVisible(audience.locator(`img[alt="${IMAGE_ALT}"]`));
    assert.equal(await audience.locator('[data-presentation-item-kind="image"]').count(), 1);
    assert.equal(await audience.locator("button, .chart-image-actions, .static-content-state__actions").count(), 0);
    const geometry = await audience.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth
        && document.documentElement.scrollHeight <= document.documentElement.clientHeight,
    }));
    assert.deepEqual(geometry, { width: 1366, height: 768, fits: true });
    assert.deepEqual(externalRequests, []);
    t.diagnostic(`offline Audience ${geometry.width}x${geometry.height}; MIME=image/png; traversal=${containment}`);
    await context.close();
  } finally {
    await browser?.close();
    if (launcher && launcher.exitCode === null && launcher.signalCode === null) {
      launcher.kill();
      await Promise.race([once(launcher, "exit"), delay(10_000)]);
    }
    if (serverUrl) await assertServerStopped(serverUrl);
    assertSafeTemporaryTarget(temporaryRoot);
    await rm(temporaryRoot, { recursive: true, force: true });
    await assert.rejects(access(temporaryRoot));
    t.diagnostic(`stopped launcher and removed ${temporaryRoot}`);
  }
});

async function installPromotedImageFixture(rootDir) {
  const configPath = path.join(rootDir, "public", "config", "dashboard.json");
  let config = JSON.parse(await readFile(configPath, "utf8"));
  config.datasetProfiles = JSON.parse(await readFile(
    path.join(rootDir, "public", "config", "dataset-profiles.json"),
    "utf8",
  ));
  config = serializeDashboardBundle(config, { now: null }).config;
  const sha256 = sha256HexSync(PNG);
  const assetId = `asset-${sha256}`;
  config.assets = {
    ...(config.assets ?? {}),
    [assetId]: {
      mediaType: "image/png",
      byteLength: PNG.byteLength,
      width: 2,
      height: 3,
      sha256,
      storageState: "durable",
    },
  };
  config.dataSources.ps04_image_source = {
    kind: "staticImage",
    sourceVersion: 2,
    mediaId: "media-ps04-image",
    alt: IMAGE_ALT,
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
  config.contentLibrary.mediaItems["media-ps04-image"] = {
    mediaId: "media-ps04-image",
    revision: 1,
    current: { kind: "asset", assetId },
    displayName: IMAGE_TITLE,
    defaultDescription: IMAGE_ALT,
    origin: "uploaded",
    health: "ready",
    dimensions: { width: 2, height: 3 },
    byteLength: PNG.byteLength,
    mediaType: "image/png",
  };
  const biomedical = config.pages.find(({ id }) => id === "biomedical");
  biomedical.sections[0].panels.push({
    configVersion: 3,
    id: "ps04_image_panel",
    typeId: "image",
    title: IMAGE_TITLE,
    description: "",
    sourceId: "ps04_image_source",
    roles: {},
    transformations: {
      filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap",
    },
    presentation: { title: { align: "left" }, collection: null },
    interaction: { zoom: { enabled: true }, timeSync: null },
    layout: { size: "standard" },
  });
  const bundle = serializeDashboardBundle(config, {
    now: null,
    assetPayloads: {
      [assetId]: {
        base64: PNG.toString("base64"),
        byteLength: PNG.byteLength,
        mediaType: "image/png",
        sha256,
      },
    },
  });
  const promoted = preparePromotedDashboard(JSON.stringify(bundle));
  await writeFile(configPath, `${JSON.stringify(promoted.config, null, 2)}\n`);
  for (const file of promoted.files) {
    const outputPath = path.join(rootDir, "public", file.relativePath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, file.contents);
  }
  return promoted.config.contentLibrary.mediaItems["media-ps04-image"].current.path;
}

function launchPortableServer(cwd) {
  return spawn("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", path.join(cwd, "start-dashboard-server.ps1"),
  ], {
    cwd,
    env: { ...process.env, SIMEX_PORTABLE_NO_BROWSER: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

async function waitForLauncher(child) {
  let output = "";
  const result = new Promise((resolve, reject) => {
    const consume = (bytes) => {
      output += bytes.toString();
      const match = /running at (http:\/\/127\.0\.0\.1:\d+\/)/i.exec(output);
      if (match) resolve({ url: match[1], output });
    };
    child.stdout.on("data", consume);
    child.stderr.on("data", consume);
    child.once("exit", (code) => reject(new Error(`portable launcher exited ${code}: ${output}`)));
  });
  return Promise.race([
    result,
    delay(15_000).then(() => { throw new Error(`portable launcher timed out: ${output}`); }),
  ]);
}

async function rawHttpStatus(serverUrl, requestPath) {
  const url = new URL(serverUrl);
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: url.hostname,
      port: url.port,
      path: requestPath,
      method: "GET",
    }, (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode));
    });
    request.once("error", reject);
    request.end();
  });
}

async function waitForServiceWorker(page) {
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.state === "activated";
  }, null, { timeout: 15_000 });
}

async function assertVisible(locator) {
  await locator.waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await locator.isVisible(), true);
}

async function assertServerStopped(serverUrl) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await fetch(serverUrl);
    } catch {
      return;
    }
    await delay(100);
  }
  assert.fail(`portable server remained reachable at ${serverUrl}`);
}

function assertSafeTemporaryTarget(target) {
  const resolved = path.resolve(target);
  const relative = path.relative(path.resolve(tmpdir()), resolved);
  assert.equal(relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative), false);
  assert.match(path.basename(resolved), /^simex-ps04-launch-/);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
