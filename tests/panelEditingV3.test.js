import assert from "node:assert/strict";
import test from "node:test";

const model = await import("../src/components/build/panelEditingModel.js").catch(() => null);

test("chart collection preserves canonical placement and chart identity", () => {
  assert.equal(typeof model?.collectChartPlacements, "function");
  const dashboard = fixture();
  const collection = model.collectChartPlacements(dashboard);
  assert.equal(collection[0].placement, dashboard.pages[0].sections[0].panels[0]);
  assert.equal(collection[0].chart, dashboard.pages[0].sections[0].panels[0].chart);
  assert.deepEqual(collection.map(({ placementId }) => placementId), ["admissions-panel", "collection-panel"]);
});

test("Unit Orbit filters compatible capabilities and names no-result separately from empty", () => {
  const [ordinary, collection] = model.collectChartPlacements(fixture());
  assert.deepEqual(model.compatibleUnitOrbitCapabilities(ordinary).map(({ id }) => id), [
    "data", "content", "appearance", "axes", "interaction", "size", "advanced",
  ]);
  assert.deepEqual(model.compatibleUnitOrbitCapabilities(collection).map(({ id }) => id), [
    "data", "content", "appearance", "interaction", "collection", "size", "advanced",
  ]);
  assert.deepEqual(model.filterChartCollection([], ""), { kind: "empty", items: [] });
  assert.deepEqual(model.filterChartCollection([ordinary], "missing"), { kind: "no-results", items: [] });
});

test("panel draft validates footprint and Collection temporal eligibility", () => {
  const [ordinary, collection] = model.collectChartPlacements(fixture());
  assert.equal(model.validatePanelDraft({ ...ordinary.chart, footprint: { columns: 5, rows: 2 } }).code, "FOOTPRINT_OUT_OF_RANGE");
  assert.equal(model.validatePanelDraft({ ...collection.chart, chronoGroupIds: ["national"] }).code, "COLLECTION_TEMPORAL_INELIGIBLE");
  assert.equal(model.validatePanelDraft({ ...ordinary.chart, footprint: { columns: 2, rows: 1 } }), null);
});

test("failed Save retains selected chart draft and retry/restoration context", () => {
  assert.equal(typeof model?.createPanelEditingState, "function");
  let state = model.createPanelEditingState({
    placement: model.collectChartPlacements(fixture())[0],
    restoration: { focusId: "edit-admissions", scrollTop: 420, targetId: "admissions-panel" },
  });
  state = model.reducePanelEditingState(state, { type: "EDIT", updates: { title: "Admissions now" } });
  state = model.reducePanelEditingState(state, { type: "SAVE_REQUEST" });
  state = model.reducePanelEditingState(state, {
    type: "SAVE_FAILED",
    error: { code: "STORAGE_UNAVAILABLE", message: "Retry", retryable: true },
  });
  assert.equal(state.status, "error");
  assert.equal(state.draft.title, "Admissions now");
  assert.equal(state.saved.title, "Admissions");
  assert.deepEqual(state.restoration, { focusId: "edit-admissions", scrollTop: 420, targetId: "admissions-panel" });
  assert.equal(model.reducePanelEditingState(state, { type: "SAVE_REQUEST" }).status, "saving");
  assert.equal(model.reducePanelEditingState(state, { type: "STAY" }).status, "dirty");
  assert.equal(model.reducePanelEditingState(state, { type: "DISCARD" }).draft.title, "Admissions");
});

function fixture() {
  return {
    pages: [{
      id: "biomedical",
      sections: [{
        id: "pressure",
        panels: [
          { id: "admissions-panel", chart: { id: "admissions", title: "Admissions", type: "line", footprint: { columns: 2, rows: 1 } } },
          { id: "collection-panel", chart: { id: "occupancy", title: "Occupancy", type: "collection", collection: { presentation: "fixed-grid" }, footprint: { columns: 1, rows: 1 } } },
        ],
      }],
    }],
  };
}
