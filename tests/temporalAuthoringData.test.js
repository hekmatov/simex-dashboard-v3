import assert from "node:assert/strict";
import test from "node:test";

import { buildTemporalChartVariables } from "../src/components/time/temporalAuthoringData.js";

test("temporal authoring compacts repeated source rows to one lossless timestamp per variable", () => {
  const rows = [
    { date: "2027-01-01", municipality: "A", cases: 1 },
    { date: "2027-01-01", municipality: "B", cases: 2 },
    { date: "2027-01-02", municipality: "A", cases: 3 },
    { date: "2027-01-02", municipality: "B", cases: null },
  ];
  assert.deepEqual(buildTemporalChartVariables(rows, "date", ["cases"]), [{
    id: "cases",
    label: "cases",
    observations: [
      { epochMs: Date.parse("2027-01-01"), value: 1 },
      { epochMs: Date.parse("2027-01-02"), value: 3 },
    ],
  }]);
});

test("temporal authoring parses the shared time field once per row", () => {
  let parses = 0;
  const rows = Array.from({ length: 100 }, (_, index) => ({ time: index, a: index, b: index * 2 }));
  const variables = buildTemporalChartVariables(rows, "time", ["a", "b"], (value) => {
    parses += 1;
    return value;
  });
  assert.equal(parses, rows.length);
  assert.equal(variables[0].observations.length, rows.length);
  assert.equal(variables[1].observations.length, rows.length);
});
