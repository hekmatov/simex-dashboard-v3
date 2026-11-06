import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { collaboratorPackage } from "./helpers/dashboardPackageFixtures.js";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, watch: null } });
const { default: Review } = await vite.ssrLoadModule("/src/components/build/DashboardPackageReviewDialog.jsx");
await vite.close();

test("package review offers three radios and simultaneous map and content selection", () => {
  const candidate = collaboratorPackage(), current = collaboratorPackage({ value: 99 }).config;
  const before = structuredClone(current);
  const html = renderToStaticMarkup(React.createElement(Review, { candidate, current, activePageId: "overview" }));
  assert.match(html, /<input(?=[^>]*type="radio")(?=[^>]*value="partial")(?=[^>]*checked)[^>]*>/);
  assert.match(html, /type="radio"[^>]*value="replace"/);
  assert.match(html, /type="radio"[^>]*value="append"/);
  assert.match(html, /Partial Append/);
  assert.match(html, /Full Append/);
  assert.match(html, /aria-label="Package dashboard map"/);
  assert.match(html, /aria-label="Content selection"/);
  assert.match(html, /cases.csv/);
  assert.doesNotMatch(html, /<select[^>]*aria-label="Import choice"/);
  assert.match(html, /<button[^>]*disabled[^>]*>Import selected/);
  assert.doesNotMatch(html, />Load package</);
  assert.deepEqual(current, before);
});
