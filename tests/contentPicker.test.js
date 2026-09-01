import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { makeDashboardV5, makeMediaItem } from "./helpers/contentLibraryFixtures.js";
import { createContentDraftCoordinator } from "../src/content-library/contentDraftTransaction.js";
import { buildContentDependencyGraph } from "../src/content-library/contentDependencyGraph.js";
import { prepareContentDeletion } from "../src/content-library/contentDeletionTransaction.js";

const vite = await createServer({
  root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true },
});
const pickerModule = await vite.ssrLoadModule("/src/components/source-content/MediaPicker.jsx");
const catalogueModule = await vite.ssrLoadModule("/src/components/source-content/MediaCatalogue.jsx");
await vite.close();

const {
  default: MediaPicker,
  createLocalMediaCandidate,
  importExternalMediaFile,
  partitionMediaPickerItems,
} = pickerModule;
const { buildManagerMediaDraft, updateManagerMediaChoice } = catalogueModule;

const mediaItems = {
  stored: makeMediaItem({ mediaId: "stored", current: { kind: "asset", assetId: "asset-stored" } }),
  packaged: makeMediaItem({
    mediaId: "packaged", current: { kind: "package", path: `data/authored/${"a".repeat(64)}.png` },
    origin: "packaged", health: "ready",
  }),
  external: makeMediaItem({
    mediaId: "external", current: { kind: "url", url: "https://example.test/map.png" },
    origin: "external", health: "external",
  }),
};

test("shared media chooser presents existing and upload as equal source paths", () => {
  for (const mode of ["qmd", "image"]) {
    const html = renderToStaticMarkup(React.createElement(MediaPicker, { mediaItems, mode }));
    assert.match(html, /data-media-source-path="existing"/);
    assert.match(html, /Use existing dashboard media/);
    assert.match(html, /data-media-source-path="upload"/);
    assert.match(html, /Upload new image/);
  }
});

test("QMD picker separates selectable local media from non-selectable External import actions", () => {
  const groups = partitionMediaPickerItems(mediaItems, { mode: "qmd" });
  assert.deepEqual(groups.local.map(({ mediaId }) => mediaId), ["packaged", "stored"]);
  assert.deepEqual(groups.external.map(({ mediaId }) => mediaId), ["external"]);
  const html = renderToStaticMarkup(React.createElement(MediaPicker, { mediaItems, mode: "qmd" }));
  assert.match(html, /Available local media/);
  assert.match(html, /External \/ Network required/);
  assert.match(html, /Import as local media/);
  assert.doesNotMatch(html, /value="external"/);
});

test("Image picker may select the original external identity", () => {
  const groups = partitionMediaPickerItems(mediaItems, { mode: "image" });
  assert.equal(groups.selectable.some(({ mediaId }) => mediaId === "external"), true);
  const html = renderToStaticMarkup(React.createElement(MediaPicker, { mediaItems, mode: "image" }));
  assert.match(html, /value="external"/);
});

test("Image picker excludes every unhealthy or invalid identity and explains why it is unavailable", () => {
  const inventory = {
    ...mediaItems,
    missing: makeMediaItem({ mediaId: "missing", displayName: "Missing", health: "missing" }),
    corrupt: makeMediaItem({ mediaId: "corrupt", displayName: "Corrupt", health: "corrupt" }),
    relink: makeMediaItem({ mediaId: "relink", displayName: "Relink", health: "needs-relink" }),
    review: makeMediaItem({ mediaId: "review", displayName: "Review", health: "needs-review" }),
    "invalid-external": {
      ...mediaItems.external,
      mediaId: "invalid-external",
      displayName: "Invalid external",
      current: { kind: "url", url: "http://example.test/unsafe.png" },
    },
  };
  const image = partitionMediaPickerItems(inventory, { mode: "image" });
  assert.deepEqual(image.selectable.map(({ mediaId }) => mediaId), ["external", "packaged", "stored"]);
  assert.deepEqual(image.unavailable.map(({ item }) => item.mediaId), ["corrupt", "invalid-external", "missing", "relink", "review"]);
  const qmd = partitionMediaPickerItems(inventory, { mode: "qmd" });
  assert.deepEqual(qmd.selectable.map(({ mediaId }) => mediaId), ["packaged", "stored"]);

  const html = renderToStaticMarkup(React.createElement(MediaPicker, { mediaItems: inventory, mode: "image" }));
  for (const id of ["missing", "corrupt", "relink", "review", "invalid-external"]) {
    assert.doesNotMatch(html, new RegExp(`value="${id}"`));
  }
  assert.match(html, /Unavailable media/);
  assert.match(html, /Missing.*Missing media cannot be selected/s);
  assert.match(html, /Invalid external.*valid External HTTPS/s);
});

test("validated local candidate carries one new logical identity over the staged physical hash", () => {
  const candidate = createLocalMediaCandidate({
    mediaId: "media-local", displayName: "Local map", defaultDescription: "Response area",
    assetId: "asset-hash", manifestEntry: manifest(),
  });
  assert.equal(candidate.mediaItem.mediaId, "media-local");
  assert.equal(candidate.mediaItem.current.assetId, "asset-hash");
  assert.equal(candidate.mediaItem.defaultDescription, "Response area");
  assert.deepEqual(candidate.assets, { "asset-hash": manifest() });
});

test("manager duplicate choice physically dedupes both ways but collapses logical identity only for Reuse existing", () => {
  const dashboard = makeDashboardV5();
  const used = dashboard.contentLibrary.mediaItems["media-image-source"];
  const existing = makeMediaItem({ mediaId: "media-unused-duplicate", current: structuredClone(used.current) });
  dashboard.contentLibrary.mediaItems[existing.mediaId] = existing;
  const staged = createLocalMediaCandidate({
    mediaId: "media-separate", displayName: "Separate map", defaultDescription: "Separate alt",
    assetId: existing.current.assetId, manifestEntry: dashboard.assets[existing.current.assetId],
  });
  const reuse = buildManagerMediaDraft({ dashboard, candidate: staged, duplicate: existing, choice: "reuse" });
  const separate = buildManagerMediaDraft({ dashboard, candidate: staged, duplicate: existing, choice: "separate" });
  const reusedCandidate = reuse.buildCandidate({ dashboard, draft: reuse });
  const separateCandidate = separate.buildCandidate({ dashboard, draft: separate });
  assert.deepEqual(reusedCandidate.itemIds, [existing.mediaId]);
  assert.equal(Object.hasOwn(reusedCandidate.dashboard.contentLibrary.mediaItems, "media-separate"), false);
  assert.deepEqual(separateCandidate.itemIds, ["media-separate"]);
  assert.equal(separateCandidate.dashboard.contentLibrary.mediaItems["media-separate"].current.assetId, existing.current.assetId);
  assert.equal(Object.keys(separateCandidate.dashboard.assets).length, Object.keys(dashboard.assets).length);
  assert.equal(separateCandidate.dashboard.assets[existing.current.assetId].storageState, "durable");
});

test("manager duplicate radio changes immediately move the real coordinator retainer and deletion block", () => {
  const dashboard = makeDashboardV5();
  const used = dashboard.contentLibrary.mediaItems["media-image-source"];
  const existing = {
    ...structuredClone(used),
    mediaId: "media-unused-duplicate",
    displayName: "Unused duplicate",
  };
  dashboard.contentLibrary.mediaItems[existing.mediaId] = existing;
  const candidate = createLocalMediaCandidate({
    mediaId: "media-separate", displayName: "Separate map", defaultDescription: "Separate alt",
    assetId: existing.current.assetId, manifestEntry: dashboard.assets[existing.current.assetId],
  });
  const coordinator = createContentDraftCoordinator({
    getDashboard: () => dashboard,
    commitDashboard: async (value) => value,
    assetStore: {},
  });
  const initial = buildManagerMediaDraft({ dashboard, candidate, duplicate: existing, choice: "separate" });
  const { buildCandidate: _buildCandidate, ...staged } = initial;
  coordinator.stageDraft(staged);

  updateManagerMediaChoice({ contentDraftCoordinator: coordinator, draftId: staged.draftId, dashboard, candidate, duplicate: existing, choice: "reuse" });
  let snapshot = coordinator.getActiveRetainers();
  assert.deepEqual(snapshot.mediaIds, [existing.mediaId]);
  assert.deepEqual(snapshot.assetIds, [candidate.assetId]);
  let graph = buildContentDependencyGraph({ dashboard, activeRetainers: snapshot });
  assert.equal(prepareContentDeletion({ dashboard, graph, item: { kind: "media", id: existing.mediaId } }).status, "blocked");

  updateManagerMediaChoice({ contentDraftCoordinator: coordinator, draftId: staged.draftId, dashboard, candidate, duplicate: existing, choice: "separate" });
  snapshot = coordinator.getActiveRetainers();
  assert.deepEqual(snapshot.mediaIds, [candidate.mediaItem.mediaId]);
  assert.deepEqual(snapshot.assetIds, [candidate.assetId]);
  graph = buildContentDependencyGraph({ dashboard, activeRetainers: snapshot });
  const separatePlan = prepareContentDeletion({ dashboard, graph, item: { kind: "media", id: existing.mediaId } });
  assert.deepEqual(separatePlan.directUses, []);
  assert.deepEqual(separatePlan.retainers, []);
  assert.equal(separatePlan.status, "ready");
});

test("external import uses only an explicit browser fetch and reports local-upload fallback", async () => {
  const calls = [];
  const imported = await importExternalMediaFile(mediaItems.external, {
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, blob: async () => new Blob([new Uint8Array([1])], { type: "image/png" }) };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.test/map.png");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(imported.type, "image/png");
  await assert.rejects(() => importExternalMediaFile(mediaItems.external, {
    fetchImpl: async () => { throw new TypeError("CORS blocked"); },
  }), /local file upload/i);
});

function manifest() {
  return { mediaType: "image/png", byteLength: 20, width: 4, height: 5, sha256: "a".repeat(64), storageState: "staged" };
}
