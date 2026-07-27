import assert from "node:assert/strict";
import test from "node:test";

import {
  createManualDataTemplate,
  manualDataAllowed,
  validateManualData,
} from "../src/charting/forms/manualData.js";
import { getChartSchema } from "../src/charting/schemas/chartSchemaRegistry.js";
import { validateChartSchema } from "../src/charting/schemas/validateChartSchema.js";

function futureConciseSchema() {
  return {
    ...structuredClone(getChartSchema("pie")),
    typeId: "futureConciseSummary",
    label: "Future concise summary",
    sources: ["dataset", "inline"],
    roles: [
      {
        id: "indicator",
        label: "Indicator",
        accepts: ["category", "text"],
        min: 1,
        max: 1,
      },
      {
        id: "score",
        label: "Score",
        accepts: ["number"],
        min: 1,
        max: 1,
      },
    ],
    manualData: { maxRows: 4 },
  };
}

function futureComparisonSchema({ minRows = 0 } = {}) {
  const schema = structuredClone(getChartSchema("deltaCard"));
  return {
    ...schema,
    typeId: "futureChangeSummary",
    label: "Future change summary",
    roles: schema.roles.map((chartRole) => (
      chartRole.id === "time"
        ? { ...chartRole, id: "observedAt", label: "Observed at" }
        : chartRole
    )),
    manualData: { maxRows: 6, minRows },
  };
}

test("manual entry is granted by concise inline schema metadata, not chart type IDs", () => {
  for (const typeId of ["pie", "donut", "kpi", "gauge", "bullet", "deltaCard"]) {
    assert.equal(manualDataAllowed(getChartSchema(typeId)), true, typeId);
  }
  for (const typeId of ["deltaList", "line", "heatmap", "timeline"]) {
    assert.equal(manualDataAllowed(getChartSchema(typeId)), false, typeId);
  }

  assert.equal(manualDataAllowed(futureConciseSchema()), true);
  assert.equal(manualDataAllowed(getChartSchema("image")), true);
  assert.equal(manualDataAllowed({
    ...futureConciseSchema(),
    manualData: { maxRows: 100_000 },
  }), false);
});

test("manual templates derive editable column metadata from schema roles", () => {
  assert.deepEqual(createManualDataTemplate(futureConciseSchema()), {
    maxRows: 4,
    columns: [
      {
        fieldId: "indicator",
        header: "Indicator",
        roleId: "indicator",
        expectedType: "category",
        accepts: ["category", "text"],
        required: true,
        cardinality: { min: 1, max: 1 },
      },
      {
        fieldId: "score",
        header: "Score",
        roleId: "score",
        expectedType: "number",
        accepts: ["number"],
        required: true,
        cardinality: { min: 1, max: 1 },
      },
    ],
    rows: [{ indicator: "", score: "" }],
  });
});

test("manual templates are deeply detached from schemas and other templates", () => {
  const schema = futureConciseSchema();
  const first = createManualDataTemplate(schema);
  const second = createManualDataTemplate(schema);

  first.columns[0].accepts.push("url");
  first.columns[0].cardinality.min = 99;
  first.rows[0].indicator = "changed";

  assert.deepEqual(second.columns[0].accepts, ["category", "text"]);
  assert.equal(second.columns[0].cardinality.min, 1);
  assert.equal(second.rows[0].indicator, "");
  assert.deepEqual(schema.roles[0].accepts, ["category", "text"]);
  assert.equal(schema.roles[0].min, 1);
});

test("comparison schemas receive two starter observations without a type-specific branch", () => {
  const delta = createManualDataTemplate(getChartSchema("deltaCard"));
  const renamedDelta = {
    ...structuredClone(getChartSchema("deltaCard")),
    typeId: "futureChangeCard",
  };

  assert.equal(delta.rows.length, 2);
  assert.deepEqual(delta.rows, [
    { measurement: "", entity: "", time: "", target: "" },
    { measurement: "", entity: "", time: "", target: "" },
  ]);
  assert.equal(createManualDataTemplate(renamedDelta).rows.length, 2);
});

test("comparison validation derives the temporal field identity from the schema", () => {
  const schema = futureComparisonSchema();
  assert.doesNotThrow(() => validateChartSchema(schema));

  const template = createManualDataTemplate(schema);
  assert.ok(template.columns.some(({ roleId }) => roleId === "observedAt"));
  assert.ok(!template.columns.some(({ roleId }) => roleId === "time"));
  assert.deepEqual(template.comparison, {
    temporalRoleIds: ["observedAt"],
  });
  assert.deepEqual(validateManualData(schema, [
    { measurement: "8", observedAt: "2027-05-01" },
    { measurement: "10", observedAt: "2027-05-02" },
  ]), { valid: true, errors: [] });
});

test("comparison templates and validation honor a minimum above two rows", () => {
  const schema = futureComparisonSchema({ minRows: 3 });
  const twoRows = [
    { measurement: "8", observedAt: "2027-05-01" },
    { measurement: "10", observedAt: "2027-05-02" },
  ];

  assert.equal(createManualDataTemplate(schema).rows.length, 3);
  const result = validateManualData(schema, twoRows);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /requires at least 3 rows/i);
});

test("ordinary manual schemas enforce their declared minimum rows", () => {
  const schema = {
    ...futureConciseSchema(),
    manualData: { maxRows: 4, minRows: 3 },
  };
  const twoRows = [
    { indicator: "Ready", score: 8 },
    { indicator: "Constrained", score: 2 },
  ];

  assert.equal(createManualDataTemplate(schema).rows.length, 3);
  const result = validateManualData(schema, twoRows);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /requires at least 3 rows/i);
});

test("manual rows validate required role values while accepting numeric strings", () => {
  const result = validateManualData(getChartSchema("pie"), [
    { category: "Hospitals ready", value: "12" },
    { category: "Hospitals constrained", value: 3 },
  ]);

  assert.deepEqual(result, { valid: true, errors: [] });
});

test("explicit manual tables require unique nonempty headers and safe field IDs", () => {
  const result = validateManualData(getChartSchema("pie"), {
    columns: [
      {
        fieldId: "category",
        header: "",
        roleId: "category",
      },
      {
        fieldId: "category",
        header: "Category",
        roleId: "value",
      },
      {
        fieldId: "__proto__",
        header: "Category",
        roleId: "value",
      },
    ],
    rows: [{ category: "Ready" }],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /non-empty header/i);
  assert.match(result.errors.join(" "), /field ID "category".*duplicated/i);
  assert.match(result.errors.join(" "), /field ID "__proto__".*unsafe/i);
  assert.match(result.errors.join(" "), /header "Category".*duplicated/i);
});

test("required role columns and row values produce actionable errors", () => {
  const result = validateManualData(getChartSchema("bullet"), {
    columns: [{
      fieldId: "actual",
      header: "Actual",
      roleId: "actual",
    }],
    rows: [{ actual: "" }],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /required manual-data role "Target" is missing/i);
  assert.match(result.errors.join(" "), /row 1 requires "Actual"/i);
});

test("numeric roles reject nonnumeric cells without rejecting zero", () => {
  const invalid = validateManualData(getChartSchema("pie"), [
    { category: "Ready", value: "twelve" },
  ]);
  const zero = validateManualData(getChartSchema("pie"), [
    { category: "Ready", value: 0 },
  ]);

  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join(" "), /row 1 field "value" must be numeric/i);
  assert.deepEqual(zero, { valid: true, errors: [] });
});

test("manual data rejects empty rows and rows beyond the schema's concise limit", () => {
  const empty = validateManualData(getChartSchema("pie"), [{}]);
  const excessive = validateManualData(
    getChartSchema("pie"),
    Array.from({ length: 21 }, (_, index) => ({
      category: `Item ${index + 1}`,
      value: index + 1,
    })),
  );

  assert.equal(empty.valid, false);
  assert.match(empty.errors.join(" "), /row 1 is empty/i);
  assert.match(empty.errors.join(" "), /at least one usable row/i);
  assert.equal(excessive.valid, false);
  assert.match(excessive.errors.join(" "), /concise limit of 20 rows/i);
});

test("comparison metadata requires distinct valid temporal observations", () => {
  const schema = getChartSchema("deltaCard");
  const oneObservation = validateManualData(schema, [
    { measurement: "10", time: "2027-05-02" },
  ]);
  const repeatedTime = validateManualData(schema, [
    { measurement: "8", time: "2027-05-02" },
    { measurement: "10", time: "2027-05-02" },
  ]);
  const invalidTime = validateManualData(schema, [
    { measurement: "8", time: "yesterday" },
    { measurement: "10", time: "2027-05-02" },
  ]);
  const valid = validateManualData(schema, [
    { measurement: "8", time: "2027-05-01" },
    { measurement: "10", time: "2027-05-02" },
  ]);

  assert.match(oneObservation.errors.join(" "), /comparison.*two.*temporal observations/i);
  assert.match(repeatedTime.errors.join(" "), /comparison.*distinct.*temporal observations/i);
  assert.match(invalidTime.errors.join(" "), /row 1 field "time" must be a valid temporal value/i);
  assert.deepEqual(valid, { valid: true, errors: [] });
});

test("schema and row accessors are rejected without executing them", () => {
  let reads = 0;
  const hostileSchema = {};
  Object.defineProperty(hostileSchema, "sources", {
    enumerable: true,
    get() {
      reads += 1;
      return ["inline"];
    },
  });
  const hostileRow = { category: "Ready" };
  Object.defineProperty(hostileRow, "value", {
    enumerable: true,
    get() {
      reads += 1;
      return 12;
    },
  });

  assert.equal(manualDataAllowed(hostileSchema), false);
  assert.throws(
    () => createManualDataTemplate(hostileSchema),
    /data propert/i,
  );
  const result = validateManualData(getChartSchema("pie"), [hostileRow]);

  assert.equal(reads, 0);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /row 1.*data properties/i);
});

test("manual cells cannot trigger coercion hooks during numeric validation", () => {
  let reads = 0;
  const hostileCell = {};
  Object.defineProperty(hostileCell, "valueOf", {
    enumerable: true,
    get() {
      reads += 1;
      return () => 12;
    },
  });

  const result = validateManualData(getChartSchema("pie"), [{
    category: "Ready",
    value: hostileCell,
  }]);

  assert.equal(reads, 0);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /field "value" must be a plain scalar value/i);
});

test("prototype-polluting row keys are rejected and never escape validation", () => {
  const row = JSON.parse(
    '{"category":"Ready","value":"12","__proto__":{"polluted":true}}',
  );
  const result = validateManualData(getChartSchema("pie"), [row]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /unsafe property "__proto__"/i);
  assert.equal({}.polluted, undefined);
});

test("direct row field IDs must use the same safe identifier contract as table columns", () => {
  const result = validateManualData(getChartSchema("pie"), [{
    category: "Ready",
    value: 12,
    "unsafe field": "ignored",
  }]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /field ID "unsafe field" is unsafe/i);
});
