import test from "node:test";
import assert from "node:assert/strict";

import {
  findConfiguredChart,
  findPanelPlacement,
} from "../src/lib/dashboardSelectors.js";

const dashboard = {
  pages: [{
    id: "home",
    sections: [{
      id: "overview",
      panels: [{ id: "placement-a", chart: { id: "chart-a", title: "Chart A" } }],
    }],
  }],
};

test("placement IDs and chart IDs remain distinct", () => {
  assert.equal(findPanelPlacement(dashboard, "placement-a").chart.id, "chart-a");
  assert.equal(findConfiguredChart(dashboard, "chart-a").id, "chart-a");
  assert.equal(findConfiguredChart(dashboard, "placement-a"), null);
});
