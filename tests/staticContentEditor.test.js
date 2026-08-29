import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import {
  createStaticContentDraft,
  finalizeStaticContentDraft,
  reduceStaticContentDraft,
} from "../src/static-content/forms/staticContentDraft.js";
import { prepareStaticPanelTransaction } from "../src/static-content/staticPanelTransaction.js";
import { makeDashboardV5 } from "./helpers/contentLibraryFixtures.js";

const vite = await createServer({
  root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true },
});
const editorModule = await vite.ssrLoadModule("/src/components/static-content/StaticContentEditor.jsx");
const freeTextEditorModule = await vite.ssrLoadModule("/src/components/static-content/FreeTextSourceEditor.jsx");
await vite.close();

test("StaticContentEditor mounts an existing V5 Image edit with media placement settings", () => {
  const dashboard = makeDashboardV5();
  const html = renderToStaticMarkup(React.createElement(editorModule.StaticContentEditor, {
    dashboard,
    destination: { pageId: "overview", sectionId: "response" },
    panel: dashboard.pages[0].sections[0].panels[0].chart,
    placement: dashboard.dataSources["image-source"],
    mediaItem: dashboard.contentLibrary.mediaItems["media-image-source"],
    assets: dashboard.assets,
  }));
  assert.match(html, /Edit Text\/Image/);
  assert.match(html, /value="Response map"/);
  assert.match(html, /Alternative text/);
  assert.match(html, /data-image-media-id="media-image-source"/);
  assert.match(html, /data-image-media-revision="3"/);
});

test("Free-text authoring opens the constrained visual Composer by default", () => {
  const html = renderToStaticMarkup(React.createElement(freeTextEditorModule.FreeTextSourceEditor, { value: "Brief" }));
  assert.match(html, /role="toolbar"[^>]*aria-label="Composer formatting"/);
  assert.match(html, /aria-label="Semantic text style"/);
  for (const label of ["Bold", "Italic", "Underline", "Bullet list", "Numbered list", "Table", "Insert image"]) {
    assert.match(html, new RegExp(`aria-label="${label}"`));
  }
  assert.match(html, />Advanced QMD</);
});

test("existing Image edit finalizes and prepares the exact atomic V5 contract", () => {
  const dashboard = makeDashboardV5();
  let draft = createStaticContentDraft({
    mode: "edit",
    destination: { pageId: "overview", sectionId: "response" },
    panel: dashboard.pages[0].sections[0].panels[0].chart,
    placement: dashboard.dataSources["image-source"],
    mediaItem: dashboard.contentLibrary.mediaItems["media-image-source"],
    assets: dashboard.assets,
  });
  draft = reduceStaticContentDraft(draft, {
    type: "setImageTransform", fit: "cover", rotation: 90,
    crop: { x: 100, y: 100, width: 800, height: 800 },
  });
  draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" });
  const payload = finalizeStaticContentDraft(draft);
  assert.deepEqual(Object.keys(payload), [
    "destination", "panel", "placement", "mediaItem", "assets", "stagedAssetIds",
  ]);
  assert.equal(payload.placement.mediaId, "media-image-source");
  assert.equal(payload.placement.sourceVersion, 2);
  assert.equal(payload.placement.fit, "cover");
  assert.equal(payload.placement.rotation, 90);
  assert.equal(payload.mediaItem.revision, 3);
  assert.deepEqual(payload.stagedAssetIds, []);

  const prepared = prepareStaticPanelTransaction({
    dashboard, operation: "update", panelId: "image-panel", ...payload,
  });
  assert.equal(prepared.mediaId, "media-image-source");
  assert.equal(prepared.expectedMediaRevision, 3);
  assert.equal(prepared.candidateDashboard.dataSources["image-source"].mediaId, "media-image-source");
  assert.equal(prepared.candidateDashboard.contentLibrary.mediaItems["media-image-source"].revision, 3);
  assert.deepEqual(dashboard, makeDashboardV5());
});

test("discard, validation failure, and persistence failure retain prior V5 identity and staged inventory", async () => {
  const dashboard = makeDashboardV5();
  const prior = structuredClone(dashboard);
  const staged = { "asset-staged": { ...dashboard.assets["asset-map"], storageState: "staged" } };
  let draft = createStaticContentDraft({
    mode: "edit",
    destination: { pageId: "overview", sectionId: "response" },
    panel: dashboard.pages[0].sections[0].panels[0].chart,
    placement: dashboard.dataSources["image-source"],
    mediaItem: dashboard.contentLibrary.mediaItems["media-image-source"],
    assets: { ...dashboard.assets, ...staged },
  });
  draft = reduceStaticContentDraft(draft, { type: "setImageAlt", alt: "" });
  assert.throws(() => reduceStaticContentDraft(draft, {
    type: "setStage", stage: "preview-and-add",
  }), /alternative text/i);
  const discarded = reduceStaticContentDraft(draft, { type: "discard" });
  assert.equal(discarded.placement.mediaId, "media-image-source");
  assert.equal(discarded.mediaItem.revision, 3);
  assert.deepEqual(discarded.assets, { ...dashboard.assets, ...staged });
  assert.deepEqual(dashboard, prior);
});
