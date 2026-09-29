import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("parallel source server reset keeps the companion catalogue absent", async (t) => {
  const appPort = await freePort();
  let controlPort = await freePort();
  while (controlPort === appPort) controlPort = await freePort();
  const child = spawn(process.execPath, [
    "tests/e2e/mock-companion-server.mjs", "--source",
    "--app-port", String(appPort), "--control-port", String(controlPort),
    "--catalogue-default-absent",
  ], { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await once(child, "exit");
    }
  });

  const appUrl = `http://127.0.0.1:${appPort}`;
  const controlUrl = `http://127.0.0.1:${controlPort}`;
  await waitForReady(`${appUrl}/__test_ready__`, child, () => stderr);
  assert.equal((await fetch(`${appUrl}/companion/bootstrap`)).status, 404);
  assert.equal((await fetch(`${controlUrl}/__test__/catalogue-mode`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "match" }),
  })).status, 200);
  assert.equal((await fetch(`${appUrl}/companion/bootstrap`)).status, 200);
  assert.equal((await fetch(`${controlUrl}/__test__/reset`, { method: "POST" })).status, 200);
  assert.equal((await fetch(`${appUrl}/companion/bootstrap`)).status, 404);
});

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  server.close();
  await once(server, "close");
  return port;
}

async function waitForReady(url, child, getError) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Source server exited: ${getError()}`);
    }
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* Wait for the local server to bind. */ }
    await delay(100);
  }
  throw new Error(`Source server did not become ready: ${getError()}`);
}
