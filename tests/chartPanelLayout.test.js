import assert from "node:assert/strict";
import test from "node:test";

import {
  chartPanelFootprintStyle,
  chartPanelLayoutClass,
  resolveChartFootprint,
} from "../src/components/chartPanelLayout.js";

test("version-3 chart sizes map to their panel layout classes", () => {
  const expected = {
    compact: "chart-panel-compact",
    standard: "chart-panel-standard",
    wide: "chart-panel-wide",
    full: "chart-panel-full",
  };
  for (const [size, className] of Object.entries(expected)) {
    assert.equal(chartPanelLayoutClass(size), className);
  }
  assert.equal(chartPanelLayoutClass("removed-v2-size"), "chart-panel-standard");
});

test("the universal four-by-two footprint resolves all eight bounded chart sizes", () => {
  const expected = [
    [1, 1], [2, 1], [3, 1], [4, 1],
    [1, 2], [2, 2], [3, 2], [4, 2],
  ];
  for (const [columns, rows] of expected) {
    assert.deepEqual(resolveChartFootprint({ width: columns, height: rows }), {
      columns,
      rows,
    });
    assert.deepEqual(chartPanelFootprintStyle({ width: columns, height: rows }), {
      "--chart-footprint-columns": columns,
      "--chart-footprint-rows": rows,
    });
  }
  assert.deepEqual(resolveChartFootprint({ size: "wide" }), { columns: 4, rows: 1 });
  assert.deepEqual(resolveChartFootprint({ size: "full" }), { columns: 4, rows: 2 });
});
