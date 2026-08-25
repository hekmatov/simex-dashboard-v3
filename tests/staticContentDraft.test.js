import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import {
  STATIC_CONTENT_STAGE_LABELS,
  STATIC_CONTENT_STAGES,
  createStaticContentDraft,
  finalizeStaticContentDraft,
  isStaticContentDraftDirty,
  reduceStaticContentDraft,
} from "../src/static-content/forms/staticContentDraft.js";
import { validateChartInstance } from "../src/charting/config/chartConfigV3.js";

test("static authoring owns exactly four stages separate from Add chart", () => {
  assert.deepEqual(STATIC_CONTENT_STAGES, [
    "destination",
    "content-type",
    "content",
    "preview-and-add",
  ]);
  assert.deepEqual(STATIC_CONTENT_STAGE_LABELS, [
    "Destination",
    "Content type",
    "Content",
    "Preview & add",
  ]);
  const draft = createStaticContentDraft();
  assert.equal(draft.stage, "destination");
  assert.equal(draft.persistence, "application-session-only");
  assert.equal(Object.hasOwn(draft, "storageKey"), false);
});

test("Image authoring controls mutate only in Content and preview is a passive final gate", () => {
  let draft = createStaticContentDraft({
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  draft = reduceStaticContentDraft(draft, { type: "setContentType", contentTypeId: "image" });
  draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "content" });
  draft = reduceStaticContentDraft(draft, {
    type: "updateSource",
    updates: {
      origin: { kind: "url", url: "https://example.test/map.png" },
      alt: "Response map",
      decorative: false,
      fit: "cover",
      crop: { x: 100, y: 50, width: 800, height: 900 },
      rotation: 90,
    },
  });
  draft = reduceStaticContentDraft(draft, { type: "setPanel", updates: { title: "Response map" } });
  draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" });

  assert.equal(draft.stage, "preview-and-add");
  assert.throws(
    () => reduceStaticContentDraft(draft, { type: "updateSource", updates: { rotation: 180 } }),
    /Content stage/i,
  );
  const finalized = finalizeStaticContentDraft(draft);
  assert.equal(finalized.source.rotation, 90);
  assert.equal(validateChartInstance(finalized.panel), finalized.panel);
});

test("dirty cancel Keep preserves the complete draft and Discard restores pair, stage, and focus", () => {
  const savedSource = {
    kind: "staticImage",
    sourceVersion: 1,
    revision: 7,
    origin: { kind: "url", url: "https://example.test/old.png" },
    alt: "Old response map",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
  let draft = createStaticContentDraft({
    mode: "edit",
    panel: { id: "image-panel", typeId: "image", title: "Old map", sourceId: "image-source" },
    source: savedSource,
    destination: { pageId: "page-a", sectionId: "section-a" },
    restoration: { focusId: "image-source-origin", invokerId: "edit-image" },
  });
  draft = reduceStaticContentDraft(draft, {
    type: "updateSource",
    updates: {
      origin: { kind: "url", url: "https://example.test/new.png" },
      alt: "New response map",
      fit: "cover",
      crop: { x: 100, y: 100, width: 800, height: 800 },
      rotation: 270,
    },
  });
  draft = reduceStaticContentDraft(draft, { type: "setPanel", updates: { title: "New map" } });
  assert.equal(isStaticContentDraftDirty(draft), true);

  const requested = reduceStaticContentDraft(draft, {
    type: "requestCancel",
    restoration: { focusId: "image-crop-x", invokerId: "edit-image" },
  });
  assert.equal(requested.confirmation, "discard");
  const kept = reduceStaticContentDraft(requested, { type: "keepEditing" });
  assert.equal(kept.source.origin.url, "https://example.test/new.png");
  assert.equal(kept.focusRequest, "image-crop-x");

  const discarded = reduceStaticContentDraft(requested, { type: "discard" });
  assert.deepEqual(discarded.source, savedSource);
  assert.equal(discarded.panel.title, "Old map");
  assert.equal(discarded.stage, "content");
  assert.equal(discarded.focusRequest, "image-source-origin");
  assert.equal(discarded.status, "discarded");
  assert.equal(isStaticContentDraftDirty(discarded), false);
});

test("Image replacement resets geometry, retains alt for review, and remains undoable until Save", () => {
  const savedSource = {
    kind: "staticImage",
    sourceVersion: 1,
    revision: 4,
    origin: { kind: "url", url: "https://example.test/old.png" },
    alt: "Old response map",
    decorative: false,
    fit: "cover",
    crop: { x: 100, y: 100, width: 700, height: 700 },
    rotation: 90,
  };
  let draft = createStaticContentDraft({
    mode: "edit",
    panel: { id: "image-panel", typeId: "image", title: "Response map", sourceId: "image-source" },
    source: savedSource,
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  draft = reduceStaticContentDraft(draft, {
    type: "replaceImage",
    origin: { kind: "asset", assetId: "asset-new" },
    manifestEntry: {
      mediaType: "image/png",
      byteLength: 48,
      width: 8,
      height: 6,
      sha256: "a".repeat(64),
      storageState: "staged",
    },
  });
  assert.deepEqual(draft.source.crop, { x: 0, y: 0, width: 1000, height: 1000 });
  assert.equal(draft.source.rotation, 0);
  assert.equal(draft.source.fit, "contain");
  assert.equal(draft.source.alt, "Old response map");
  assert.equal(draft.imageEditing.altReviewRequired, true);
  assert.equal(draft.assets["asset-new"].storageState, "staged");

  const undone = reduceStaticContentDraft(draft, { type: "undoImageReplacement" });
  assert.deepEqual(undone.source, savedSource);
  assert.deepEqual(undone.assets, {});
  assert.equal(undone.imageEditing.altReviewRequired, false);
});

test("Image finalization exposes only the selected draft asset while preserving superseded assets for undo", () => {
  const manifest = (seed) => ({
    mediaType: "image/png",
    byteLength: 48,
    width: 8,
    height: 6,
    sha256: seed.repeat(64),
    storageState: "staged",
  });
  let draft = createStaticContentDraft({
    mode: "edit",
    stage: "content",
    panel: { id: "image-panel", typeId: "image", title: "Response map", sourceId: "image-source" },
    source: {
      kind: "staticImage",
      origin: { kind: "asset", assetId: "asset-a" },
      alt: "Response map",
    },
    assets: { "asset-a": manifest("a") },
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  draft = reduceStaticContentDraft(draft, {
    type: "replaceImage",
    origin: { kind: "asset", assetId: "asset-b" },
    manifestEntry: manifest("b"),
  });
  assert.deepEqual(Object.keys(draft.assets).sort(), ["asset-a", "asset-b"]);
  assert.equal(draft.imageEditing.replacementUndo.source.origin.assetId, "asset-a");

  draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" });
  const finalized = finalizeStaticContentDraft(draft);
  assert.deepEqual(Object.keys(finalized.assets), ["asset-b"]);
});

test("decorative Image authoring preserves hidden authored alt for undo while runtime alt stays empty", () => {
  let draft = createStaticContentDraft({
    contentTypeId: "image",
    panel: { id: "image-panel", typeId: "image", title: "Response map", sourceId: "image-source" },
    source: { kind: "staticImage", origin: { kind: "url", url: "https://example.test/map.png" }, alt: "Response map" },
    destination: { pageId: "page-a", sectionId: "section-a" },
    stage: "content",
  });
  draft = reduceStaticContentDraft(draft, { type: "setImageDecorative", decorative: true });
  assert.equal(draft.source.decorative, true);
  assert.equal(draft.source.alt, "");
  assert.equal(draft.imageEditing.preservedAlt, "Response map");
  draft = reduceStaticContentDraft(draft, { type: "setImageDecorative", decorative: false });
  assert.equal(draft.source.decorative, false);
  assert.equal(draft.source.alt, "Response map");
});

test("Reset image changes only saved transform metadata in the draft", () => {
  let draft = createStaticContentDraft({
    contentTypeId: "image",
    panel: { id: "image-panel", typeId: "image", title: "Response map", sourceId: "image-source" },
    source: {
      kind: "staticImage",
      origin: { kind: "url", url: "https://example.test/map.png" },
      alt: "Response map",
      fit: "cover",
      crop: { x: 100, y: 200, width: 600, height: 500 },
      rotation: 270,
    },
    destination: { pageId: "page-a", sectionId: "section-a" },
    stage: "content",
  });
  draft = reduceStaticContentDraft(draft, { type: "resetImage" });
  assert.deepEqual(draft.source.origin, { kind: "url", url: "https://example.test/map.png" });
  assert.equal(draft.source.alt, "Response map");
  assert.deepEqual(draft.source.crop, { x: 0, y: 0, width: 1000, height: 1000 });
  assert.equal(draft.source.rotation, 0);
  assert.equal(draft.source.fit, "contain");
});

test("static draft revision advances only for authored changes", () => {
  const initial = createStaticContentDraft({
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  const navigated = reduceStaticContentDraft(initial, { type: "setStage", stage: "content-type" });
  assert.equal(navigated.draftRevision, initial.draftRevision);
  const authored = reduceStaticContentDraft(navigated, {
    type: "setDestination",
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  assert.equal(authored.draftRevision, initial.draftRevision + 1);
});

test("Free-text finalization accepts arbitrary inert source and still blocks resource limits", () => {
  let draft = createStaticContentDraft({
    destination: { pageId: "page-a", sectionId: "section-a" },
    contentTypeId: "freeText",
    panel: { id: "text-panel", typeId: "freeText", title: "Situation", sourceId: "text-source" },
    source: { kind: "staticText", qmd: "# Situation\n\nSafe content." },
  });
  draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" });
  assert.equal(finalizeStaticContentDraft(draft).source.qmd, "# Situation\n\nSafe content.");

  const arbitrary = {
    ...draft,
    source: { ...draft.source, qmd: '<iframe src="https://example.test"></iframe>\n<script>alert(1)</script>' },
  };
  assert.equal(finalizeStaticContentDraft(arbitrary).source.qmd, arbitrary.source.qmd);

  const blocked = {
    ...draft,
    source: { ...draft.source, qmd: `${"> ".repeat(7)}too deeply nested` },
  };
  assert.throws(
    () => finalizeStaticContentDraft(blocked),
    /line 1.*nest|nest.*line 1/i,
  );
});

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const wizardModule = await vite.ssrLoadModule("/src/components/static-content/StaticContentWizard.jsx")
  .catch(() => null);
const boundaryModule = await vite.ssrLoadModule("/src/components/static-content/StaticContentStateBoundary.jsx")
  .catch(() => null);
const buildHeaderModule = await vite.ssrLoadModule("/src/components/build/BuildCommandHeader.jsx")
  .catch(() => null);
const panelActionsModule = await vite.ssrLoadModule("/src/components/charts/ChartPanelActions.jsx")
  .catch(() => null);
await vite.close();

test("the routed wizard uses a real form and keeps Preview & add free of Image authoring controls", () => {
  assert.equal(typeof wizardModule?.StaticContentWizard, "function");
  const contentDraft = createStaticContentDraft({
    stage: "content",
    destination: { pageId: "page-a", sectionId: "section-a" },
    contentTypeId: "image",
    panel: { id: "image-panel", typeId: "image", title: "Response map", sourceId: "image-source" },
    source: {
      kind: "staticImage",
      origin: { kind: "url", url: "https://example.test/map.png" },
      alt: "Response map",
    },
  });
  const contentHtml = renderToStaticMarkup(React.createElement(wizardModule.StaticContentWizard, {
    open: true,
    dashboard: { pages: [{ id: "page-a", label: "Page A", sections: [{ id: "section-a", title: "Section A" }] }] },
    initialDraft: contentDraft,
    onCreate() {},
    onClose() {},
  }));
  assert.match(contentHtml, /<form/);
  assert.match(contentHtml, /Alternative text/);
  assert.match(contentHtml, /Rotate left/);
  assert.match(contentHtml, /Rotate right/);
  assert.match(contentHtml, /Fit/);
  assert.match(contentHtml, /Crop x/);
  assert.match(contentHtml, /type="file"/);
  assert.match(contentHtml, /data-image-crop-preview/);
  assert.ok(contentHtml.indexOf("data-image-crop-preview") < contentHtml.indexOf("data-image-guided-sections"));

  const previewHtml = renderToStaticMarkup(React.createElement(wizardModule.StaticContentWizard, {
    open: true,
    dashboard: { pages: [{ id: "page-a", label: "Page A", sections: [{ id: "section-a", title: "Section A" }] }] },
    initialDraft: { ...contentDraft, stage: "preview-and-add" },
    onCreate() {},
    onClose() {},
  }));
  assert.match(previewHtml, /Preview &amp; add/);
  assert.match(previewHtml, /type="submit"/);
  assert.doesNotMatch(previewHtml, /Alternative text/);
  assert.doesNotMatch(previewHtml, /Crop x/);
  assert.doesNotMatch(previewHtml, /Reset image/);
});

test("guided Image crop preview renders a validated packaged path", () => {
  const draft = createStaticContentDraft({
    stage: "content",
    destination: { pageId: "page-a", sectionId: "section-a" },
    contentTypeId: "image",
    panel: { id: "image-panel", typeId: "image", title: "Response map", sourceId: "image-source" },
    source: {
      kind: "staticImage",
      origin: { kind: "package", path: `data/authored/${"a".repeat(64)}.png` },
      alt: "Response map",
    },
  });
  const html = renderToStaticMarkup(React.createElement(wizardModule.StaticContentWizard, {
    open: true,
    dashboard: { pages: [{ id: "page-a", sections: [{ id: "section-a" }] }] },
    initialDraft: draft,
  }));
  assert.match(html, /data-image-crop-preview[\s\S]*<img[^>]+src="data\/authored\/[a-f0-9]{64}\.png"/);
});

test("surface failure boundary exposes only the actions each surface owns", () => {
  assert.equal(typeof boundaryModule?.StaticContentStateBoundary, "function");
  const render = (surface) => renderToStaticMarkup(React.createElement(
    boundaryModule.StaticContentStateBoundary,
    {
      surface,
      state: { status: "error", failure: { code: "missing-asset", message: "Image unavailable." } },
      onRetry() {},
      onReplace() {},
      onEdit() {},
    },
  ));
  assert.match(render("build"), /Retry[\s\S]*Replace[\s\S]*Edit/);
  assert.match(render("view"), /Retry[\s\S]*Editing is available in Build/);
  assert.doesNotMatch(render("view"), /Replace/);
  assert.match(render("fullscreen"), /Retry[\s\S]*Editing is available in Build/);
  assert.doesNotMatch(render("audience"), /<button/);
});

test("Build exposes separate chart and static commands through real routed controls", () => {
  const html = renderToStaticMarkup(React.createElement(buildHeaderModule.default, {
    draftCoordinator: { slots: { layout: { status: "clean" }, chart: { status: "clean" } } },
    onAddChart() {},
    onAddStaticContent() {},
  }));
  assert.match(html, />Add chart</);
  assert.match(html, />Add static content</);
  assert.equal((html.match(/>Add chart</g) ?? []).length, 1);
  assert.equal((html.match(/>Add static content</g) ?? []).length, 1);
});

test("typed static panels suppress source and CSV actions while retaining fullscreen", () => {
  const html = renderToStaticMarkup(React.createElement(panelActionsModule.default, {
    chartId: "static-panel",
    chartTitle: "Situation",
    sourceId: "static-source",
    source: { kind: "staticText" },
    staticContent: true,
  }));
  assert.doesNotMatch(html, /view-source-csv|Show chart details|Details/);
  assert.match(html, /Focus chart/);
});
