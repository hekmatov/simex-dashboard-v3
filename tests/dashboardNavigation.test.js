import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import {
  parseDashboardEntry,
  reconcileActivePageId,
} from "../src/lib/dashboardNavigation.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: ModeSwitcher },
  { default: DashboardIdentityRow },
  { default: AppFrame },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/app-shell/ModeSwitcher.jsx"),
  vite.ssrLoadModule("/src/components/app-shell/DashboardIdentityRow.jsx"),
  vite.ssrLoadModule("/src/components/app-shell/AppFrame.jsx"),
]);
await vite.close();

test("audience query stays chrome-free when its channel is invalid", () => {
  const entry = parseDashboardEntry("?surface=audience&channel=bad");

  assert.equal(entry.surface, "audience");
  assert.equal(entry.requestedMode, "present");
  assert.equal(entry.channelId, null);
  assert.equal(entry.issue, "invalid_channel");
});

test("active page survives when valid and falls back after removal", () => {
  const pages = [{ id: "old-homepage-content" }, { id: "biomedical" }];

  assert.equal(reconcileActivePageId(pages, "biomedical"), "biomedical");
  assert.equal(reconcileActivePageId(pages, "missing"), "old-homepage-content");
  assert.equal(reconcileActivePageId(pages, "home"), "old-homepage-content");
});

test("mode switcher renders only available modes in canonical order", () => {
  const html = renderToStaticMarkup(React.createElement(ModeSwitcher, {
    mode: "home",
    availableModes: ["home", "view", "build", "present"],
    onModeRequest() {},
  }));
  assert.match(html, /Home[\s\S]*View[\s\S]*Build[\s\S]*Present/);

  const disabledHome = renderToStaticMarkup(React.createElement(ModeSwitcher, {
    mode: "view",
    availableModes: ["view", "build", "present"],
    onModeRequest() {},
  }));
  assert.doesNotMatch(disabledHome, />Home<\/button>/);
});

test("Home identity row omits package Page navigation while retaining pinned actions", () => {
  const html = renderToStaticMarkup(React.createElement(DashboardIdentityRow, {
    dashboardIdentity: { title: "SimEx Dashboard" },
    activePage: { id: "old-homepage-content", title: "Old Homepage Content" },
    pages: [{ id: "old-homepage-content", title: "Old Homepage Content" }],
    showPageNavigation: false,
    pageActions: React.createElement("button", null, "Page action"),
  }));
  assert.doesNotMatch(html, /Dashboard pages/);
  assert.doesNotMatch(html, /Old Homepage Content/);
  assert.match(html, /Page action/);
});

test("Home shell carries availability through the crown and exposes Home context", () => {
  const html = renderToStaticMarkup(React.createElement(AppFrame, {
    mode: "home",
    availableModes: ["home", "view", "build", "present"],
    showPageNavigation: false,
    dashboardIdentity: { title: "SimEx Dashboard" },
    activePage: { id: "ordinary-page", title: "Ordinary Page" },
    pages: [{ id: "ordinary-page", title: "Ordinary Page" }],
    contextNode: React.createElement("span", null, "Welcome home"),
    onModeRequest() {},
    children: React.createElement("main", null, "Home content"),
  }));

  assert.match(html, /Home[\s\S]*View[\s\S]*Build[\s\S]*Present/);
  assert.match(html, /aria-label="Home context"/);
  assert.doesNotMatch(html, /Dashboard pages|Ordinary Page/);
});
