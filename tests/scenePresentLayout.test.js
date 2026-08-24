import test from "node:test";
import assert from "node:assert/strict";

const scenePresentLayoutModule = await import(
  "../src/components/time/scenePresentLayout.js"
).catch(() => null);

const mappings = [
  ["single", 1, "solo"],
  ["vertical-divider", 2, "sideBySide"],
  ["horizontal-divider", 2, "overUnder"],
  ["large-left", 3, "leftFocus"],
  ["large-top", 3, "topFocus"],
  ["grid-2x2", 4, "grid2x2"],
];

for (const [sceneLayout, chartCount, expected] of mappings) {
  test(`${sceneLayout} maps to ${expected}`, () => {
    assert.equal(
      scenePresentLayoutModule?.scenePresentLayoutToDisplayLayout(
        sceneLayout,
        chartCount,
      ),
      expected,
      "the saved Scene layout must map to the live presentation vocabulary",
    );
  });
}

test("layout mapping rejects a layout that is invalid for the chart count", () => {
  assert.ok(scenePresentLayoutModule, "Scene Present layout adapter must exist");
  assert.throws(
    () => scenePresentLayoutModule.scenePresentLayoutToDisplayLayout("grid-2x2", 2),
    /unsupported/i,
  );
});
