import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { makeDashboardV5, makeMediaItem } from "./helpers/contentLibraryFixtures.js";

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
const { buildManagerMediaDraft } = catalogueModule;

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
  const existing = dashboard.contentLibrary.mediaItems["media-image-source"];
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
