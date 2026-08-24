import assert from "node:assert/strict";
import test from "node:test";

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
