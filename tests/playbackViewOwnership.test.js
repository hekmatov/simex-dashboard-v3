import assert from "node:assert/strict";
import test from "node:test";

import {
  initialPlaybackState,
  reducePlaybackState,
} from "../src/charting/time/playbackReducer.js";

test("playback view owners release only their own lease while legacy controls remain compatible", () => {
  const presenter = "present-workspace";
  const fullscreen = "fullscreen-workspace";
  const legacyOpen = reducePlaybackState(initialPlaybackState, { type: "openView" });
  const withPresenter = reducePlaybackState(legacyOpen, { type: "openView", owner: presenter });
  const withOverlap = reducePlaybackState(withPresenter, { type: "openView", owner: fullscreen });
  const replayedPresenter = reducePlaybackState(withOverlap, { type: "openView", owner: presenter });

  assert.equal(replayedPresenter.playbackView, true);
  assert.deepEqual(replayedPresenter.playbackViewOwners, ["legacy", presenter, fullscreen]);

  const presenterClosed = reducePlaybackState(replayedPresenter, { type: "closeView", owner: presenter });
  assert.equal(presenterClosed.playbackView, true);
  assert.deepEqual(presenterClosed.playbackViewOwners, ["legacy", fullscreen]);

  const overlapClosed = reducePlaybackState(presenterClosed, { type: "closeView", owner: fullscreen });
  assert.equal(overlapClosed.playbackView, true);
  const legacyClosed = reducePlaybackState(overlapClosed, { type: "closeView" });
  assert.equal(legacyClosed.playbackView, false);
  assert.deepEqual(legacyClosed.playbackViewOwners, []);
});

test("setGroup with null records an explicit whole-page preference", () => {
  const state = reducePlaybackState(initialPlaybackState, { type: "setGroup", groupId: null });
  assert.equal(state.sourcePreference, "page");
  assert.deepEqual(state.source, { kind: "default", id: null });
  const grouped = reducePlaybackState(state, { type: "setGroup", groupId: "g1" });
  assert.equal(grouped.sourcePreference, "auto");
  const scene = reducePlaybackState(state, { type: "setScene", sceneId: "s1" });
  assert.equal(scene.sourcePreference, "auto");
  const exited = reducePlaybackState(state, { type: "modeExit" });
  assert.equal(exited.sourcePreference, "auto");
});
