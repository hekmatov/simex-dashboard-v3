import assert from "node:assert/strict";
import test from "node:test";

import { STATIC_CONTENT_STAGE_LABELS, STATIC_CONTENT_STAGES, createStaticContentDraft, finalizeStaticContentDraft, isStaticContentDraftDirty, projectStaticContentDraftOwner, reduceStaticContentDraft, staticContentStageReadiness } from "../src/static-content/forms/staticContentDraft.js";

test("static authoring retains the exact four-stage workflow", () => {
  assert.deepEqual(STATIC_CONTENT_STAGES, ["destination", "content-type", "content", "preview-and-add"]);
  assert.deepEqual(STATIC_CONTENT_STAGE_LABELS, ["Destination", "Content type", "Content", "Preview & add"]);
  assert.equal(createStaticContentDraft().persistence, "application-session-only");
});

test("Text/Image ownership starts on the first semantic change and stays scoped to creation or placement edit", () => {
  let creation = createStaticContentDraft({
    destination: { pageId: "overview", sectionId: "response" },
    contentTypeId: "freeText",
    stage: "content",
  });
  assert.equal(projectStaticContentDraftOwner({ draft: creation, dirty: false, active: true }), null);
  creation = reduceStaticContentDraft(creation, { type: "updateSource", updates: { qmd: "Meaningful text" } });
  const active = projectStaticContentDraftOwner({ draft: creation, dirty: true, active: true, surface: "composer", focusId: "static-qmd-source-composer-tab", scrollTop: 240 });
  assert.equal(active.kind, "text-image-create");
  assert.equal(active.draftId, `text-image-create:${creation.draftIdentity.panelId}`);
  assert.equal(active.activity, "active");
  assert.deepEqual(active.restoration, { surface: "composer", focusId: "static-qmd-source-composer-tab", scrollTop: 240 });
  assert.equal(projectStaticContentDraftOwner({ draft: creation, dirty: true, active: false }).draftId, active.draftId);

  const edit = projectStaticContentDraftOwner({ draft: { ...creation, mode: "edit" }, dirty: true, active: false, placementId: "placement-a", status: "error" });
  assert.equal(edit.draftId, "text-image-edit:placement-a");
  assert.equal(edit.activity, "suspended");
  assert.equal(edit.status, "error");
});

test("creation destination and type choices stay clean until a retainable semantic mutation", () => {
  let creation = createStaticContentDraft();
  creation = reduceStaticContentDraft(creation, {
    type: "setDestination",
    destination: { pageId: "overview", sectionId: "response" },
  });
  creation = reduceStaticContentDraft(creation, { type: "setContentType", contentTypeId: "freeText" });
  creation = reduceStaticContentDraft(creation, { type: "setStage", stage: "content" });

  assert.equal(isStaticContentDraftDirty(creation), false);
  assert.equal(projectStaticContentDraftOwner({ draft: creation, dirty: true, active: false }), null);

  creation = reduceStaticContentDraft(creation, { type: "updateSource", updates: { qmd: "Unsaved draft" } });
  assert.equal(isStaticContentDraftDirty(creation), true);
  assert.equal(projectStaticContentDraftOwner({ draft: creation, active: false })?.kind, "text-image-create");
  assert.throws(() => finalizeStaticContentDraft(creation), /Preview & add/i);
});

test("Text and Image drafts default to Standard 2x1 and persist the shared footprint model", () => {
  for (const contentTypeId of ["freeText", "image"]) {
    let draft = createStaticContentDraft({
      destination: { pageId: "overview", sectionId: "response" },
      contentTypeId,
      stage: "content",
    });
    assert.deepEqual(draft.panel.layout, { size: "standard", width: 2, height: 1 });
    draft = reduceStaticContentDraft(draft, { type: "setPanel", updates: { layout: { size: "wide", width: 4, height: 1 } } });
    assert.deepEqual(draft.panel.layout, { size: "wide", width: 4, height: 1 });
    draft = reduceStaticContentDraft(draft, { type: "setPanel", updates: { layout: { size: "standard", width: 3, height: 0.75 } } });
    assert.deepEqual(draft.panel.layout, { size: "standard", width: 3, height: 0.75 });
  }
});

test("Image title typing preserves explicit visibility and presentation survives finalization", () => {
  let draft = createStaticContentDraft({
    destination: { pageId: "overview", sectionId: "response" },
    contentTypeId: "image",
    stage: "content",
    panel: {
      id: "presented-image",
      typeId: "image",
      sourceId: "presented-image-source",
      title: "Before",
      presentation: {
        title: {
          align: "right",
          visible: false,
          fontSize: 21,
          bold: true,
          italic: true,
          underline: true,
        },
        image: { background: { mode: "default", color: "#AABBCC" } },
      },
    },
    placement: {
      kind: "staticImage",
      sourceVersion: 2,
      mediaId: "presented-image-media",
      alt: "Outbreak map",
      decorative: false,
      fit: "contain",
      crop: { x: 0, y: 0, width: 1000, height: 1000 },
      rotation: 0,
    },
    mediaItem: {
      mediaId: "presented-image-media",
      revision: 1,
      current: { kind: "url", url: "https://example.test/outbreak.png" },
      displayName: "Outbreak map",
      defaultDescription: "Outbreak map",
      origin: "external",
      health: "external",
      mediaType: "image/png",
    },
  });

  draft = reduceStaticContentDraft(draft, { type: "setPanel", updates: { title: "After" } });
  assert.equal(draft.panel.presentation.title.visible, false);
  assert.equal(draft.panel.presentation.title.fontSize, 21);
  assert.deepEqual(draft.panel.presentation.image.background, {
    mode: "default",
    color: "#AABBCC",
  });

  draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" });
  const finalized = finalizeStaticContentDraft(draft);
  assert.deepEqual(finalized.panel.presentation, draft.panel.presentation);
});

test("returning to Destination does not disable satisfied later Text/Image stages", () => {
  const ready = createStaticContentDraft({
    destination: { pageId: "overview", sectionId: "response" },
    contentTypeId: "freeText",
    stage: "destination",
    panel: {
      id: "ready-text",
      typeId: "freeText",
      sourceId: "ready-text-source",
      title: "Situation",
    },
    placement: { kind: "staticText", qmd: "Ready content" },
  });

  assert.deepEqual(staticContentStageReadiness(ready, "destination"), { ready: true, reason: "" });
  assert.deepEqual(staticContentStageReadiness(ready, "content"), { ready: true, reason: "" });
  assert.deepEqual(staticContentStageReadiness(ready, "preview-and-add"), { ready: true, reason: "" });

  const waiting = staticContentStageReadiness(ready, "preview-and-add", { previewReady: false });
  assert.equal(waiting.ready, false);
  assert.match(waiting.reason, /preview.*finish validating/i);
  const blocked = reduceStaticContentDraft(ready, {
    type: "trySetStage",
    stage: "preview-and-add",
    previewReady: false,
  });
  assert.equal(blocked.stage, "destination");
  assert.match(blocked.validation.errors[0].message, /preview.*finish validating/i);
});

test("blank panel titles require an explicit No title choice without leaving the wizard", () => {
  let draft = createStaticContentDraft({
    destination: { pageId: "overview", sectionId: "response" },
    contentTypeId: "freeText",
    stage: "content",
    panel: { id: "untitled-panel", typeId: "freeText", sourceId: "untitled-source", title: "" },
    placement: { kind: "staticText", qmd: "Untitled content" },
  });

  assert.equal(draft.noTitle, false);
  const missingChoice = reduceStaticContentDraft(draft, { type: "trySetStage", stage: "preview-and-add" });
  assert.equal(missingChoice.stage, "content");
  assert.deepEqual(missingChoice.validation.errors, [{
    field: "title",
    focusId: "static-panel-title",
    message: "Enter a panel title or select No title.",
  }]);

  draft = reduceStaticContentDraft(draft, { type: "setNoTitle", noTitle: true });
  assert.equal(isStaticContentDraftDirty(draft), true);
  draft = reduceStaticContentDraft(draft, { type: "trySetStage", stage: "preview-and-add" });
  assert.equal(draft.stage, "preview-and-add");
  const result = finalizeStaticContentDraft(draft);
  assert.equal(result.panel.title, "");
  assert.equal("noTitle" in result, false);
  assert.equal("noTitle" in result.panel, false);
});

test("a typed title and No title remain an explicit conflict focused on the checkbox", () => {
  let draft = createStaticContentDraft({
    destination: { pageId: "overview", sectionId: "response" },
    contentTypeId: "freeText",
    stage: "content",
    panel: { id: "conflict-panel", typeId: "freeText", sourceId: "conflict-source", title: "Situation" },
    placement: { kind: "staticText", qmd: "Conflicting choice" },
  });
  draft = reduceStaticContentDraft(draft, { type: "setNoTitle", noTitle: true });
  const conflict = reduceStaticContentDraft(draft, { type: "trySetStage", stage: "preview-and-add" });

  assert.equal(conflict.stage, "content");
  assert.deepEqual(conflict.validation.errors, [{
    field: "title",
    focusId: "static-panel-no-title",
    message: "Clear the title or unselect No title.",
  }]);
});

test("existing blank-title edits restore with No title selected and keep it in the dirty baseline", () => {
  const blank = createStaticContentDraft({
    mode: "edit",
    destination: { pageId: "overview", sectionId: "response" },
    panel: { id: "blank-panel", typeId: "freeText", sourceId: "blank-source", title: "" },
    placement: { kind: "staticText", qmd: "Existing blank panel" },
  });
  const titled = createStaticContentDraft({
    mode: "edit",
    destination: { pageId: "overview", sectionId: "response" },
    panel: { id: "titled-panel", typeId: "freeText", sourceId: "titled-source", title: "Existing title" },
    placement: { kind: "staticText", qmd: "Existing titled panel" },
  });

  assert.equal(blank.noTitle, true);
  assert.equal(titled.noTitle, false);
  const changed = reduceStaticContentDraft(blank, { type: "setNoTitle", noTitle: false });
  assert.equal(isStaticContentDraftDirty(changed), true);
  const reset = reduceStaticContentDraft(changed, { type: "reset" });
  assert.equal(reset.noTitle, true);
  assert.equal(isStaticContentDraftDirty(reset), false);
});

test("owner-scoped reset restores the baseline without retiring the edit surface", () => {
  let draft = createStaticContentDraft({
    mode: "edit",
    destination: { pageId: "overview", sectionId: "response" },
    panel: { id: "text-panel", typeId: "freeText", sourceId: "text-source", title: "Before" },
    placement: { kind: "staticText", qmd: "Before" },
    restoration: { stage: "content", surface: "composer", focusId: "portable-qmd-composer-surface", scrollTop: 180 },
  });
  draft = reduceStaticContentDraft(draft, { type: "setPanel", updates: { title: "After" } });
  const reset = reduceStaticContentDraft(draft, { type: "reset" });
  assert.equal(reset.panel.title, "Before");
  assert.equal(reset.source.qmd, "Before");
  assert.equal(reset.status, "editing");
  assert.equal(reset.stage, "content");
  assert.equal(isStaticContentDraftDirty(reset), false);
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

test("media selection prefills only a new Image placement and preserves existing placement alt", () => {
  const selected = mediaItem();
  let created = createStaticContentDraft({
    mode: "create", stage: "content", destination: { pageId: "page-a", sectionId: "section-a" },
    contentTypeId: "image", panel: panel(), assets: {},
  });
  created = reduceStaticContentDraft(created, { type: "selectMediaItem", mediaItem: selected });
  assert.equal(created.source.mediaId, selected.mediaId);
  assert.equal(created.source.alt, selected.defaultDescription);
  const renamedDefault = { ...selected, defaultDescription: "Future placement description" };
  assert.equal(created.source.alt, "Response map");
  let futurePlacement = createStaticContentDraft({
    mode: "create", stage: "content", destination: { pageId: "page-a", sectionId: "section-a" },
    contentTypeId: "image", panel: panel(), assets: {},
  });
  futurePlacement = reduceStaticContentDraft(futurePlacement, { type: "selectMediaItem", mediaItem: renamedDefault });
  assert.equal(futurePlacement.source.alt, "Future placement description");

  let edited = createStaticContentDraft({
    mode: "edit", destination: { pageId: "page-a", sectionId: "section-a" },
    panel: panel(), placement: placement({ alt: "Placement-owned description" }), mediaItem: mediaItem(), assets: {},
  });
  const replacement = { ...selected, mediaId: "media-other", defaultDescription: "Changed library default" };
  edited = reduceStaticContentDraft(edited, { type: "selectMediaItem", mediaItem: replacement });
  assert.equal(edited.source.mediaId, "media-other");
  assert.equal(edited.source.alt, "Placement-owned description");
  assert.ok(edited.imageEditing.replacementUndo);
  edited = reduceStaticContentDraft(edited, { type: "setImageTransform", crop: { x: 100, y: 100, width: 700, height: 700 }, rotation: 90, fit: "cover" });
  edited = reduceStaticContentDraft(edited, { type: "resetImage" });
  assert.equal(edited.source.mediaId, "media-other");
  assert.equal(edited.source.alt, "Placement-owned description");
  assert.equal(edited.imageEditing.replacementUndo.source.mediaId, "media-map");
  assert.deepEqual({ crop: edited.source.crop, rotation: edited.source.rotation, fit: edited.source.fit }, {
    crop: { x: 0, y: 0, width: 1000, height: 1000 }, rotation: 0, fit: "contain",
  });
  edited = reduceStaticContentDraft(edited, { type: "undoImageReplacement" });
  assert.equal(edited.source.mediaId, "media-map");
  assert.equal(edited.source.alt, "Placement-owned description");
});

test("a second media choice in a new Image draft is a replacement and resets image transforms", () => {
  const first = mediaItem();
  const second = { ...mediaItem(), mediaId: "media-replacement", displayName: "Replacement map" };
  let draft = createStaticContentDraft({
    mode: "create", stage: "content", destination: { pageId: "page-a", sectionId: "section-a" },
    contentTypeId: "image", panel: panel(), assets: {},
  });
  draft = reduceStaticContentDraft(draft, { type: "selectMediaItem", mediaItem: first });
  draft = reduceStaticContentDraft(draft, { type: "setImageAlt", alt: "Placement-owned description" });
  draft = reduceStaticContentDraft(draft, {
    type: "setImageTransform",
    crop: { x: 120, y: 80, width: 700, height: 800 },
    rotation: 90,
    fit: "cover",
  });
  draft = reduceStaticContentDraft(draft, { type: "selectMediaItem", mediaItem: second });

  assert.deepEqual({ crop: draft.source.crop, rotation: draft.source.rotation, fit: draft.source.fit }, {
    crop: { x: 0, y: 0, width: 1000, height: 1000 }, rotation: 0, fit: "contain",
  });
  assert.equal(draft.source.mediaId, second.mediaId);
  assert.equal(draft.source.alt, "Placement-owned description");
  assert.equal(draft.imageEditing.altReviewRequired, true);
  assert.equal(draft.imageEditing.replacementUndo.mediaItem.mediaId, first.mediaId);
  assert.equal(draft.imageEditing.replacementUndo.source.crop.x, 120);

  draft = reduceStaticContentDraft(draft, { type: "undoImageReplacement" });
  assert.equal(draft.source.mediaId, first.mediaId);
  assert.equal(draft.source.crop.x, 120);
});

test("QMD draft media stays draft-owned without changing the exact finalized payload", () => {
  let draft = createStaticContentDraft({
    stage: "content",
    destination: { pageId: "page-a", sectionId: "section-a" }, contentTypeId: "freeText",
    panel: { ...panel(), typeId: "freeText", sourceId: "text-source", title: "Situation" },
    placement: { kind: "staticText", qmd: "Situation" },
  });
  const local = {
    ...makeLocalMediaItem(),
    defaultDescription: "Local response map",
  };
  const original = structuredClone(local);
  const stagedManifest = assetManifest("staged");
  draft = reduceStaticContentDraft(draft, {
    type: "insertQmdMedia", mediaItem: local, manifestEntry: stagedManifest,
  });
  assert.match(draft.source.qmd, /!\[Local response map\]\(simex-media:media-local\)/);
  assert.equal(draft.pendingMediaItems["media-local"].mediaId, "media-local");
  assert.deepEqual(local, original);
  assert.deepEqual(draft.pendingMediaItems["media-local"].current, original.current);
  assert.deepEqual(draft.assets["asset-local"], stagedManifest);
  draft = reduceStaticContentDraft(draft, { type: "setStage", stage: "preview-and-add" });
  const result = finalizeStaticContentDraft(draft);
  assert.deepEqual(Object.keys(result), ["destination", "panel", "placement", "mediaItem", "assets", "stagedAssetIds"]);
  assert.equal(result.mediaItem, null);
});

test("staging replacement QMD media retains its bytes without inserting a duplicate reference", () => {
  const draft = createStaticContentDraft({
    stage: "content",
    destination: { pageId: "page-a", sectionId: "section-a" }, contentTypeId: "freeText",
    panel: { ...panel(), typeId: "freeText", sourceId: "text-source", title: "Situation" },
    placement: { kind: "staticText", qmd: "![Old](simex-media:old)" },
  });
  const mediaItem = makeLocalMediaItem();
  const manifestEntry = assetManifest("staged");
  const staged = reduceStaticContentDraft(draft, { type: "stageQmdMedia", mediaItem, manifestEntry });

  assert.equal(staged.source.qmd, draft.source.qmd);
  assert.equal(staged.pendingMediaItems[mediaItem.mediaId].mediaId, mediaItem.mediaId);
  assert.deepEqual(staged.assets[mediaItem.current.assetId], manifestEntry);
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

function makeLocalMediaItem() {
  return {
    mediaId: "media-local", revision: 1, current: { kind: "asset", assetId: "asset-local" },
    displayName: "Local map", defaultDescription: "", origin: "uploaded", health: "ready",
    dimensions: { width: 4, height: 5 }, byteLength: 20, mediaType: "image/png",
  };
}
