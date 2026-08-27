import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");

test("Cloudflare Linux build scopes portable-data and compatibility variables to their consumers", () => {
  const command = packageJson.scripts["build:cloudflare:linux"];
  assert.match(command, /SIMEX_EMBED_PORTABLE_DATA=0 node scripts\/build-portable-data\.mjs/);
  assert.match(command, /VITE_SHOW_COMPATIBILITY_REPORTS=false vite build/);
  assert.match(command, /node scripts\/verify-v3-static-build\.mjs --finalize$/);
});

test("HTML and service worker headers force revalidation while hashed assets remain content addressed", () => {
  for (const path of ["/service-worker.js", "/index.html", "/"]) {
    assert.match(headers, new RegExp(`${path.replace(/[/.]/g, "\\$&")}\\r?\\n  Cache-Control: no-cache, no-store, must-revalidate`));
  }
});
