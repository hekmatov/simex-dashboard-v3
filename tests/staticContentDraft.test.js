import assert from "node:assert/strict";
import test from "node:test";

import { STATIC_CONTENT_STAGE_LABELS, STATIC_CONTENT_STAGES, createStaticContentDraft, finalizeStaticContentDraft, isStaticContentDraftDirty, reduceStaticContentDraft } from "../src/static-content/forms/staticContentDraft.js";

test("static authoring retains the exact four-stage workflow", () => {
  assert.deepEqual(STATIC_CONTENT_STAGES, ["destination", "content-type", "content", "preview-and-add"]);
  assert.deepEqual(STATIC_CONTENT_STAGE_LABELS, ["Destination", "Content type", "Content", "Preview & add"]);
  assert.equal(createStaticContentDraft().persistence, "application-session-only");
});

for (const [kind, current, expectedOrigin, staged] of [
  ["upload", { kind: "asset", assetId: "asset-map" }, "uploaded", ["asset-map"]],
  ["link", { kind: "url", url: "https://example.test/map.png" }, "external", []],
  ["package", { kind: "package", path: `data/authored/${"a".repeat(64)}.png` }, "packaged", []],
]) {
  test(`Image ${kind} finalization returns the exact atomic V5 payload`, () => {
    let draft = imageDraft();
    draft = reduceStaticContentDraft(draft, { type: "setMediaCurrent", current });
    if (kind === "upload") {
      draft = reduceStaticContentDraft(imageDraft(), {
        type: "replaceImage", current, origin: current,
        manifestEntry: assetManifest("staged"),
      });
    }
    draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" });
    const result = finalizeStaticContentDraft(draft);
    assert.deepEqual(Object.keys(result), ["destination", "panel", "placement", "mediaItem", "assets", "stagedAssetIds"]);
    assert.equal(result.placement.sourceVersion, 2);
    assert.equal(result.placement.mediaId, result.mediaItem.mediaId);
    assert.equal(result.mediaItem.current.kind, current.kind);
    assert.equal(result.mediaItem.origin, expectedOrigin);
    assert.deepEqual(result.stagedAssetIds, staged);
  });
}

test("explicit reuse preserves the selected media identity and revision", () => {
  let draft = createStaticContentDraft({
    mode: "create", stage: "content",
    destination: { pageId: "page-a", sectionId: "section-a" },
    contentTypeId: "image", panel: panel(), placement: placement(), mediaItem: mediaItem(), assets: {},
  });
  draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" });
  const result = finalizeStaticContentDraft(draft);
  assert.equal(result.placement.mediaId, "media-map");
  assert.equal(result.mediaItem.revision, 7);
});

test("existing Image edit preserves placement settings, media revision, discard state, and staged inventory", () => {
  const assets = { "asset-staged": assetManifest("staged") };
  let draft = createStaticContentDraft({
    mode: "edit", destination: { pageId: "page-a", sectionId: "section-a" },
    panel: panel(), placement: placement({ fit: "cover", rotation: 90 }), mediaItem: mediaItem(), assets,
  });
  draft = reduceStaticContentDraft(draft, { type: "setImageAlt", alt: "Edited map" });
  assert.equal(isStaticContentDraftDirty(draft), true);
  const discarded = reduceStaticContentDraft(draft, { type: "discard" });
  assert.equal(discarded.placement.mediaId, "media-map");
  assert.equal(discarded.placement.fit, "cover");
  assert.equal(discarded.placement.rotation, 90);
  assert.equal(discarded.mediaItem.revision, 7);
  assert.deepEqual(discarded.assets, assets);
  assert.equal(isStaticContentDraftDirty(discarded), false);
});

test("Image validation blocks empty non-decorative alt before finalization", () => {
  let draft = imageDraft();
  draft = reduceStaticContentDraft(draft, { type: "setImageAlt", alt: "" });
  assert.throws(() => reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" }), /alternative text/i);
});

test("Image URL origin remains editable while its draft URL is incomplete", () => {
  let draft = createStaticContentDraft({
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  draft = reduceStaticContentDraft(draft, { type: "setContentType", contentTypeId: "image" });
  draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "content" });
  draft = reduceStaticContentDraft(draft, { type: "setImageAlt", alt: "Draft map" });
  draft = reduceStaticContentDraft(draft, {
    type: "setMediaCurrent",
    current: { kind: "url", url: "" },
  });
  assert.deepEqual(draft.mediaItem.current, { kind: "url", url: "" });
  assert.throws(
    () => reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" }),
    /Image URL is required/,
  );
  draft = reduceStaticContentDraft(draft, {
    type: "setMediaCurrent",
    current: { kind: "url", url: "https://example.test/final.png" },
  });
  assert.equal(draft.mediaItem.revision, 1);
});

test("Free-text remains permissive and inert with the same atomic payload keys", () => {
  let draft = createStaticContentDraft({
    destination: { pageId: "page-a", sectionId: "section-a" }, contentTypeId: "freeText",
    panel: { ...panel(), typeId: "freeText", sourceId: "text-source", title: "Situation" },
    placement: { kind: "staticText", qmd: '<script>alert(1)</script>\n<iframe src="https://example.test"></iframe>' },
  });
  draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" });
  const result = finalizeStaticContentDraft(draft);
  assert.deepEqual(Object.keys(result), ["destination", "panel", "placement", "mediaItem", "assets", "stagedAssetIds"]);
  assert.equal(result.placement.qmd, draft.placement.qmd);
  assert.equal(result.mediaItem, null);
});

function imageDraft() {
  return createStaticContentDraft({
    mode: "create", stage: "content", destination: { pageId: "page-a", sectionId: "section-a" },
    contentTypeId: "image", panel: panel(), placement: placement(), mediaItem: {
      ...mediaItem(), revision: 1, current: { kind: "asset", assetId: "missing-media-map" },
      origin: "legacy-import", health: "needs-relink",
    }, assets: {},
  });
}

function panel() {
  return { configVersion: 3, id: "image-panel", typeId: "image", title: "Response map", description: "", sourceId: "image-source", roles: {}, transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" }, presentation: { title: { align: "left" }, description: { visible: false } }, interaction: { zoom: { enabled: false }, timeSync: null }, layout: { size: "standard" } };
}

function placement(overrides = {}) {
  return { kind: "staticImage", sourceVersion: 2, mediaId: "media-map", alt: "Response map", decorative: false, fit: "contain", crop: { x: 0, y: 0, width: 1000, height: 1000 }, rotation: 0, ...overrides };
}

function mediaItem() {
  return { mediaId: "media-map", revision: 7, current: { kind: "url", url: "https://example.test/map.png" }, displayName: "Response map", defaultDescription: "Response map", origin: "external", health: "external" };
}

function assetManifest(storageState) {
  return { mediaType: "image/png", byteLength: 20, width: 4, height: 5, sha256: "a".repeat(64), storageState };
}
