import assert from "node:assert/strict";
import test from "node:test";

import { resolveChartRendering } from "../src/charting/rendering/resolveChartRendering.js";
import { resolveStaticImageSource } from "../src/static-content/staticSourceResolver.js";

const imageSource = {
  kind: "staticImage",
  sourceVersion: 1,
  revision: 4,
  origin: { kind: "url", url: "https://example.test/briefing.png" },
  alt: "Briefing map",
  decorative: false,
  fit: "contain",
  crop: { x: 0, y: 0, width: 1000, height: 1000 },
  rotation: 0,
};

test("static Image resolution is identity-based and ignores playback options", () => {
  const withoutTime = resolveStaticImageSource(imageSource, { sourceId: "briefing" });
  const withTime = resolveStaticImageSource(imageSource, {
    sourceId: "briefing",
    timeContext: { activeEpochMs: Date.UTC(2027, 4, 1) },
    frameId: "injected-frame",
  });

  assert.deepEqual(withTime, withoutTime);
  assert.equal(withTime.sourceId, "briefing");
  assert.equal(withTime.revision, 4);
});

test("typed static rendering strips time and bypasses chart data preparation", () => {
  const resolution = resolveChartRendering({
    chart: { id: "image-a", typeId: "image", sourceId: "briefing", title: "Briefing" },
    rows: [{ observation: "must not be prepared" }],
    datasetProfile: { columns: [{ name: "observation", type: "temporal" }] },
    timeContext: { activeEpochMs: Date.UTC(2027, 4, 1), mode: "trace" },
    renderContext: { sources: { briefing: imageSource }, assets: {} },
  });

  assert.equal(resolution.status, "available");
  assert.equal(resolution.prepared, null);
  assert.equal(resolution.inputKey.timeContext, undefined);
  assert.equal(resolution.model.revision, 4);
});
