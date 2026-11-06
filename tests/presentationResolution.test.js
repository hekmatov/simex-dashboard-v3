import test from "node:test";
import assert from "node:assert/strict";
import { resolvePresentationResolution, fitPresentationStage } from "../src/lib/presentationResolution.js";
import { normalizeDashboardBoundary, serializeDashboardBundle, parseDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { validateDashboardStructure } from "../src/charting/config/dashboardConfigStructure.js";

test("declared resolution defaults to1920×1080 and requires bounded integer dimensions", () => {
  assert.deepEqual(resolvePresentationResolution(), { width: 1920, height: 1080 });
  assert.deepEqual(resolvePresentationResolution({ width: 1080, height: 1920 }), { width: 1080, height: 1920 });
  for (const value of [null, {}, { width: 0, height: 1080 }, { width: "1920", height: 1080 },
    { width: 1920.5, height: 1080 }, { width: 7680, height: 7680 }, { width: 1920, height: 1080, extra: true }]) {
    assert.throws(() => resolvePresentationResolution(value), /resolution/i);
  }
});
test("letterboxing uniformly fits landscape and portrait stages without changing layout dimensions", () => {
  assert.deepEqual(fitPresentationStage({ width: 1920, height: 1080 }, { width: 1600, height: 1000 }),
    { width: 1920, height: 1080, scale: 5 / 6, left: 0, top: 50 });
  assert.deepEqual(fitPresentationStage({ width: 1080, height: 1920 }, { width: 1920, height: 1080 }),
    { width: 1080, height: 1920, scale: 0.5625, left: 656.25, top: 0 });
});
test("optional target resolution roundtrips through current configuration and package boundaries", async () => {
  const base = { configVersion: 6, id: "resolution-test", title: "Resolution test", timezone: "UTC",
    home: { enabled: false }, contentLibrary: { mediaItems: {}, sourceEntries: {} },
    dataSources: {}, chronoGroups: [], pages: [{ id: "page", sections: [{ id: "section", panels: [] }] }] };
  assert.equal(Object.hasOwn(normalizeDashboardBoundary(base), "presentationResolution"), false);
  const candidate = { ...base, presentationResolution: { width: 1280, height: 720 } };
  assert.doesNotThrow(() => validateDashboardStructure(candidate));
  const restored = parseDashboardBundle(JSON.stringify(serializeDashboardBundle(candidate)));
  assert.deepEqual(restored.presentationResolution, candidate.presentationResolution);
  assert.deepEqual(restored.pages, base.pages);
  assert.deepEqual(restored.chronoGroups, base.chronoGroups);
  assert.throws(() => validateDashboardStructure({ ...candidate, presentationResolution: { width: -1, height: 720 } }), /resolution/i);
});
