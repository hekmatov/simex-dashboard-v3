import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const SERVER_PATH = fileURLToPath(
  new URL("./e2e/mock-companion-server.mjs", import.meta.url),
);

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
  const fixtureRoot = await mkdtemp(join(tmpdir(), "simex-source-harness-"));
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
