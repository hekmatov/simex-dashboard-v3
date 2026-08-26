import assert from "node:assert/strict";
import test from "node:test";

const sortModule = await import("../src/source-viewer/sourceViewerSort.js")
  .catch(() => null);

test("source column headers cycle source order, ascending, descending, then source order", () => {
  assert.equal(typeof sortModule?.nextSourceSort, "function");

  const ascending = sortModule.nextSourceSort(null, "cases");
  assert.deepEqual(ascending, { column: "cases", direction: "asc" });

  const descending = sortModule.nextSourceSort(ascending, "cases");
  assert.deepEqual(descending, { column: "cases", direction: "desc" });

  assert.equal(sortModule.nextSourceSort(descending, "cases"), null);
  assert.deepEqual(
    sortModule.nextSourceSort(descending, "date"),
    { column: "date", direction: "asc" },
  );
});

test("source sorting is stable, type-aware, and keeps missing values last", () => {
  assert.equal(typeof sortModule?.sortSourceRows, "function");
  const rows = [
    { id: "first-ten", cases: 10 },
    { id: "missing", cases: null },
    { id: "two", cases: 2 },
    { id: "second-ten", cases: 10 },
  ];

  assert.deepEqual(
    sortModule.sortSourceRows(rows, { column: "cases", direction: "asc" }).map(({ id }) => id),
    ["two", "first-ten", "second-ten", "missing"],
  );
  assert.deepEqual(
    sortModule.sortSourceRows(rows, { column: "cases", direction: "desc" }).map(({ id }) => id),
    ["first-ten", "second-ten", "two", "missing"],
  );
  assert.equal(sortModule.sortSourceRows(rows, null), rows);
});

test("source preview search uses the viewer's all-column literal matching", () => {
  assert.equal(typeof sortModule?.filterSourceRows, "function");
  const rows = [
    { region: "North", value: 12 },
    { region: "South", value: 14 },
  ];
  assert.deepEqual(sortModule.filterSourceRows(rows, ["region", "value"], "14"), [rows[1]]);
  assert.deepEqual(sortModule.filterSourceRows(rows, ["region", "value"], " north "), [rows[0]]);
  assert.equal(sortModule.filterSourceRows(rows, ["region", "value"], ""), rows);
});
