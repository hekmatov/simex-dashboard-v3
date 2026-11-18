import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { APP_VERSION } from "../src/lib/appVersion.js";

const packageVersion = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version;
const vite = await createServer({
  root: process.cwd(), appType: "custom", logLevel: "silent",
  server: { middlewareMode: true, watch: null }, optimizeDeps: { noDiscovery: true },
});
const { default: ExerciseContextStamp } = await vite.ssrLoadModule("/src/components/common/ExerciseContextStamp.jsx");
const { default: ExerciseDisclaimer } = await vite.ssrLoadModule("/src/components/app-shell/ExerciseDisclaimer.jsx");
await vite.close();

test("exercise stamps expose the exact approved notice and package version in separate visible spans", () => {
  assert.equal(APP_VERSION, packageVersion);
  for (const variant of ["compact", "fullscreen", "audience"]) {
    const html = renderToStaticMarkup(React.createElement(ExerciseContextStamp, { variant }));
    assert.match(html, /<span[^>]*data-exercise-notice="true"[^>]*>Fictional scenario · Exercise use only<\/span>/);
    assert.ok(html.includes(`data-app-version="${packageVersion}"`));
    assert.ok(html.includes(`>App version ${packageVersion}</span>`));
    assert.match(html, new RegExp(`data-exercise-context-stamp="${variant}"`));
    assert.doesNotMatch(html, /<button|<a\b|<input|aria-hidden|\bhidden=|accepted|approved/i);
  }
});

test("the disclaimer retains its aside boundary around the reusable stamp", () => {
  const html = renderToStaticMarkup(React.createElement(ExerciseDisclaimer));
  assert.match(html, /^<aside class="exercise-disclaimer" aria-label="Exercise disclaimer">/);
  assert.equal((html.match(/Fictional scenario · Exercise use only/g) ?? []).length, 1);
  assert.ok(html.includes(`>App version ${packageVersion}</span>`));
});
