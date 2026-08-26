import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { makeMediaItem, makeSourceEntry } from "./helpers/contentLibraryFixtures.js";

const vite = await createServer({
  root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true },
});
const detailModule = await vite.ssrLoadModule("/src/components/source-content/ContentDetail.jsx");
await vite.close();
const { default: ContentDetail, buildContentRenameDraft } = detailModule;

test("detail routes media and CSV to type-appropriate passive shells", () => {
  const media = renderToStaticMarkup(React.createElement(ContentDetail, {
    item: { id: "media-map", kind: "media", record: makeMediaItem({ mediaId: "media-map" }), usageCount: 0 },
  }));
  assert.match(media, /Media details/);
  assert.match(media, /Default description/);
  assert.match(media, /Revision/);
  assert.doesNotMatch(media, /Delete|Replace|Import as local media/);

  const csv = renderToStaticMarkup(React.createElement(ContentDetail, {
    item: { id: "cases", kind: "csv", record: makeSourceEntry("csv"), usageCount: 0 },
    datasetProfile: { rowCount: 2, columns: [{ name: "value", type: "numeric" }] },
  }));
  assert.match(csv, /CSV details/);
  assert.match(csv, /2 rows/);
  assert.doesNotMatch(csv, /GeoJSON preview|Delete|Replace/);
});

test("External media detail alone exposes manager-owned Import as local media", () => {
  const external = makeMediaItem({
    mediaId: "external-map", current: { kind: "url", url: "https://example.test/map.png" },
    origin: "external", health: "external",
  });
  const externalHtml = renderToStaticMarkup(React.createElement(ContentDetail, {
    item: { id: external.mediaId, kind: "media", record: external, usageCount: 0 },
    dashboard: { assets: {}, contentLibrary: { mediaItems: { [external.mediaId]: external } } },
    onContentDraftStage: () => {}, onContentDraftCommit: () => {}, onContentDraftDiscard: () => {},
  }));
  assert.match(externalHtml, /Import as local media/);

  const storedHtml = renderToStaticMarkup(React.createElement(ContentDetail, {
    item: { id: "stored", kind: "media", record: makeMediaItem({ mediaId: "stored" }), usageCount: 0 },
  }));
  assert.doesNotMatch(storedHtml, /Import as local media/);
});

test("rename draft stages exact manager ownership before one candidate commit", () => {
  const dashboard = {
    contentLibrary: { mediaItems: { "media-map": makeMediaItem({ mediaId: "media-map" }) }, sourceEntries: {} },
  };
  const draft = buildContentRenameDraft({
    dashboard,
    item: { id: "media-map", kind: "media", record: dashboard.contentLibrary.mediaItems["media-map"] },
    displayName: "Updated map",
    defaultDescription: "Updated description",
  });
  assert.equal(draft.owner, "manager");
  assert.equal(draft.kind, "manager-rename");
  assert.deepEqual(draft.mediaIds, ["media-map"]);
  assert.equal(draft.payload.displayName, "Updated map");
  const candidate = draft.buildCandidate({ dashboard, draft });
  assert.equal(candidate.dashboard.contentLibrary.mediaItems["media-map"].displayName, "Updated map");
  assert.equal(candidate.dashboard.contentLibrary.mediaItems["media-map"].defaultDescription, "Updated description");
  assert.deepEqual(candidate.commitAssetIds, []);
});

test("committed usage metadata is passive until a navigation handler is supplied", () => {
  const html = renderToStaticMarkup(React.createElement(ContentDetail, {
    item: {
      id: "cases",
      kind: "csv",
      record: makeSourceEntry("csv"),
      uses: [{ id: "use-1", pageLabel: "Biomedical", sectionLabel: "Signals", panelLabel: "Cases" }],
      activeRetainers: [],
    },
  }));
  assert.match(html, /Biomedical[\s\S]*Signals[\s\S]*Cases/);
  assert.doesNotMatch(html, /<button[^>]*source-content-breadcrumb/);
});
