import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadDashboardConfig } from "../src/lib/loadDashboard.js";
import { serializeDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { buildPresentableItemIndex } from "../src/static-content/staticPanelCapabilities.js";

const SERVER_PATH = fileURLToPath(
  new URL("./e2e/mock-companion-server.mjs", import.meta.url),
);
const FIXTURE_URL = new URL("./fixtures/fable-m0-dashboard.json", import.meta.url);

test("representative fixture has ready temporal/static charts, editable content and eligible Present items", async () => {
  const config = JSON.parse(await readFile(FIXTURE_URL, "utf8"));
  assert.equal(config.id, "fable-m0-dashboard");
  assert.doesNotThrow(() => serializeDashboardBundle(config, { now: null }));
  const portableSources = {};
  for (const [id, source] of Object.entries(config.dataSources)) {
    if (source.kind === "csv") {
      portableSources[id] = { kind: "csv", text: await readFile(new URL(`../public/${source.path}`, import.meta.url), "utf8") };
    }
  }
  const runtime = await loadDashboardConfig(config, config.datasetProfiles, portableSources);
  const charts = runtime.pages.flatMap((page) => page.sections.flatMap((section) => section.panels.map((panel) => panel.chart ?? panel)));
  assert.deepEqual(charts.map((chart) => [chart.id, chart.configVersion, chart.typeId]), [
    ["m0-cases", 3, "line"], ["m0-sectors", 3, "pie"], ["m0-briefing", 3, "freeText"], ["m0-image", 3, "image"],
  ]);
  for (const chart of charts.slice(0, 2)) {
    const prepared = prepareChartData({ chart, rows: runtime.loadedData[chart.sourceId], datasetProfile: runtime.datasetProfiles[chart.sourceId] });
    assert.equal(prepared.status, "ready", chart.id);
    assert.ok(prepared.meta.renderableMarkCount > 1, chart.id);
    assert.equal(runtime.dataSourceStates[chart.sourceId].status, "ready");
  }
  const dates = runtime.datasetProfiles[charts[0].sourceId].columns.find(({ name }) => name === "Date").temporal.values;
  assert.ok(new Set(dates).size > 1);
  assert.equal(charts[1].interaction.timeSync, null);
  assert.equal(config.dataSources[charts[2].sourceId].kind, "staticText");
  assert.match(config.dataSources[charts[2].sourceId].qmd, /Eldoria confirmed its first 2 cases/);
  const image = config.contentLibrary.mediaItems[config.dataSources[charts[3].sourceId].mediaId];
  assert.equal(image.current.kind, "package");
  assert.equal((await readFile(new URL(`../public/${image.current.path}`, import.meta.url))).byteLength, image.byteLength);
  assert.deepEqual([...buildPresentableItemIndex(runtime).keys()], ["m0-cases", "m0-sectors", "m0-image"]);
});

test("fixture selection is explicit, cookie-isolated and resettable without replacing shipped config", async (t) => {
  const { appUrl } = await startHarness(t, { mode: "source", appPort: 43_181, controlPort: 43_182, staleDist: false });
  const configUrl = `${appUrl}/config/dashboard.json`;
  assert.equal((await fetch(configUrl).then((response) => response.json())).id, "shipped-harness-fixture");
  const select = await fetch(`${appUrl}/__test__/dashboard`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fixture: "fable-m0" }),
  });
  assert.equal(select.status, 200);
  const cookie = select.headers.get("set-cookie").split(";")[0];
  const selected = await fetch(configUrl, { headers: { cookie } });
  assert.equal(selected.headers.get("cache-control"), "no-store");
  const fixture = await selected.json();
  assert.equal(fixture.id, "fable-m0-dashboard");
  assert.deepEqual(fixture, JSON.parse(await readFile(FIXTURE_URL, "utf8")));
  const profiles = await fetch(`${appUrl}/config/dataset-profiles.json`, { headers: { cookie } }).then((response) => response.json());
  assert.deepEqual(profiles, fixture.datasetProfiles);
  assert.equal((await fetch(configUrl).then((response) => response.json())).id, "shipped-harness-fixture");
  fixture.title = "Local mutation";
  assert.equal((await fetch(configUrl, { headers: { cookie } }).then((response) => response.json())).title, "Fable M0 fixture");
  const invalid = await fetch(`${appUrl}/__test__/dashboard`, {
    method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ fixture: "../unknown" }),
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers.get("set-cookie"), null);
  const reset = await fetch(`${appUrl}/__test__/dashboard`, {
    method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ fixture: "shipped" }),
  });
  assert.equal(reset.status, 200);
  assert.match(reset.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await fetch(configUrl).then((response) => response.json())).id, "shipped-harness-fixture");
});

test("historical fixture catalogue and companion handshake stay paired while shipped requests remain untouched", async (t) => {
  const { appUrl } = await startHarness(t, { mode: "source", appPort: 43_183, controlPort: 43_184, staleDist: false });
  const headers = { cookie: "simex-e2e-fixture=legacy-contract" };
  const dashboard = await fetch(`${appUrl}/config/dashboard.json`, { headers }).then((r) => r.json());
  assert.ok(dashboard.pages.flatMap((p) => p.sections.flatMap((s) => s.panels)).some(({ id }) => id === "chart-line-mtgz6v76"));
  const catalogue = await fetch(`${appUrl}/integration/quorum-chart-catalogue.json`, { headers }).then((r) => r.json());
  const bootstrap = await fetch(`${appUrl}/companion/bootstrap`, { headers }).then((r) => r.json());
  assert.equal(bootstrap.catalogue_digest, catalogue.digest);
  assert.equal((await fetch(`${appUrl}/config/dashboard.json`).then((r) => r.json())).id, "shipped-harness-fixture");
});

test("harness accepts isolated app and control ports", async (t) => {
  const { appUrl, controlUrl } = await startHarness(t, {
    mode: "source",
    appPort: 43_173,
    controlPort: 43_174,
    staleDist: false,
  });

  const response = await fetch(`${appUrl}/`);
  const body = await response.text();
  const reset = await fetch(`${controlUrl}/__test__/reset`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });

  assert.equal(response.status, 200);
  assert.match(body, /CURRENT_SOURCE_MARKER/);
  assert.equal(reset.status, 200);
});

test("source mode serves current source even when stale dist exists", async (t) => {
  const { appUrl } = await startHarness(t, {
    mode: "source",
    appPort: 43_175,
    controlPort: 43_176,
    staleDist: true,
  });

  const response = await fetch(`${appUrl}/`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /CURRENT_SOURCE_MARKER/);
  assert.doesNotMatch(body, /DIST_PACKAGE_MARKER/);
});

test("harness requires an explicit application mode", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "simex-source-harness-"));
  await writeFixture(fixtureRoot, { staleDist: false });
  const server = spawn(
    process.execPath,
    [
      SERVER_PATH,
      "--app-port",
      "43179",
      "--control-port",
      "43180",
    ],
    {
      cwd: fixtureRoot,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk;
  });
  server.stderr.on("data", (chunk) => {
    output += chunk;
  });

  const exitCode = await Promise.race([
    once(server, "exit").then(([code]) => code),
    delay(1_000).then(() => null),
  ]);
  if (server.exitCode === null) {
    server.kill();
    await once(server, "exit");
  }
  await rm(fixtureRoot, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });

  assert.notEqual(exitCode, null, "server stayed running without a mode");
  assert.notEqual(exitCode, 0);
  assert.match(output, /requires --source/);
});

async function startHarness(t, { mode, appPort, controlPort, staleDist }) {
  // Hosted Windows TMP can use an 8.3 alias (RUNNER~1), which Vite rejects.
  const fixtureRoot = await realpath(await mkdtemp(join(tmpdir(), "simex-source-harness-")));
  await writeFixture(fixtureRoot, { staleDist });

  const server = spawn(
    process.execPath,
    [
      SERVER_PATH,
      `--${mode}`,
      "--app-port",
      String(appPort),
      "--control-port",
      String(controlPort),
    ],
    {
      cwd: fixtureRoot,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk;
  });
  server.stderr.on("data", (chunk) => {
    output += chunk;
  });
  t.after(async () => {
    if (server.exitCode === null) {
      server.kill();
      await Promise.race([once(server, "exit"), delay(2_000)]);
    }
    await rm(fixtureRoot, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  });

  const appUrl = `http://127.0.0.1:${appPort}`;
  const controlUrl = `http://127.0.0.1:${controlPort}`;
  await Promise.all([
    waitForReady(server, `${appUrl}/__test_ready__`, () => output),
    waitForReady(server, `${controlUrl}/__test__/events`, () => output),
  ]);
  return {
    appUrl,
    controlUrl,
  };
}

async function writeFixture(root, { staleDist }) {
  await mkdir(join(root, "public", "config"), { recursive: true });
  await writeFile(join(root, "public", "config", "dashboard.json"), JSON.stringify({ id: "shipped-harness-fixture" }));
  const catalogue = JSON.stringify({
    catalogue_id: "fixture",
    digest: "a".repeat(64),
  });
  const cataloguePath = join(
    root,
    "public",
    "integration",
    "quorum-chart-catalogue.json",
  );
  await mkdir(dirname(cataloguePath), { recursive: true });
  await writeFile(
    join(root, "index.html"),
    "<!doctype html><main>CURRENT_SOURCE_MARKER</main>",
  );
  if (staleDist) {
    const packagedCataloguePath = join(
      root,
      "dist",
      "integration",
      "quorum-chart-catalogue.json",
    );
    await mkdir(dirname(packagedCataloguePath), { recursive: true });
    await writeFile(
      join(root, "dist", "index.html"),
      "<!doctype html><main>DIST_PACKAGE_MARKER</main>",
    );
    await writeFile(packagedCataloguePath, catalogue);
  }
  await writeFile(cataloguePath, catalogue);
}

async function waitForReady(server, readyUrl, readOutput) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`source harness exited early: ${readOutput()}`);
    }
    try {
      const response = await fetch(readyUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // The server has not bound its port yet.
    }
    await delay(25);
  }
  throw new Error(`source harness did not become ready: ${readOutput()}`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
