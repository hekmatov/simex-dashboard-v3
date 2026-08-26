import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { makeDashboardV5, makeMediaItem, makeSourceEntry } from "./helpers/contentLibraryFixtures.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const workspaceModule = await vite.ssrLoadModule("/src/components/source-content/SourceContentWorkspace.jsx");
await vite.close();

const { default: SourceContentWorkspace, createSourceContentViewState, managerLayoutForWidth, visibleManagerItems } = workspaceModule;

function dashboard() {
  return makeDashboardV5({
    contentLibrary: {
      mediaItems: {
        "media-image-source": makeMediaItem(),
        "media-long": makeMediaItem({ mediaId: "media-long", displayName: "<img src=x onerror=alert(1)>" }),
      },
      sourceEntries: {
        cases: makeSourceEntry("csv", { sourceId: "cases", displayName: "Cases CSV" }),
        boundaries: makeSourceEntry("geojson", { sourceId: "boundaries", displayName: "Boundaries" }),
        generated: makeSourceEntry("csv", { sourceId: "generated", origin: "generated", ownership: "dashboard", displayName: "Intermediate" }),
      },
    },
    dataSources: {
      cases: { kind: "csv", path: "data/cases.csv" },
      boundaries: { kind: "geojson", path: "data/boundaries.geojson" },
      generated: { kind: "csv", path: "data/generated.csv", provenance: { generated: true, ownership: "dashboard" } },
    },
  });
}

test("manager uses desktop split and tablet list-to-detail composition", () => {
  assert.equal(managerLayoutForWidth(1440), "desktop");
  assert.equal(managerLayoutForWidth(1024), "tablet");
  assert.equal(managerLayoutForWidth(390), "unsupported");

  const desktop = renderToStaticMarkup(React.createElement(SourceContentWorkspace, {
    dashboard: dashboard(), viewportWidth: 1440,
  }));
  assert.match(desktop, /role="tablist"/);
  assert.match(desktop, />Media</);
  assert.match(desktop, />Data sources</);
  assert.match(desktop, /data-manager-layout="desktop"/);
  assert.match(desktop, /aria-label="Media catalogue"/);
  assert.match(desktop, /aria-label="Content detail"/);

  const tablet = renderToStaticMarkup(React.createElement(SourceContentWorkspace, {
    dashboard: dashboard(), viewportWidth: 1024, initialSelectedId: "media-image-source",
  }));
  assert.match(tablet, /data-manager-layout="tablet"/);
  assert.match(tablet, />Back</);
});

test("catalogue filters preserve builder content and exclude trusted generated sources", () => {
  const items = visibleManagerItems(dashboard(), "sources", {
    query: "cases", origin: "all", status: "all", usage: "all", kind: "csv",
  });
  assert.deepEqual(items.map(({ id }) => id), ["cases"]);
  assert.equal(items.some(({ id }) => id === "generated"), false);
  assert.equal(items[0].usageCount, null);
});

test("controlled serializable browse state restores every manager view field", () => {
  assert.equal(typeof createSourceContentViewState, "function");
  const viewState = createSourceContentViewState({
    tab: "sources",
    queries: { media: "map", sources: "cases" },
    filters: {
      media: { origin: "packaged", status: "ready", usage: "unused", kind: "all" },
      sources: { origin: "legacy-import", status: "ready", usage: "all", kind: "csv" },
    },
    selections: { media: "media-image-source", sources: "cases" },
    tabletDetailOpen: true,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(viewState)), viewState);
  const html = renderToStaticMarkup(React.createElement(SourceContentWorkspace, {
    dashboard: dashboard(), viewportWidth: 1024, viewState, onViewStateChange: () => {},
  }));
  assert.match(html, /data-manager-layout="tablet"/);
  assert.match(html, /role="tab" aria-selected="true">Data sources/);
  assert.match(html, /<span>Display name<\/span>/);
  assert.match(html, />Back</);
});

test("catalogue exposes the complete accessible filter inventory and renders metadata as text", () => {
  const html = renderToStaticMarkup(React.createElement(SourceContentWorkspace, {
    dashboard: dashboard(), viewportWidth: 1440,
  }));
  assert.match(html, /aria-label="Search media"/);
  assert.match(html, /aria-label="Filter by origin"/);
  assert.match(html, /aria-label="Filter by status"/);
  assert.match(html, /aria-label="Filter by usage"/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
});
