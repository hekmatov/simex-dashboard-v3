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

test("package review shows the app version and migration consequences without exposing the digest", () => {
  const base = collaboratorPackage(), current = collaboratorPackage({ value: 99 }).config;
  const candidate = { ...base, migrationReview: [
    { code: "present-subset", storylineId: "national", memberIds: ["a", "b", "c", "d", "e"], presentChartIds: ["a", "b", "c", "d"], omittedChartIds: ["e"], layout: "grid-2x2" },
    { code: "unbounded-nearest", storylineId: "old", chartId: "survey" },
    { code: "collection-label", storylineId: "child", label: "Original collection name" },
  ] };
  const before = structuredClone(current);
  const html = renderToStaticMarkup(React.createElement(Review, { candidate, current, activePageId: "overview" }));
  assert.match(html, /Exported by app/);
  assert.ok(candidate.integrity.digest);
  assert.ok(!html.includes(candidate.integrity.digest));
  assert.doesNotMatch(html, /SHA-?256/i);
  assert.match(html, /all 5 members are retained/);
  assert.match(html, /e remains in the Storyline but outside its Present subset/);
  assert.match(html, /no tolerance/);
  assert.match(html, /no value is substituted/);
  assert.match(html, /independently of the Storyline name/);
  assert.deepEqual(current, before);
  assert.equal(candidate.originalText, base.originalText);
});
