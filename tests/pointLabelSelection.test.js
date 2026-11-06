import assert from "node:assert/strict";
import test from "node:test";
import { buildPointLabelMatrix, pointLabelKey, pointLabelSelected, setPointLabels, normalizePointLabelSelection } from "../src/charting/presentation/pointLabelSelection.js";
import { createChartDraft, normalizeChartInstance, validateChartInstance } from "../src/charting/config/chartConfigV3.js";

test("point-label settings validate and normalize only on axis charts", () => {
  const chart = createChartDraft("line", { id: "labels", title: "Labels", sourceId: "data", roles: { observation: { field: "x" }, measurements: [{ field: "value" }] },
    presentation: { labels: { visible: true, pointSelection: { mode: "only", keys: ["dormant-point"] } } } });
  assert.doesNotThrow(() => validateChartInstance(chart));
  const normalized = normalizeChartInstance(chart);
  chart.presentation.labels.pointSelection.keys.push("later");
  assert.deepEqual(normalized.presentation.labels.pointSelection.keys, ["dormant-point"]);
  assert.throws(() => createChartDraft("line", { ...chart, presentation: { labels: { pointSelection: { mode: "only", keys: ["a", "a"] } } } }));
  const pie = createChartDraft("pie", { id: "pie", title: "Pie", sourceId: "data", roles: { category: { field: "x" }, value: { field: "value" } } });
  pie.presentation.labels = { pointSelection: { mode: "only", keys: [] } };
  assert.throws(() => validateChartInstance(pie), /axis chart/);
});

test("point-label selection accessors are rejected at the chart boundary", () => {
  const chart = createChartDraft("line", { id: "active", title: "Active", sourceId: "data", roles: { observation: { field: "x" }, measurements: [{ field: "value" }] } });
  let evaluated = false;
  chart.presentation.labels = Object.defineProperty({}, "pointSelection", { enumerable: true, get() { evaluated = true; return { mode: "only", keys: [] }; } });
  assert.throws(() => validateChartInstance(chart));
  assert.equal(evaluated, false);
});

test("point-label matrix follows series and category identities rather than aliases or visual positions", () => {
  const marks = [{ x: "A", value: 10, measure: "one" }, { x: "B", value: 20, measure: "one" }, { x: "A", value: 30, measure: "two" }];
  const plain = buildPointLabelMatrix({ chart: {}, prepared: { marks } });
  assert.equal(plain.rows.length, 2);
  assert.deepEqual(plain.columns.map(c => c.label), ["A", "B"]);
  assert.deepEqual(plain.rows[0].points.map(p => p?.value), [10, 20]);
  assert.equal(plain.rows[1].points[1], null);
  const reordered = buildPointLabelMatrix({ chart: { presentation: {
    series: { order: [plain.rows[1].key, plain.rows[0].key] },
    axes: { x: { categoryOrder: [plain.columns[1].key, plain.columns[0].key] } },
    legend: { entries: { [plain.rows[0].key]: { label: "Alias" } } },
  } }, prepared: { marks } });
  assert.equal(reordered.rows[1].label, "Alias");
  assert.equal(reordered.rows[1].points[0].key, plain.rows[0].points[1].key);
  assert.notEqual(pointLabelKey({ ...marks[0], x: 1 }), pointLabelKey({ ...marks[0], x: "1" }));
});

test("point-label row and column updates retain dormant choices and distinguish Automatic, All and None", () => {
  assert.equal(pointLabelSelected(undefined, "a"), true);
  const hidden = setPointLabels(undefined, ["a", "b"], false);
  assert.deepEqual(hidden, { mode: "allExcept", keys: ["a", "b"] });
  assert.equal(pointLabelSelected(hidden, "a"), false);
  assert.equal(pointLabelSelected(hidden, "new"), true);
  assert.deepEqual(setPointLabels(hidden, ["a"], true), { mode: "allExcept", keys: ["b"] });
  assert.deepEqual(setPointLabels(hidden, ["a", "b"], true), { mode: "allExcept", keys: [] });
  const none = { mode: "only", keys: [] };
  assert.equal(pointLabelSelected(none, "new"), false);
  const selected = setPointLabels(none, ["a", "dormant"], true);
  assert.deepEqual(setPointLabels(selected, ["a", "b"], false), { mode: "only", keys: ["dormant"] });
  assert.deepEqual(none, { mode: "only", keys: [] });
});

test("point-label selection rejects malformed and active records without evaluating accessors", () => {
  assert.equal(normalizePointLabelSelection(undefined), undefined);
  assert.deepEqual(normalizePointLabelSelection({ mode: "allExcept", keys: [] }), { mode: "allExcept", keys: [] });
  assert.deepEqual(normalizePointLabelSelection({ mode: "only", keys: [] }), { mode: "only", keys: [] });
  for (const value of [{ mode: "bad", keys: [] }, { mode: "only", keys: [1] }, { mode: "only", keys: ["a", "a"] }, { mode: "only", keys: [], extra: 1 }, []]) assert.throws(() => normalizePointLabelSelection(value));
  let evaluated = false;
  const active = Object.defineProperty({ keys: [] }, "mode", { enumerable: true, get() { evaluated = true; return "only"; } });
  assert.throws(() => normalizePointLabelSelection(active));
  assert.equal(evaluated, false);
});
