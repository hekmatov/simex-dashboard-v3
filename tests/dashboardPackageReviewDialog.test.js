import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { collaboratorPackage } from "./helpers/dashboardPackageFixtures.js";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const { default: Review } = await vite.ssrLoadModule("/src/components/build/DashboardPackageReviewDialog.jsx");
await vite.close();

test("package review defaults to empty additive selection with explicit replacement choice", () => {
  const candidate = collaboratorPackage(), current = collaboratorPackage({ value: 99 }).config;
  const before = structuredClone(current);
  const html = renderToStaticMarkup(React.createElement(Review, { candidate, current, activePageId: "overview" }));
  assert.match(html, /value="placements" selected/);
  assert.match(html, /value="replace">Load entire dashboard/);
  assert.match(html, /<button[^>]*disabled[^>]*>Import selected/);
  assert.doesNotMatch(html, />Load package</);
  assert.deepEqual(current, before);
});
