import assert from "node:assert/strict";
import test from "node:test";

import { resolveChartRendering } from "../src/charting/rendering/resolveChartRendering.js";
import { resolveStaticImageSource } from "../src/static-content/staticSourceResolver.js";

const placement = { kind: "staticImage", sourceVersion: 2, mediaId: "media-briefing", alt: "Briefing map", decorative: false, fit: "contain", crop: { x: 0, y: 0, width: 1000, height: 1000 }, rotation: 0 };
const mediaItem = { mediaId: "media-briefing", revision: 8, current: { kind: "url", url: "https://example.test/current.png" }, displayName: "Briefing", defaultDescription: "", origin: "external", health: "external" };

test("V5 Image resolution obtains current origin and revision from its MediaItem", () => {
  const withoutTime = resolveStaticImageSource(placement, { sourceId: "briefing", mediaItems: { "media-briefing": mediaItem } });
  const withTime = resolveStaticImageSource(placement, { sourceId: "briefing", mediaItems: { "media-briefing": mediaItem }, timeContext: { activeEpochMs: Date.UTC(2027, 4, 1) }, frameId: "ignored" });
  assert.deepEqual(withTime, withoutTime);
  assert.equal(withTime.mediaId, "media-briefing");
  assert.equal(withTime.revision, 8);
  assert.equal(withTime.src, "https://example.test/current.png");
  assert.equal(withTime.alt, "Briefing map");
});

test("resolver fails closed for missing identity and a stale expected revision", () => {
  assert.equal(resolveStaticImageSource(placement, { mediaItems: {} }).failure.code, "missing-media");
  assert.equal(resolveStaticImageSource(placement, { expectedRevision: 7, mediaItems: { "media-briefing": mediaItem } }).failure.code, "stale-media-revision");
});

test("chart rendering transports media identity and strips time before Image resolution", () => {
  const resolution = resolveChartRendering({
    chart: { id: "image-panel", typeId: "image", sourceId: "briefing", roles: {} },
    rows: [{ malicious: "ignored" }],
    timeContext: { activeEpochMs: Date.UTC(2027, 4, 1) },
    renderContext: { sources: { briefing: placement }, mediaItems: { "media-briefing": mediaItem }, assets: {} },
  });
  assert.equal(resolution.status, "available");
  assert.equal(resolution.model.mediaId, "media-briefing");
  assert.equal(resolution.model.revision, 8);
  assert.equal(resolution.model.staticSource, true);
});
