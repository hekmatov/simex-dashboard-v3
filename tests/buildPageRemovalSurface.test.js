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
const inspectorModule = await vite.ssrLoadModule("/src/components/build/BuildInspector.jsx").catch(() => null);
const structureModule = await vite.ssrLoadModule("/src/components/build/StructureAuthoring.jsx").catch(() => null);
await vite.close();

test("selected Page inspector exposes a deliberate delete control and protects the final Page", () => {
  assert.equal(typeof inspectorModule?.default, "function");
  const dashboard = fixtureDashboard();
  const html = renderToStaticMarkup(React.createElement(inspectorModule.default, {
    dashboard,
    selection: { kind: "page", pageId: "biomedical" },
    onPageRemove() {},
  }));
  assert.match(html, /<button(?=[^>]*aria-label="Delete Biomedical page")[^>]*>/);
  assert.doesNotMatch(html, /<button(?=[^>]*aria-label="Delete Biomedical page")(?=[^>]*disabled)[^>]*>/);

  const finalPageHtml = renderToStaticMarkup(React.createElement(inspectorModule.default, {
    dashboard: { pages: [dashboard.pages[0]] },
    selection: { kind: "page", pageId: "home" },
    onPageRemove() {},
  }));
  assert.match(finalPageHtml, /<button(?=[^>]*aria-label="Delete Home page")(?=[^>]*disabled)[^>]*>/);
});

test("Pages and sections requests Page deletion with named chart consequences before changing its draft", () => {
  assert.equal(typeof structureModule?.createStructureDraft, "function");
  assert.equal(typeof structureModule?.reduceStructureDraft, "function");
  const draft = structureModule.createStructureDraft(fixtureDashboard());
  const requested = structureModule.reduceStructureDraft(draft, {
    type: "REQUEST_REMOVE_PAGE",
    pageId: "biomedical",
  });

  assert.equal(requested.value.pages.length, 2);
  assert.deepEqual(requested.pendingConsequence, {
    kind: "remove-page",
    pageId: "biomedical",
    pageLabel: "Biomedical",
    sectionCount: 1,
    chartIds: ["confirmed-cases"],
  });

  const html = renderToStaticMarkup(React.createElement(structureModule.default, {
    draft: requested,
    onAction() {},
  }));
  assert.match(html, /Delete Biomedical page/);
  assert.match(html, /Delete Page Biomedical\?/);
  assert.match(html, /1 Section and 1 chart/);
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
  };
}
