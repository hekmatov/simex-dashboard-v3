import assert from "node:assert/strict";
import test from "node:test";
import { CANVAS_GEOMETRY, chartFootprintPixelSize, resolveCanvasGeometry, layoutGridGeometryStyle } from "../src/components/chartStageGeometry.js";
import { STATIC_FOOTPRINT_ROW_HEIGHTS } from "../src/components/chartPanelLayout.js";

test("canonical desktop footprints retain literal destination sizes", () => {
  for (const [columns, rows, width, height] of [
    [1, 1, 327, 418], [2, 1, 670, 418], [4, 1, 1356, 418], [4, 2, 1356, 852],
    [3, 0.25, 1013, 92.5], [2, 0.5, 670, 201], [1, 0.75, 327, 309.5],
  ]) assert.deepEqual(chartFootprintPixelSize({ columns, rows }), { width, height });
});

test("every supported width and eighth-row height follows desktop and tablet tracks", () => {
  const heights = [38.25, 92.5, 146.75, 201, 255.25, 309.5, 363.75, 418, 472.25, 526.5, 580.75, 635, 689.25, 743.5, 797.75, 852, 906.25, 960.5, 1014.75, 1069, 1123.25, 1177.5, 1231.75, 1286, 1340.25, 1394.5, 1448.75, 1503, 1557.25, 1611.5, 1665.75, 1720];
  for (const [deviceLayout, widths, step] of [
    ["desktop", [327, 670, 1013, 1356], 0],
    ["tablet", [274, 564, 854, 1144], 2.75],
  ]) for (let column = 0; column < 4; column++) {
    STATIC_FOOTPRINT_ROW_HEIGHTS.forEach((rows, index) => {
      assert.deepEqual(chartFootprintPixelSize({ columns: column + 1, rows }, CANVAS_GEOMETRY[deviceLayout]), {
        width: widths[column], height: heights[index] + step * (index + 1),
      });
    });
  }
});

test("effective canvas width replaces the maximum under Build rails without rounding", () => {
  const desktop = resolveCanvasGeometry({ canvasWidth: 900.5 });
  assert.deepEqual(chartFootprintPixelSize({ columns: 2, rows: 0.5 }, desktop), { width: 424.25, height: 201 });
  assert.deepEqual(chartFootprintPixelSize({ columns: 4, rows: 2 }, desktop), { width: 864.5, height: 852 });
  const tablet = resolveCanvasGeometry({ deviceLayout: "tablet", canvasWidth: 800 });
  assert.deepEqual(chartFootprintPixelSize({ columns: 3, rows: 1 }, tablet), { width: 569, height: 440 });
  assert.equal(CANVAS_GEOMETRY.desktop.canvasWidth, 1392);
  assert.ok(Object.isFrozen(desktop));
});

test("phone stage falls back to desktop geometry and invalid widths cannot create negative tracks", () => {
  assert.equal(resolveCanvasGeometry({ deviceLayout: "phone" }), CANVAS_GEOMETRY.desktop);
  for (const canvasWidth of [NaN, Infinity, -1, 0, 84, "900"]) {
    assert.equal(resolveCanvasGeometry({ canvasWidth }), CANVAS_GEOMETRY.desktop);
  }
  assert.equal(layoutGridGeometryStyle()["--layout-grid-gap"], "16px");
  assert.equal(layoutGridGeometryStyle()["--layout-grid-row-height"], "38.25px");
  assert.equal(layoutGridGeometryStyle()["--layout-grid-tablet-row-height"], "41px");
});
