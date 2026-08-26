import assert from "node:assert/strict";
import test from "node:test";

import { migrateDashboardV4ToV5 } from "../src/content-library/migrateDashboardV4ToV5.js";
import { makeDashboardV4 } from "./helpers/contentLibraryFixtures.js";

const ORIGIN_CASES = [
  ["asset", { kind: "asset", assetId: "asset-map" }, "uploaded", "ready"],
  ["package", { kind: "package", path: `data/authored/${"b".repeat(64)}.png` }, "packaged", "ready"],
  ["url", { kind: "url", url: "https://example.test/map.png" }, "external", "external"],
  ["replacement-required", { kind: "replacementRequired", reason: "Replace image" }, "legacy-import", "needs-relink"],
];

for (const [label, origin, expectedOrigin, expectedHealth] of ORIGIN_CASES) {
  test(`V4 ${label} Image migration creates one media record and a sourceVersion-2 placement`, () => {
    const input = makeDashboardV4({
      dataSources: { "image-source": { ...makeDashboardV4().dataSources["image-source"], origin } },
    });
    const migrated = migrateDashboardV4ToV5(input);
    const placement = migrated.dataSources["image-source"];
    const item = migrated.contentLibrary.mediaItems[placement.mediaId];
    assert.equal(migrated.configVersion, 5);
    assert.deepEqual(Object.keys(migrated.contentLibrary), ["mediaItems", "sourceEntries"]);
    assert.deepEqual(Object.keys(placement), [
      "kind", "sourceVersion", "mediaId", "alt", "decorative", "fit", "crop", "rotation",
    ]);
    assert.equal(placement.sourceVersion, 2);
    assert.equal(item.mediaId, placement.mediaId);
    assert.equal(item.revision, 3);
    assert.equal(item.origin, expectedOrigin);
    assert.equal(item.health, expectedHealth);
    assert.equal(Object.hasOwn(placement, "revision"), false);
    assert.equal(Object.hasOwn(placement, "origin"), false);
    assert.equal(input.configVersion, 4);
  });
}

test("V4 migration is deterministic, idempotent, and conservatively registers CSV and GeoJSON", () => {
  const input = makeDashboardV4({
    dataSources: {
      cases: { kind: "csv", path: "data/cases.csv", provenance: { label: "Cases" } },
      boundaries: { kind: "geojson", path: "data/boundaries.geojson", provenance: { label: "Boundaries" } },
    },
  });
  const first = migrateDashboardV4ToV5(input);
  assert.deepEqual(migrateDashboardV4ToV5(first), first);
  assert.deepEqual(Object.keys(first.contentLibrary.sourceEntries).sort(), ["boundaries", "cases"]);
  assert.equal(first.contentLibrary.sourceEntries.cases.origin, "legacy-import");
  assert.equal(first.contentLibrary.sourceEntries.boundaries.ownership, "builder");
  assert.equal(first.pages[0].sections[0].panels[0].chart.configVersion, 3);
  assert.equal(first.chronoGroups.every((group) => !Object.hasOwn(group, "temporalReview")), true);
  assert.equal((first.scenes ?? []).every((scene) => !Object.hasOwn(scene, "temporalReview") && !Object.hasOwn(scene.present ?? {}, "temporalReview")), true);
});
