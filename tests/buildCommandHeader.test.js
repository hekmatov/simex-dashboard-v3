import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { default: BuildWorkspace } = await vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx");
await vite.close();

const activePage = {
  id: "biomedical",
  label: "Biomedical",
  sections: [{ id: "signals", title: "Signals", panels: [] }],
};
const dashboard = {
  id: "test-dashboard",
  timezone: "UTC",
  pages: [activePage],
  chronoGroups: [],
  scenes: [],
};

function renderWorkspace(overrides = {}) {
  return renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard,
    activePage,
    pageType: "analytical",
    buildPanelOpen: false,
    selection: { kind: "page", pageId: activePage.id },
    dashboardDraft: dashboard,
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
    onActivate: () => {},
    onRename: () => {},
    onDashboardChange: () => {},
    onPageChange: () => {},
    onSectionChange: () => {},
    onFinish: () => {},
    onReset: () => {},
    onDeleteDashboardContent: () => {},
    ...overrides,
  }));
}

test("Build command row exposes Insert, Libraries, and Session groups in order", () => {
  const html = renderWorkspace();
  const groupOrder = [...html.matchAll(/data-build-command-group="([^"]+)"/g)].map((match) => match[1]);
  const actionOrder = [...html.matchAll(/data-build-command-action="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(groupOrder, ["insert", "libraries", "session"]);
  assert.deepEqual(actionOrder, [
    "add-chart",
    "add-text-image",
    "source-content",
    "chrono-studio",
    "scene-studio",
    "discard-build-changes",
    "finish-build",
  ]);
  assert.match(html, /<div(?=[^>]*\brole="group")(?=[^>]*\baria-label="Insert")[^>]*>/);
  assert.match(html, /<div(?=[^>]*\brole="group")(?=[^>]*\baria-label="Libraries")[^>]*>/);
  assert.match(html, /<div(?=[^>]*\brole="group")(?=[^>]*\baria-label="Session")[^>]*>/);
  assert.match(html, /class="build-command-group-label"[^>]*>Insert</);
  assert.match(html, /data-build-command-action="scene-studio"[\s\S]*?>Scene Studio<\/button>/);
  assert.doesNotMatch(html, /data-build-command-action="more"/);
  assert.doesNotMatch(html, /build-more-drawer/);
});

test("Finish Build is the only primary command", () => {
  const html = renderWorkspace();
  const buttons = [...html.matchAll(/<button[^>]*data-build-command-action="([^"]+)"[^>]*>/g)];
  const primary = buttons.filter(([tag]) => !/class="[^"]*\bsecondary\b/.test(tag)).map(([, id]) => id);
  assert.deepEqual(primary, ["finish-build"]);
});

test("Build controls do not duplicate toast-reported operation errors", () => {
  const html = renderWorkspace({ operationError: "Layout save failed" });
  assert.doesNotMatch(html, /Layout save failed/);
});
