import assert from "node:assert/strict";
import test from "node:test";

import {
  compareSchemaRevision,
  reconcileSourceChange,
} from "../src/charting/forms/schemaRevision.js";

test("unchanged revisions invalidate nothing", () => {
  assert.deepEqual(compareSchemaRevision("source:r1", "source:r1"), {
    changed: false,
    currentRevision: "source:r1",
    invalidates: [],
  });
});

test("source schema drift invalidates mapping and render, not placement", () => {
  assert.deepEqual(compareSchemaRevision("source:r1", "source:r2"), {
    changed: true,
    currentRevision: "source:r2",
    invalidates: ["map-and-prepare-data", "render-proof"],
  });
});

test("source changes preserve compatible bindings and name prospective loss", () => {
  const state = {
    source: { sourceId: "old", schemaRevision: "old:r1" },
    mapping: {
      observation: { field: "observed" },
      measurements: [{ field: "cases" }, { field: "capacity" }],
    },
    preparation: {
      filters: [{ field: "region", operator: "equals", value: "North" }],
    },
    renderProofRevision: { revision: "render-1", status: "valid" },
    placementProofRevision: { revision: "place-1", status: "valid" },
  };
  const profile = {
    sourceId: "new",
    schemaRevision: "new:r1",
    fields: [
      { id: "observed", type: "temporal" },
      { id: "cases", type: "number" },
    ],
  };
  const prospective = reconcileSourceChange(state, profile);
  assert.equal(prospective.state, state);
  assert.deepEqual(prospective.removedPaths, [
    "mapping.measurements[1]",
    "preparation.filters[0]",
  ]);

  const accepted = reconcileSourceChange(state, profile, { confirmLoss: true });
  assert.equal(accepted.state.source.sourceId, "new");
  assert.deepEqual(accepted.state.mapping.measurements, [{ field: "cases" }]);
  assert.deepEqual(accepted.state.preparation.filters, []);
  assert.equal(accepted.state.renderProofRevision, null);
  assert.deepEqual(accepted.state.placementProofRevision, state.placementProofRevision);
});
