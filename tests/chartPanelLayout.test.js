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

test("the universal four-by-two footprint preserves every quarter-row height", () => {
  const heights = [
    { rows: 0.25, rowSpan: 1 },
    { rows: 0.5, rowSpan: 2 },
    { rows: 0.75, rowSpan: 3 },
    { rows: 1, rowSpan: 4 },
    { rows: 1.25, rowSpan: 5 },
    { rows: 1.5, rowSpan: 6 },
    { rows: 1.75, rowSpan: 7 },
    { rows: 2, rowSpan: 8 },
  ];
  for (const columns of [1, 2, 3, 4]) {
    for (const { rows, rowSpan } of heights) {
      assert.deepEqual(resolveChartFootprint({ width: columns, height: rows }), {
        columns,
        rows,
      });
      assert.deepEqual(chartPanelFootprintStyle({ width: columns, height: rows }), {
        "--chart-footprint-columns": columns,
        "--chart-footprint-rows": rows,
        "--chart-footprint-row-span": rowSpan,
      });
    }
  }
  assert.deepEqual(resolveChartFootprint({ size: "wide" }), { columns: 4, rows: 1 });
  assert.deepEqual(resolveChartFootprint({ size: "full" }), { columns: 4, rows: 2 });
});
