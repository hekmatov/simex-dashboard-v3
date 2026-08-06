import assert from "node:assert/strict";
import test from "node:test";

import { chartPanelLayoutClass } from "../src/components/chartPanelLayout.js";

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
