import assert from "node:assert/strict";
import test from "node:test";

import {
  CHART_SCHEMA_VERSION,
  createChartSchemaRegistry,
  getChartSchema,
  listChartSchemaGroups,
  listChartSchemas,
} from "../src/charting/schemas/chartSchemaRegistry.js";
import { validateChartSchema } from "../src/charting/schemas/validateChartSchema.js";

const typeIdsInPurposeOrder = [
  "bar", "groupedBar", "stackedBar", "horizontalBar",
  "horizontalStackedBar", "line", "area", "mixed", "pie", "donut",
  "kpi", "gauge", "bullet", "deltaCard", "deltaList", "scatter",
  "bubble", "heatmap", "readinessMatrix", "timeline", "swimlane",
  "choroplethMap", "chronoChoroplethMap", "mapScatter", "table", "image",
];

test("version 3 exposes every approved chart type in purpose order", () => {
  assert.equal(CHART_SCHEMA_VERSION, 3);
  assert.deepEqual(
    listChartSchemas().map(({ typeId }) => typeId),
    typeIdsInPurposeOrder,
  );
});

test("schemas are grouped by their communication purpose", () => {
  assert.deepEqual(
    listChartSchemaGroups().map(({ id, charts }) => [id, charts.map(({ typeId }) => typeId)]),
    [
      ["comparison", ["bar", "groupedBar", "stackedBar", "horizontalBar", "horizontalStackedBar"]],
      ["trends", ["line", "area", "mixed"]],
      ["composition", ["pie", "donut"]],
      ["targets", ["kpi", "gauge", "bullet", "deltaCard", "deltaList"]],
      ["relationships", ["scatter", "bubble"]],
      ["readiness", ["heatmap", "readinessMatrix"]],
      ["timeline", ["timeline", "swimlane"]],
      ["geography", ["choroplethMap", "chronoChoroplethMap", "mapScatter"]],
      ["operational", ["table", "image"]],
    ],
  );
});

test("invalid schemas fail before the application renders", () => {
  assert.throws(
    () => validateChartSchema({ version: 3, typeId: "broken", roles: [] }),
    /label/,
  );
});

test("validation rejects unknown form sections", () => {
  assert.throws(
    () => validateChartSchema({ ...getChartSchema("line"), form: { sections: ["data", "madeUp"] } }),
    /Unknown form section "madeUp"/,
  );
});

test("validation rejects impossible role cardinality", () => {
  assert.throws(
    () => validateChartSchema({
      ...getChartSchema("line"),
      roles: [{ id: "value", label: "Value", accepts: ["number"], min: 2, max: 1 }],
    }),
    /max.*at least min/,
  );
});

test("validation rejects schemas without a registered renderer", () => {
  assert.throws(
    () => validateChartSchema({ ...getChartSchema("line"), renderer: "missing" }),
    /Unknown renderer "missing"/,
  );
});

test("validation rejects conversions outside its supplied catalogue", () => {
  assert.throws(
    () => validateChartSchema(
      { ...getChartSchema("line"), conversions: ["notAChart"] },
      { conversionTargetIds: new Set(["line"]) },
    ),
    /Unknown conversion target "notAChart"/,
  );
});

test("a registry rejects an approved conversion target it does not register", () => {
  const line = structuredClone(getChartSchema("line"));
  line.conversions = ["area"];
  assert.throws(
    () => createChartSchemaRegistry([line]),
    /Unknown conversion target "area"/,
  );
});

test("validation requires collection controls for collection-capable charts", () => {
  assert.throws(
    () => validateChartSchema({
      ...getChartSchema("deltaList"),
      form: { sections: ["data", "appearance", "labels", "targets", "interactions", "advanced"] },
    }),
    /Collection-capable chart schemas require a collection form section/,
  );
});

test("validation requires a temporal role for time-synchronized charts", () => {
  assert.throws(
    () => validateChartSchema({
      ...getChartSchema("line"),
      roles: getChartSchema("line").roles.map((role) => ({
        ...role,
        accepts: role.accepts.filter((type) => type !== "temporal"),
      })),
    }),
    /Time-synchronized chart schemas require a role that accepts temporal data/,
  );
});

test("only Delta schemas expose the immutable analytical comparison contract", () => {
  const expected = {
    defaultMode: "previousObservation",
    modes: ["previousObservation", "fixedTime"],
    matchingPolicies: ["exact", "lastKnown", "nearest", "interpolate"],
  };

  for (const schema of listChartSchemas()) {
    if (schema.typeId === "deltaCard" || schema.typeId === "deltaList") {
      assert.deepEqual(schema.comparison, expected);
      assert.equal(Object.isFrozen(schema.comparison), true);
      assert.equal(Object.isFrozen(schema.comparison.modes), true);
      assert.equal(Object.isFrozen(schema.comparison.matchingPolicies), true);
      assert.ok(schema.transforms.includes("comparison"));
    } else {
      assert.equal(Object.hasOwn(schema, "comparison"), false, schema.typeId);
      assert.equal(schema.transforms.includes("comparison"), false, schema.typeId);
    }
  }
});

test("comparison schemas reject malformed modes, policies, roles, and transform declarations", () => {
  const delta = structuredClone(getChartSchema("deltaCard"));
  const malformed = [
    {
      schema: {
        ...delta,
        comparison: {
          defaultMode: "latest",
          modes: ["previousObservation", "fixedTime"],
          matchingPolicies: ["exact"],
        },
      },
      message: /unknown comparison default mode "latest"/i,
    },
    {
      schema: {
        ...delta,
        comparison: {
          defaultMode: "previousObservation",
          modes: ["previousObservation", "futureObservation"],
          matchingPolicies: ["exact"],
        },
      },
      message: /unknown comparison mode "futureObservation"/i,
    },
    {
      schema: {
        ...delta,
        comparison: {
          defaultMode: "previousObservation",
          modes: ["previousObservation"],
          matchingPolicies: ["closest"],
        },
      },
      message: /unknown comparison matching policy "closest"/i,
    },
    {
      schema: {
        ...delta,
        roles: delta.roles.map((role) => (
          role.id === "measurement"
            ? { ...role, accepts: ["category"] }
            : role
        )),
      },
      message: /numeric measurement role/i,
    },
    {
      schema: {
        ...delta,
        transforms: delta.transforms.filter((transform) => transform !== "comparison"),
      },
      message: /comparison transform/i,
    },
  ];

  for (const { schema, message } of malformed) {
    assert.throws(() => validateChartSchema(schema), message);
  }
});

test("a registry rejects duplicate type identifiers", () => {
  const line = structuredClone(getChartSchema("line"));
  assert.throws(
    () => createChartSchemaRegistry([line, { ...line, label: "Another line" }]),
    /Duplicate chart type "line"/,
  );
});

test("registry schemas and discovery results are immutable", () => {
  const line = getChartSchema("line");
  assert.throws(() => { line.label = "Changed"; }, TypeError);
  assert.throws(() => { line.roles[0].label = "Changed"; }, TypeError);
  assert.throws(() => { listChartSchemas().push(line); }, TypeError);
  assert.throws(() => { listChartSchemaGroups()[0].charts.pop(); }, TypeError);
});

test("registry deep-freezes nested data from a shallow-frozen schema", () => {
  const line = structuredClone(getChartSchema("line"));
  line.conversions = [];
  Object.freeze(line);

  const registry = createChartSchemaRegistry([line]);
  assert.throws(() => { line.roles[0].label = "Changed after registration"; }, TypeError);
  assert.equal(registry.get("line").roles[0].label, "Measurements");
});

test("unknown chart type lookups fail with an actionable message", () => {
  assert.throws(() => getChartSchema("notAChart"), /Unknown chart type "notAChart"/);
});
