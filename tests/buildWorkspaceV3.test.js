import assert from "node:assert/strict";
import test from "node:test";

const model = await import("../src/components/build/buildCanvasRestoration.js").catch(() => null);

test("authoring chrome snapshots saved layout without mutating it", () => {
  assert.equal(typeof model?.captureBuildCanvasState, "function");
  const layout = fixtureLayout();
  const before = JSON.stringify(layout);
  const state = model.captureBuildCanvasState({
    layout,
    selection: { kind: "chart", placementId: "pressure-panel" },
    focusId: "edit-pressure-panel",
    scrollTop: 680,
    scrollLeft: 0,
    effectiveCanvasWidth: 1016,
  });
  assert.equal(JSON.stringify(layout), before);
  assert.equal(state.savedLayoutFingerprint, model.fingerprintSavedLayout(layout));
});

test("closing transient chrome restores selection focus and scroll exactly", () => {
  const state = model.captureBuildCanvasState({
    layout: fixtureLayout(),
    selection: { kind: "chart", placementId: "pressure-panel" },
    focusId: "edit-pressure-panel",
    scrollTop: 680,
    scrollLeft: 24,
    effectiveCanvasWidth: 768,
  });
  const commands = model.restoreBuildCanvasState(state, fixtureLayout());
  assert.deepEqual(commands, {
    selection: { kind: "chart", placementId: "pressure-panel" },
    focusId: "edit-pressure-panel",
    scrollTop: 680,
    scrollLeft: 24,
    effectiveCanvasWidth: 768,
  });
});

test("restoration refuses to hide saved-layout mutation", () => {
  const state = model.captureBuildCanvasState({
    layout: fixtureLayout(),
    selection: { kind: "chart", placementId: "pressure-panel" },
    focusId: "edit-pressure-panel",
    scrollTop: 0,
    scrollLeft: 0,
    effectiveCanvasWidth: 1200,
  });
  const changed = fixtureLayout();
  changed.pages[0].sections[0].panels[0].footprint = { columns: 4, rows: 2 };
  assert.throws(
    () => model.restoreBuildCanvasState(state, changed),
    /saved dashboard layout changed while authoring chrome was open/i,
  );
});

test("selected target usability distinguishes visible, recoverable, and unusable states", () => {
  assert.equal(model.selectedTargetUsability({
    targetRect: { top: 120, right: 780, bottom: 520, left: 80 },
    viewport: { width: 1024, height: 768 },
    minimumVisibleWidth: 280,
    minimumVisibleHeight: 180,
  }).usable, true);
  const recoverable = model.selectedTargetUsability({
    targetRect: { top: 120, right: 1100, bottom: 520, left: 780 },
    viewport: { width: 1024, height: 768 },
    minimumVisibleWidth: 280,
    minimumVisibleHeight: 180,
  });
  assert.equal(recoverable.usable, false);
  assert.equal(recoverable.recovery, "reposition-canvas");
  assert.equal(model.selectedTargetUsability({
    targetRect: null,
    viewport: { width: 1024, height: 768 },
  }).recovery, "restore-target");
});

test("Build maximum width is bounded by View and equal effective widths share a breakpoint", () => {
  assert.equal(model.resolveCanonicalCanvasWidths({ viewMax: 1280, buildMax: 1440 }).buildMax, 1280);
  assert.equal(model.responsiveProjectionForWidth(1016), model.responsiveProjectionForWidth(1016));
  assert.notEqual(model.responsiveProjectionForWidth(767), model.responsiveProjectionForWidth(768));
});

function fixtureLayout() {
  return {
    pages: [{
      id: "biomedical",
      sections: [{
        id: "pressure",
        panels: [{ id: "pressure-panel", footprint: { columns: 2, rows: 1 }, chart: { id: "admissions" } }],
      }],
    }],
  };
}
