import assert from "node:assert/strict";
import test from "node:test";

import { reduceDisplayState } from "../src/lib/displayController.js";

const transitionModule = await import(
  "../src/components/time/scenePresentTransition.js"
).catch(() => null);

const scene = {
  id: "scene-a",
  present: {
    chartIds: ["chart-b", "chart-a"],
    layout: "vertical-divider",
  },
};

test("a newly active Scene produces one atomic Present composition action", () => {
  assert.ok(transitionModule, "Scene Present transition coordinator must exist");
  const transition = transitionModule.resolveScenePresentTransition(null, scene);

  assert.deepEqual(transition.action, {
    type: "scene_applied",
    chart_ids: ["chart-b", "chart-a"],
    layout: "sideBySide",
  });
  assert.equal(transition.error, null);
  assert.ok(transition.signature);
});

test("publication becomes eligible only after DashboardRenderer records the Scene transition", () => {
  assert.equal(
    transitionModule.presentationSceneTransitionReady(null, scene),
    false,
  );
  const transition = transitionModule.resolveScenePresentTransition(null, scene);
  assert.equal(
    transitionModule.presentationSceneTransitionReady(transition.signature, scene),
    true,
  );
  const otherScene = { ...scene, id: "scene-b" };
  assert.equal(
    transitionModule.presentationSceneTransitionReady(transition.signature, otherScene),
    false,
  );
});

test("an identical-composition Scene switch still records observable readiness", () => {
  const displayState = Object.freeze({
    display_revision: 4,
    displayed_chart_ids: Object.freeze(["chart-b", "chart-a"]),
    layout: "sideBySide",
  });
  const nextScene = { ...scene, id: "scene-b" };
  const priorSignature = transitionModule.resolveScenePresentTransition(null, scene).signature;
  const appliedSignatures = [];
  const callbackOrder = [];
  let reducedDisplayState = null;

  const transition = transitionModule.applyScenePresentTransition(
    priorSignature,
    nextScene,
    {
      onDisplayAction(action) {
        callbackOrder.push("display");
        reducedDisplayState = reduceDisplayState(displayState, action);
      },
      onTransitionApplied(signature) {
        callbackOrder.push("applied-signature");
        appliedSignatures.push(signature);
      },
    },
  );

  assert.equal(reducedDisplayState, displayState, "the display reducer preserves identity");
  assert.deepEqual(callbackOrder, ["display", "applied-signature"]);
  assert.deepEqual(appliedSignatures, [transition.signature]);
  assert.equal(
    transitionModule.presentationSceneTransitionReady(appliedSignatures[0], nextScene),
    true,
  );
});

test("degraded review metadata stays durable on the Scene and never enters the Present action", () => {
  const degraded = {
    ...scene,
    present: {
      ...scene.present,
      temporalReview: { status: "degraded", sourceIds: ["cases"] },
    },
  };
  const transition = transitionModule.resolveScenePresentTransition(null, degraded);
  assert.deepEqual(transition.action, {
    type: "scene_applied",
    chart_ids: ["chart-b", "chart-a"],
    layout: "sideBySide",
  });
  assert.equal(Object.hasOwn(transition.action, "temporalReview"), false);
});

test("the same active Scene does not overwrite later manual Present edits", () => {
  const first = transitionModule.resolveScenePresentTransition(null, scene);
  const repeated = transitionModule.resolveScenePresentTransition(
    first.signature,
    scene,
  );

  assert.equal(repeated.action, null);
  assert.equal(repeated.signature, first.signature);
});

test("an active Scene waits for Present instead of opening View comparison", () => {
  const inView = transitionModule.resolveScenePresentTransition(
    null,
    scene,
    { enabled: false },
  );
  assert.equal(inView.action, null);
  assert.equal(inView.signature, null);

  const inPresent = transitionModule.resolveScenePresentTransition(
    inView.signature,
    scene,
    { enabled: true },
  );
  assert.equal(inPresent.action?.type, "scene_applied");
});

test("leaving and re-entering a Scene applies its saved composition again", () => {
  const first = transitionModule.resolveScenePresentTransition(null, scene);
  const cleared = transitionModule.resolveScenePresentTransition(
    first.signature,
    null,
  );
  const reentered = transitionModule.resolveScenePresentTransition(
    cleared.signature,
    scene,
  );

  assert.equal(cleared.signature, null);
  assert.equal(cleared.action, null);
  assert.equal(reentered.action?.type, "scene_applied");
});

test("an invalid saved composition is bounded instead of crashing the renderer", () => {
  const invalid = transitionModule.resolveScenePresentTransition(null, {
    ...scene,
    present: { chartIds: ["chart-a", "chart-b"], layout: "grid-2x2" },
  });

  assert.equal(invalid.action, null);
  assert.match(invalid.error, /unsupported/i);
  assert.ok(invalid.signature);
});
