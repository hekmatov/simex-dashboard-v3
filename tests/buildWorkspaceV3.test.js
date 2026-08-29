import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  clearChronoGroupReviewForSave,
  clearSceneReviewForSave,
} from "../src/charting/time/temporalReview.js";

const model = await import("../src/components/build/buildCanvasRestoration.js").catch(() => null);

test("Build removes every live Pages and sections auxiliary route", async () => {
  const [workspace, homeContent, packageExport] = await Promise.all([
    readFile(new URL("../src/components/build/BuildWorkspace.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/home/canonicalHomeContent.js", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/dashboardPackageExport.js", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(workspace, /StructureAuthoring|openAuxiliary\("structure"\)|renderedAuxiliary === "structure"/);
  assert.doesNotMatch(`${workspace}\n${homeContent}\n${packageExport}`, /Pages (?:& sections|and sections)/);
  await assert.rejects(
    readFile(new URL("../src/components/build/StructureAuthoring.jsx", import.meta.url), "utf8"),
    { code: "ENOENT" },
  );
});

test("Build save projections clear only the repaired Chrono or Scene review metadata", () => {
  const group = {
    id: "group-a", name: "Group A",
    temporalReview: { status: "needs-review", sourceIds: ["cases"] },
  };
  const scene = {
    id: "scene-a", name: "Scene A",
    temporalReview: { status: "needs-review", sourceIds: ["cases"] },
    present: { chartIds: ["chart-a"], layout: "single", temporalReview: { status: "degraded", sourceIds: ["cases"] } },
  };
  assert.deepEqual(clearChronoGroupReviewForSave(group), { id: "group-a", name: "Group A" });
  assert.deepEqual(clearSceneReviewForSave(scene), {
    id: "scene-a", name: "Scene A", present: { chartIds: ["chart-a"], layout: "single" },
  });
  assert.deepEqual(group.temporalReview.sourceIds, ["cases"]);
  assert.deepEqual(scene.present.temporalReview.sourceIds, ["cases"]);
});

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

test("reveal waits for canonical material clearance instead of any viewport intersection", () => {
  assert.equal(typeof model?.selectedTargetRevealDecision, "function");
  const viewport = { width: 768, height: 900 };
  const fullyUsable = model.selectedTargetRevealDecision({
    targetRect: { top: 120, right: 620, bottom: 420, left: 80 },
    viewport,
    attempts: 0,
  });
  assert.deepEqual(fullyUsable, {
    usable: true,
    recovery: null,
    visibleWidth: 540,
    visibleHeight: 300,
    shouldScroll: false,
    complete: true,
  });

  const sliver = model.selectedTargetRevealDecision({
    targetRect: { top: 120, right: 1167, bottom: 420, left: 767 },
    viewport,
    attempts: 0,
  });
  assert.equal(sliver.visibleWidth, 1);
  assert.equal(sliver.shouldScroll, true);
  assert.equal(sliver.complete, false);

  const partiallyClipped = model.selectedTargetRevealDecision({
    targetRect: { top: 741, right: 620, bottom: 1041, left: 80 },
    viewport,
    attempts: 0,
  });
  assert.equal(partiallyClipped.visibleHeight, 159);
  assert.equal(partiallyClipped.shouldScroll, true);
  assert.equal(partiallyClipped.complete, false);

  const offscreen = model.selectedTargetRevealDecision({
    targetRect: { top: 920, right: 620, bottom: 1220, left: 80 },
    viewport,
    attempts: 0,
  });
  assert.equal(offscreen.visibleHeight, 0);
  assert.equal(offscreen.shouldScroll, true);
  assert.equal(offscreen.complete, false);

  const waitingAfterScroll = model.selectedTargetRevealDecision({
    targetRect: { top: 741, right: 620, bottom: 1041, left: 80 },
    viewport,
    attempts: 1,
  });
  assert.equal(waitingAfterScroll.shouldScroll, false);
  assert.equal(waitingAfterScroll.complete, false);
});

test("Build maximum width is bounded by View and equal effective widths share a breakpoint", () => {
  assert.equal(model.resolveCanonicalCanvasWidths({ viewMax: 1280, buildMax: 1440 }).buildMax, 1280);
  assert.equal(model.responsiveProjectionForWidth(1016), model.responsiveProjectionForWidth(1016));
  assert.notEqual(model.responsiveProjectionForWidth(767), model.responsiveProjectionForWidth(768));
});

test("open Build panel compresses the canvas inside the remaining viewport instead of shifting it off-screen", () => {
  assert.equal(typeof model.resolveBuildPanelCanvasLayout, "function");
  assert.deepEqual(model.resolveBuildPanelCanvasLayout({
    viewportWidth: 1280,
    panelWidth: 380,
    gutter: 24,
    canonicalMax: 1392,
  }), {
    left: 24,
    width: 828,
    right: 852,
    reservedPanelWidth: 404,
  });
  assert.deepEqual(model.resolveBuildPanelCanvasLayout({
    viewportWidth: 1920,
    panelWidth: 380,
    gutter: 24,
    canonicalMax: 1392,
  }), {
    left: 62,
    width: 1392,
    right: 1454,
    reservedPanelWidth: 404,
  });
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
