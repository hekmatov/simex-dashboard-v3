import assert from "node:assert/strict";
import test from "node:test";

import {
  createBuildDirtyState,
  hasUnsavedAuthoredContent,
} from "../src/components/build/buildDirtyState.js";

test("an untouched Build workspace has no unsaved authored content", () => {
  assert.equal(hasUnsavedAuthoredContent(createBuildDirtyState()), false);
});

test("each approved authored-content category independently protects package import", () => {
  for (const key of [
    "chartEditor",
    "chartWizard",
    "inlineRename",
    "pendingContent",
    "chronoGroup",
    "scene",
    "dashboardMetadata",
  ]) {
    assert.equal(
      hasUnsavedAuthoredContent({ ...createBuildDirtyState(), [key]: true }),
      true,
      `${key} should be classified as authored content`,
    );
  }
});

test("cosmetic and unknown state never triggers the authored-content warning", () => {
  assert.equal(hasUnsavedAuthoredContent({
    ...createBuildDirtyState(),
    appearance: true,
    colorProfile: true,
    palette: true,
    futureCosmeticProjection: true,
  }), false);
});
