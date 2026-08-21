import assert from "node:assert/strict";
import test from "node:test";

import {
  applyChartTypeSelection,
  listChartTypeOptions,
} from "../src/charting/forms/chartCatalogue.js";
import {
  createChartSchemaRegistry,
  getChartSchema,
} from "../src/charting/schemas/chartSchemaRegistry.js";

function registryWith(...typeIds) {
  return createChartSchemaRegistry(typeIds.map((typeId) => (
    { ...structuredClone(getChartSchema(typeId)), conversions: [] }
  )));
}

test("catalogue is driven by zero, one, or many live registry entries", () => {
  assert.deepEqual(listChartTypeOptions({ registry: registryWith() }), []);
  assert.deepEqual(
    listChartTypeOptions({ registry: registryWith("line") }).map(({ id }) => id),
    ["line"],
  );
  assert.deepEqual(
    listChartTypeOptions({ registry: registryWith("bar", "line") }).map(({ id }) => id),
    ["bar", "line"],
  );
});

test("catalogue search covers chart name, purpose, and description without hiding reasons", () => {
  const registry = registryWith("bar", "line", "pie");
  assert.deepEqual(
    listChartTypeOptions({ registry, query: "trend" }).map(({ id }) => id),
    ["line"],
  );
  assert.deepEqual(
    listChartTypeOptions({ registry, category: "composition" }).map(({ id }) => id),
    ["pie"],
  );

  const options = listChartTypeOptions({
    registry,
    sourceProfile: { fields: [{ id: "name", type: "text" }] },
  });
  const incompatible = options.find(({ id }) => id === "line");
  assert.equal(incompatible.compatibility, "incompatible");
  assert.match(incompatible.reason, /number|temporal|required/i);
});

test("type selection pins schema revision and preserves compatible authored work", () => {
  const state = {
    chartTypeId: "line",
    schemaRevision: "3:line",
    mapping: { observation: { field: "date" }, measurements: [{ field: "cases" }] },
    preparation: { filters: [{ field: "region", operator: "equals", value: "A" }] },
    configuration: { title: "Cases", lineWidth: 3, barWidth: 18 },
    companions: [],
    renderProofRevision: { revision: "render-1", status: "valid" },
    placementProofRevision: { revision: "place-1", status: "valid" },
  };
  const result = applyChartTypeSelection(state, {
    chartTypeId: "area",
    schemaRevision: "3:area",
    schema: getChartSchema("area"),
    confirmLoss: true,
  });

  assert.equal(result.state.chartTypeId, "area");
  assert.equal(result.state.schemaRevision, "3:area");
  assert.equal(result.state.configuration.title, "Cases");
  assert.equal(result.state.configuration.lineWidth, 3);
  assert.equal(result.state.configuration.barWidth, undefined);
  assert.deepEqual(result.removedPaths, ["configuration.barWidth"]);
  assert.ok(result.retainedPaths.includes("configuration.title"));
  assert.equal(result.state.renderProofRevision, null);
  assert.deepEqual(result.state.placementProofRevision, state.placementProofRevision);
});

test("incompatible type selection remains a prospective named-loss decision", () => {
  const state = {
    chartTypeId: "line",
    mapping: { observation: { field: "date" }, measurements: [{ field: "cases" }] },
    preparation: { filters: [] },
    configuration: { title: "Cases", lineWidth: 3 },
  };
  const result = applyChartTypeSelection(state, {
    chartTypeId: "image",
    schemaRevision: "3:image",
    schema: getChartSchema("image"),
    confirmLoss: false,
  });

  assert.equal(result.state, state);
  assert.ok(result.removedPaths.includes("mapping.observation"));
  assert.ok(result.removedPaths.includes("mapping.measurements"));
  assert.ok(result.needsAttention.some((value) => /confirm/i.test(value)));
});

test("stale or removed selected schemas are retained as Needs attention", () => {
  const options = listChartTypeOptions({
    registry: registryWith("bar"),
    selected: { chartTypeId: "line", schemaRevision: "2:line" },
  });
  assert.equal(options.at(-1).id, "line");
  assert.equal(options.at(-1).compatibility, "incompatible");
  assert.match(options.at(-1).reason, /no longer|removed/i);
});
