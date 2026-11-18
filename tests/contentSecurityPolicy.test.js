import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  contentSecurityPolicy,
  inlineScriptHashes,
  readStaticSecurityHeaders,
  writeStaticSecurityHeaders,
} from "../scripts/lib/content-security-policy.mjs";

test("static policy authorizes exact inline boot bytes without allowing arbitrary scripts", () => {
  const script = "\nwindow.fixture = 'ready';\n";
  const hash = `'sha256-${createHash("sha256").update(script).digest("base64")}'`;
  const html = `<script src="./runtime.js"></script><script>${script}</script>`;
  assert.deepEqual(inlineScriptHashes([html, html]), [hash]);
  const policy = contentSecurityPolicy([html]);
  assert.ok(policy.includes(`script-src 'self' ${hash};`));
  assert.ok(policy.includes("style-src 'self' 'unsafe-inline';"));
  assert.ok(policy.includes("object-src 'none';"));
  assert.ok(policy.includes("base-uri 'self';"));
  assert.ok(policy.includes("frame-ancestors 'self';"));
  assert.doesNotMatch(policy.split("script-src ")[1].split(";")[0], /unsafe-inline|unsafe-eval/);
});

test("offline policy permits embedded assets and hashed scripts while denying network connections", () => {
  const policy = contentSecurityPolicy(["<script>window.fixture=1;</script>"], { offline: true });
  assert.ok(policy.includes("connect-src 'none';"));
  assert.ok(policy.includes("img-src 'self' data: blob:;"));
  assert.ok(policy.includes("font-src 'self' data:;"));
  assert.doesNotMatch(policy, /frame-ancestors/); // Unsupported in a meta policy.
  assert.doesNotMatch(policy, /https:|wss:/);
});

test("static finalization preserves cache rules and replaces only its own security block", async (t) => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "simex-csp-"));
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  const original = "/service-worker.js\n  Cache-Control: no-cache\n";
  await writeFile(path.join(outputDir, "_headers"), original);
  await writeFile(path.join(outputDir, "index.html"), "<script>window.first=1;</script>");
  await writeFile(path.join(outputDir, "source-viewer.html"), "<script>window.second=2;</script>");
  await writeStaticSecurityHeaders({ outputDir, entrypoints: ["index.html", "source-viewer.html"] });
  const first = await readFile(path.join(outputDir, "_headers"), "utf8");
  assert.ok(first.startsWith(original));
  assert.equal(first.match(/Content-Security-Policy:/g).length, 1);
  assert.ok(first.includes(inlineScriptHashes(["<script>window.second=2;</script>"])[0]));
  const served = await readStaticSecurityHeaders(outputDir);
  assert.equal(served["Content-Security-Policy"], contentSecurityPolicy([
    "<script>window.first=1;</script>", "<script>window.second=2;</script>",
  ]));
  assert.equal(served["X-Content-Type-Options"], "nosniff");
  assert.equal(served["Referrer-Policy"], "no-referrer");
  assert.equal(served["Cache-Control"], undefined);
  await writeStaticSecurityHeaders({ outputDir, entrypoints: ["index.html", "source-viewer.html"] });
  assert.equal(await readFile(path.join(outputDir, "_headers"), "utf8"), first);
  await writeFile(path.join(outputDir, "index.html"), "<script>window.changed=3;</script>");
  await writeStaticSecurityHeaders({ outputDir, entrypoints: ["index.html", "source-viewer.html"] });
  const changed = await readFile(path.join(outputDir, "_headers"), "utf8");
  assert.ok(changed.includes(inlineScriptHashes(["<script>window.changed=3;</script>"])[0]));
  assert.ok(!changed.includes(inlineScriptHashes(["<script>window.first=1;</script>"])[0]));
});
