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
const [
  { default: BuildPropertiesPane },
  { default: BuildWorkspace },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/build/BuildPropertiesPane.jsx"),
  vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx"),
]);
await vite.close();

test("selected Page inspector exposes deletion while the final Page remains guarded", () => {
  const dashboard = fixtureDashboard();
  const html = renderToStaticMarkup(React.createElement(BuildPropertiesPane, {
    dashboard,
    selection: { kind: "page", pageId: "biomedical" },
    onPageRemove() {},
  }));
  assert.match(html, /<button(?=[^>]*aria-label="Delete Biomedical page")[^>]*>/);
  assert.doesNotMatch(html, /<button(?=[^>]*aria-label="Delete Biomedical page")(?=[^>]*disabled)[^>]*>/);

  const finalPageHtml = renderToStaticMarkup(React.createElement(BuildPropertiesPane, {
    dashboard: { pages: [dashboard.pages[0]] },
    selection: { kind: "page", pageId: "home" },
    onPageRemove() {},
  }));
  assert.match(finalPageHtml, /<button(?=[^>]*aria-label="Delete Home page")(?=[^>]*disabled)[^>]*>/);
  assert.match(finalPageHtml, /A dashboard must retain at least one Page\./);
  assert.doesNotMatch(finalPageHtml, /Pages (?:&amp;|and) sections/);
});

test("Dashboard Map is the only live Build structure-inspection surface", () => {
  const dashboard = fixtureDashboard();
  const activePage = dashboard.pages[1];
  const html = renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard,
    activePage,
    selection: { kind: "page", pageId: activePage.id },
    dashboardDraft: dashboard,
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
  }));

  assert.match(
    html,
    /<aside(?=[^>]*data-build-rail="properties")(?=[^>]*aria-label="Properties")[^>]*>/,
  );
  assert.match(html, /data-build-rail="structure"/);
  assert.match(html, /aria-label="Dashboard structure"/);
  assert.doesNotMatch(html, /Pages (?:&amp;|and) sections/);
  assert.doesNotMatch(html, /data-context-shelf-entry="structure"/);
});

function fixtureDashboard() {
  return {
    pages: [
      {
        id: "home",
        label: "Home",
        title: "Home",
        sections: [{ id: "home-overview", title: "Overview", panels: [] }],
      },
      {
        id: "biomedical",
        label: "Biomedical",
        title: "Biomedical",
        sections: [{
          id: "outbreak",
          title: "Outbreak",
          panels: [{ id: "confirmed-cases", title: "Confirmed cases" }],
        }],
      },
    ],
    chronoGroups: [],
    scenes: [],
  };
}
