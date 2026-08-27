import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const verifierModule = await import("../scripts/verify-v3-static-build.mjs")
  .catch(() => null);
const { packageFlashDrive } = await import("../scripts/package-flashdrive.mjs");

const EXPECTED_QUORUM_CONTRACT_HASH =
  "a876d0b83c9f40ea5179723b9c4304f8873b393142e4a790711af80ed363662c";

test("static-build verifier is available", () => {
  assert.equal(typeof verifierModule?.verifyV3StaticBuild, "function");
});

test("accepts a relative, fully local V3 build with hashed runtime assets", async (t) => {
  assert.ok(verifierModule);
  const fixture = await staticFixture(t);

  const result = await verifierModule.verifyV3StaticBuild({
    rootDir: fixture.rootDir,
    distDir: fixture.distDir,
    runtimeBoundaryInventory: frozenInventory(),
  });

  assert.deepEqual(result.entrypoints, ["index.html", "source-viewer.html"]);
  assert.deepEqual(result.hashedRuntimeAssets, [
    "assets/dashboard-Ab12cd34.css",
    "assets/dashboard-Xy98za76.js",
  ]);
  assert.equal(result.quorumContractHash, EXPECTED_QUORUM_CONTRACT_HASH);
});

test("rejects remote runtime URLs with the exact built file", async (t) => {
  assert.ok(verifierModule);
  const fixture = await staticFixture(t, {
    indexExtra: '<script src="https://cdn.example.invalid/runtime.js"></script>',
  });

  await assert.rejects(
    verifierModule.verifyV3StaticBuild({
      rootDir: fixture.rootDir,
      distDir: fixture.distDir,
      runtimeBoundaryInventory: frozenInventory(),
    }),
    /index\.html: remote runtime URL https:\/\/cdn\.example\.invalid\/runtime\.js/,
  );
});

test("rejects remote dependencies in referenced built JavaScript and CSS", async (t) => {
  assert.ok(verifierModule);
  const scriptFixture = await staticFixture(t);
  await writeFile(
    path.join(scriptFixture.distDir, "assets/dashboard-Xy98za76.js"),
    'import("./chunk-Qq11ww22.js");',
  );
  await writeFile(
    path.join(scriptFixture.distDir, "assets/chunk-Qq11ww22.js"),
    'fetch("https://cdn.example.invalid/runtime.json");',
  );
  await assert.rejects(
    verifierModule.verifyV3StaticBuild({
      rootDir: scriptFixture.rootDir,
      distDir: scriptFixture.distDir,
      runtimeBoundaryInventory: frozenInventory(),
    }),
    /assets\/chunk-Qq11ww22\.js: remote runtime URL https:\/\/cdn\.example\.invalid\/runtime\.json/,
  );

  const styleFixture = await staticFixture(t);
  await writeFile(
    path.join(styleFixture.distDir, "assets/dashboard-Ab12cd34.css"),
    '@import url("https://cdn.example.invalid/runtime.css");',
  );
  await assert.rejects(
    verifierModule.verifyV3StaticBuild({
      rootDir: styleFixture.rootDir,
      distDir: styleFixture.distDir,
      runtimeBoundaryInventory: frozenInventory(),
    }),
    /assets\/dashboard-Ab12cd34\.css: remote runtime URL https:\/\/cdn\.example\.invalid\/runtime\.css/,
  );
});

test("rejects root-absolute launch URLs and missing local targets", async (t) => {
  assert.ok(verifierModule);
  const absolute = await staticFixture(t, {
    scriptPath: "/assets/dashboard-Xy98za76.js",
  });
  await assert.rejects(
    verifierModule.verifyV3StaticBuild({
      rootDir: absolute.rootDir,
      distDir: absolute.distDir,
      runtimeBoundaryInventory: frozenInventory(),
    }),
    /index\.html: launch URL must be relative: \/assets\/dashboard-Xy98za76\.js/,
  );

  const missing = await staticFixture(t, {
    scriptPath: "./assets/missing-Xy98za76.js",
  });
  await assert.rejects(
    verifierModule.verifyV3StaticBuild({
      rootDir: missing.rootDir,
      distDir: missing.distDir,
      runtimeBoundaryInventory: frozenInventory(),
    }),
    /index\.html: local runtime target is missing: assets\/missing-Xy98za76\.js/,
  );
});

test("requires the complete packaged V3 shell and local runtime assets", async (t) => {
  assert.ok(verifierModule);
  const fixture = await staticFixture(t, { omit: "config/dataset-profiles.json" });

  await assert.rejects(
    verifierModule.verifyV3StaticBuild({
      rootDir: fixture.rootDir,
      distDir: fixture.distDir,
      runtimeBoundaryInventory: frozenInventory(),
    }),
    /required package asset is missing: config\/dataset-profiles\.json/,
  );
});

test("rejects an altered frozen Quorum protocol/schema boundary", async (t) => {
  assert.ok(verifierModule);
  const fixture = await staticFixture(t);

  await assert.rejects(
    verifierModule.verifyV3StaticBuild({
      rootDir: fixture.rootDir,
      distDir: fixture.distDir,
      runtimeBoundaryInventory: {
        ...frozenInventory(),
        quorumContractHash: "0".repeat(64),
      },
    }),
    new RegExp(`Quorum protocol/schema hash mismatch: expected ${EXPECTED_QUORUM_CONTRACT_HASH}`),
  );
});

test("service worker precaches the V3 shell and built hashed assets", async () => {
  const harness = await serviceWorkerHarness({
    indexHtml: '<link rel="stylesheet" href="./assets/dashboard-Ab12cd34.css"><script type="module" src="./assets/dashboard-Xy98za76.js"></script>',
  });

  await harness.dispatchInstall();

  assert.deepEqual(harness.precached.toSorted(), [
    "./",
    "./assets/dashboard-Ab12cd34.css",
    "./assets/dashboard-Xy98za76.js",
    "./assets/pdpc-mark.png",
    "./assets/pwa-icon.svg",
    "./config/dashboard.json",
    "./config/dataset-profiles.json",
    "./data/data-sources.generated.json",
    "./index.html",
    "./integration/quorum-chart-catalogue.json",
    "./manifest.webmanifest",
    "./portable-dashboard-data.js",
    "./service-worker.js",
    "./source-viewer.html",
    "./vendor/three.min.js",
    "./vendor/vanta.net.min.js",
  ]);
});

test("service worker never substitutes index HTML for a failed non-navigation request", async () => {
  const harness = await serviceWorkerHarness({ offline: true });
  const request = new Request("http://127.0.0.1:4180/data/missing.csv");

  const response = await harness.dispatchFetch(request);

  assert.equal(response.status, 503);
  assert.match(await response.text(), /Offline asset unavailable/);
  assert.doesNotMatch(response.headers.get("content-type") ?? "", /text\/html/);
});

test("service worker keeps each successful navigation under its own cache key", async () => {
  const harness = await serviceWorkerHarness();

  await harness.dispatchFetch({
    method: "GET",
    mode: "navigate",
    url: "http://127.0.0.1:4180/source-viewer.html",
  });

  assert.deepEqual(harness.cachedWrites, [
    "http://127.0.0.1:4180/source-viewer.html",
  ]);
});

test("flash-drive package uses the V3 identity and local-origin launcher", async (t) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "simex-v3-package-"));
  t.after(() => import("node:fs/promises").then(({ rm }) => rm(rootDir, {
    recursive: true,
    force: true,
  })));
  await mkdir(path.join(rootDir, "dist"), { recursive: true });
  await writeFile(path.join(rootDir, "dist", "index.html"), "V3");

  const { releaseDir } = await packageFlashDrive({ rootDir });
  const startHere = await readFile(path.join(releaseDir, "START_HERE.md"), "utf8");

  assert.equal(path.basename(releaseDir), "SimEx Dashboard V3 Flashdrive");
  assert.match(startHere, /^# SimEx Dashboard V3 Flash Drive Package/m);
  assert.ok(
    startHere.indexOf("START_DASHBOARD.bat") < startHere.indexOf("index.html"),
    "local-origin launcher must be the primary launch instruction",
  );
});

async function staticFixture(t, {
  indexExtra = "",
  omit = null,
  scriptPath = "./assets/dashboard-Xy98za76.js",
} = {}) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "simex-v3-static-"));
  const distDir = path.join(rootDir, "dist");
  t.after(() => import("node:fs/promises").then(({ rm }) => rm(rootDir, {
    recursive: true,
    force: true,
  })));
  const files = {
    "index.html": `<!doctype html><link rel="manifest" href="./manifest.webmanifest"><link rel="stylesheet" href="./assets/dashboard-Ab12cd34.css"><script src="./vendor/three.min.js"></script><script src="./portable-dashboard-data.js"></script><script type="module" src="${scriptPath}"></script>${indexExtra}`,
    "source-viewer.html": '<script type="module" src="./assets/dashboard-Xy98za76.js"></script>',
    "assets/dashboard-Ab12cd34.css": ".root{display:block}",
    "assets/dashboard-Xy98za76.js": "export const dashboard = 3;",
    "assets/pdpc-mark.png": "png",
    "assets/pwa-icon.svg": "<svg></svg>",
    "manifest.webmanifest": '{"start_url":"./","scope":"./"}',
    "service-worker.js": "self.addEventListener('fetch',()=>{});",
    "portable-dashboard-data.js": "window.__SIMEX_PORTABLE_DATA__={};",
    "config/dashboard.json": "{}",
    "config/dataset-profiles.json": "{}",
    "data/data-sources.generated.json": "{}",
    "integration/quorum-chart-catalogue.json": "{}",
    "vendor/three.min.js": "",
    "vendor/vanta.net.min.js": "",
  };
  for (const [filePath, contents] of Object.entries(files)) {
    if (filePath === omit) continue;
    const destination = path.join(distDir, filePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }
  return { rootDir, distDir };
}

function frozenInventory() {
  return {
    remoteRuntimeDependencies: [],
    quorumContractHash: EXPECTED_QUORUM_CONTRACT_HASH,
  };
}

async function serviceWorkerHarness({ indexHtml = "", offline = false } = {}) {
  const source = await readFile("public/service-worker.js", "utf8");
  const listeners = new Map();
  const precached = [];
  const cachedWrites = [];
  const indexResponse = new Response(indexHtml, {
    status: 200,
    headers: { "content-type": "text/html" },
  });
  const cache = {
    async addAll(urls) {
      precached.push(...urls);
    },
    async match(value) {
      const url = typeof value === "string" ? value : value.url;
      return /(?:^|\/)index\.html$/.test(url) ? indexResponse.clone() : undefined;
    },
    async put(value) {
      cachedWrites.push(typeof value === "string" ? value : value.url);
    },
  };
  const caches = {
    async open() { return cache; },
    async keys() { return []; },
    async delete() { return true; },
    async match(value) { return cache.match(value); },
  };
  const self = {
    location: new URL("http://127.0.0.1:4180/service-worker.js"),
    clients: { async claim() {} },
    skipWaiting() {},
    addEventListener(type, listener) { listeners.set(type, listener); },
  };
  const fetch = async (value) => {
    if (offline) throw new TypeError("offline");
    const url = typeof value === "string" ? value : value.url;
    if (/index\.html$/.test(url)) return indexResponse.clone();
    return new Response("asset", { status: 200 });
  };
  vm.runInNewContext(source, {
    self,
    caches,
    fetch,
    URL,
    Response,
    Request,
    Promise,
    console,
  }, { filename: "public/service-worker.js" });
  return {
    precached,
    cachedWrites,
    async dispatchInstall() {
      let pending;
      listeners.get("install")({ waitUntil(value) { pending = value; } });
      await pending;
    },
    async dispatchFetch(request) {
      let pending;
      listeners.get("fetch")({ request, respondWith(value) { pending = value; } });
      return pending;
    },
  };
}
