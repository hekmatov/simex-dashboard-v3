import assert from "node:assert/strict";
import test from "node:test";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import { resolveChartRendering } from "../src/charting/rendering/resolveChartRendering.js";
import { compileAuthoredChartRuntimeArtifact } from "../src/charting/runtime/authoredChartRuntimeArtifact.js";
import { chartRuntimeArtifactRegistry } from "../src/charting/runtime/chartRuntimeArtifactRegistry.js";

function fixture(overrides = {}) {
  const rows = [
    { observed: "2027-05-01", cases: 10 },
    { observed: "2027-05-02", cases: 20 },
  ];
  const chart = {
    id: "trend",
    typeId: "line",
    sourceId: "cases-source",
    title: "Case trend",
    roles: {
      measurements: [{ field: "cases" }],
      observation: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    transformations: { filters: [] },
    ...overrides.chart,
  };
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
    cases: { interpretation: "number" },
  });
  const source = {
    id: "cases-source",
    kind: "csv",
    url: "data/cases.csv",
    fingerprint: "sha256:cases-v1",
    ...overrides.source,
  };
  return { chart, rows, profile, source };
}

test("authoring compilation preserves preparation identity across presentation-only edits", () => {
  const input = fixture();
  const prepared = resolveChartRendering({
    chart: input.chart,
    rows: input.rows,
    datasetProfile: input.profile,
    renderContext: { sources: { [input.source.id]: input.source } },
  }).prepared;
  const first = compileAuthoredChartRuntimeArtifact({ ...input, prepared });
  const restyled = compileAuthoredChartRuntimeArtifact({
    ...input,
    chart: {
      ...input.chart,
      title: "A new title",
      presentation: { palette: "coral" },
      layout: { width: 12, height: 8 },
    },
    prepared,
  });
  const filtered = compileAuthoredChartRuntimeArtifact({
    ...input,
    chart: {
      ...input.chart,
      transformations: {
        filters: [{ field: "cases", operator: "greaterThan", value: 10 }],
      },
    },
    prepared,
  });

  assert.equal(restyled.identity, first.identity);
  assert.notEqual(filtered.identity, first.identity);
  assert.equal(first.chartId, input.chart.id);
});

test("static rendering reuses a compiled artifact across cloned restyled charts", () => {
  chartRuntimeArtifactRegistry.clearMemory();
  const input = fixture();
  const renderContext = { sources: { [input.source.id]: input.source } };
  resolveChartRendering({
    chart: input.chart,
    rows: input.rows,
    datasetProfile: input.profile,
    renderContext,
  });
  const second = resolveChartRendering({
    chart: { ...input.chart, title: "Restyled", presentation: { palette: "violet" } },
    rows: input.rows,
    datasetProfile: input.profile,
    renderContext,
  });
  const third = resolveChartRendering({
    chart: { ...input.chart, title: "Restyled again", presentation: { palette: "mint" } },
    rows: input.rows,
    datasetProfile: input.profile,
    renderContext,
  });

  assert.equal(second.status, "available");
  assert.strictEqual(third.prepared, second.prepared);

  const changed = resolveChartRendering({
    chart: {
      ...input.chart,
      transformations: {
        filters: [{ field: "cases", operator: "greaterThan", value: 10 }],
      },
    },
    rows: input.rows,
    datasetProfile: input.profile,
    renderContext,
  });
  assert.notStrictEqual(changed.prepared, second.prepared);
});
