import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const { default: Header } = await vite.ssrLoadModule("/src/components/dashboard/DashboardHeader.jsx");
await vite.close();

function renderHeader(matches, props) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { matchMedia: () => ({ matches, addEventListener() {}, removeEventListener() {} }) },
  });
  try {
    return renderToStaticMarkup(React.createElement(Header, props));
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  }
}

const dashboard = { title: "Biomedical", description: "Regional evidence", programLabel: "PDPC", scenarioLabel: "HeV-A26", lastUpdated: "2026-07-27" };
const activePage = { id: "biomedical", title: "Biomedical", description: "Regional evidence" };

test("compact View header keeps only the page title and description", async () => {
  const html = renderHeader(true, { activePage, dashboard, mode: "view" });
  assert.match(html, /data-header-compact="true"/);
  assert.match(html, /<h1>Biomedical<\/h1>/);
  assert.doesNotMatch(html, /pdpc-header-mark|dashboard-meta/);
});

test("desktop header is unchanged", async () => {
  const html = renderHeader(false, { activePage, dashboard, mode: "view" });
  assert.doesNotMatch(html, /data-header-compact/);
  assert.match(html, /pdpc-header-mark[\s\S]*dashboard-meta/);
});

test("phone-width View caps every chart footprint height", async () => {
  const css = await readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.view-shell \.chart-panel-footprint\s*\{[^}]*height:\s*clamp\(240px, 52vh, 420px\);/);
  assert.match(css, /\.view-shell \.dashboard-attention-strip \.attention-strip-items\s*\{[^}]*scroll-snap-type:\s*x mandatory;/);
});
