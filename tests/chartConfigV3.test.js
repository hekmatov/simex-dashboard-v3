import assert from "node:assert/strict";
import test from "node:test";

import {
  createChartDraft,
  validateChartInstance,
} from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { validateChartDataCompatibility } from "../src/charting/data/prepareChartData.js";

test("direct compatibility reports the exact missing configured column without changing chart V3", () => {
  const chart = createChartDraft("line", {
    id: "trend", title: "Trend", sourceId: "cases",
    roles: { measurements: [{ field: "cases", axis: "primary" }], observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" } },
  });
  const before = structuredClone(chart);
  const result = validateChartDataCompatibility({
    chart,
    rows: [{ date: "2026-01-01" }],
    datasetProfile: profileDataset([{ date: "2026-01-01" }]),
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missingColumns, ["cases"]);
  assert.equal(result.errors[0].code, "missing-encoding-column");
  assert.deepEqual(chart, before);
  assert.equal(chart.configVersion, 3);
});

test("direct compatibility accepts a structurally complete candidate", () => {
  const rows = [{ date: "2026-01-01", cases: 4 }];
  const chart = createChartDraft("line", {
    id: "trend", title: "Trend", sourceId: "cases",
    roles: { measurements: [{ field: "cases", axis: "primary" }], observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" } },
  });
  const result = validateChartDataCompatibility({ chart, rows, datasetProfile: profileDataset(rows) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.missingColumns, []);
  assert.equal(result.prepared.status, "ready");
});

test("chart drafts preserve an optional false title visibility flag", () => {
  const chart = createChartDraft("line", {
    id: "hidden-title-trend",
    title: "Hidden title trend",
    sourceId: "cases",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: {
        field: "date",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    presentation: { title: { visible: false } },
  });

  assert.equal(chart.presentation.title.visible, false);
  assert.equal(validateChartInstance(chart), chart);
});

test("chart title visibility rejects non-boolean values", () => {
  const chart = createChartDraft("line", {
    id: "invalid-title-visibility",
    title: "Invalid title visibility",
    sourceId: "cases",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: {
        field: "date",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    presentation: { title: { visible: "false" } },
  });

  assert.throws(
    () => validateChartInstance(chart),
    /Chart presentation title visible must be boolean\./,
  );
});
