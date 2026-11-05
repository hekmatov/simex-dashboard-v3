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


test("S13 repeated accepted playback frame reuses preparation across equivalent context objects", () => {
  chartRuntimeArtifactRegistry.clearMemory();
  const input = fixture({chart: {id: "cold-audience-frame"}});
  let temporalReads = 0;
  const rows = input.rows.map(row => ({...row, get observed() { temporalReads += 1; return row.observed; }}));
  const renderContext = {sources: {[input.source.id]: input.source}};
  const timeContext = {groupId: "exercise", activeEpochMs: Date.UTC(2027, 4, 1),
    frameIndex: 0, traceMode: "reveal", matching: {policy: "exact"}};
  const props = {chart: input.chart, rows, datasetProfile: input.profile, renderContext, timeContext};
  const first = resolveChartRendering(props);
  assert.equal(first.status, "available");
  assert.equal(first.prepared.marks[0].value, 10);
  assert.ok(temporalReads > 0);
  const readsAfterFirstFrame = temporalReads;
  // Play/accepted publication/preview can recreate a context with the same meaning.
  const repeated = resolveChartRendering({...props, renderContext: {...renderContext}, timeContext: {
    matching: {policy: "exact"}, traceMode: "reveal", frameIndex: 0,
    activeEpochMs: timeContext.activeEpochMs, groupId: "exercise",
  }});
  assert.equal(temporalReads, readsAfterFirstFrame, "an unchanged playback frame must not rescan its source rows");
  assert.strictEqual(repeated.prepared, first.prepared);
});

test("S13 frame reuse invalidates temporal policy and every source generation without accumulating frames", () => {
  chartRuntimeArtifactRegistry.clearMemory();
  const input = fixture({chart: {id: "audience-frame-generations"}});
  const renderContext = {sources: {[input.source.id]: input.source}};
  const timeContext = {groupId: "exercise", activeEpochMs: Date.UTC(2027, 4, 1),
    frameIndex: 0, traceMode: "reveal", matching: {policy: "exact"}};
  const props = {chart: input.chart, rows: input.rows, datasetProfile: input.profile, renderContext, timeContext};
  const first = resolveChartRendering(props);
  const next = resolveChartRendering({...props, timeContext: {...timeContext, frameIndex: 1, activeEpochMs: Date.UTC(2027, 4, 2)}});
  assert.equal(next.prepared.marks.at(-1).value, 20);
  assert.notStrictEqual(next.prepared, first.prepared);
  const previousAgain = resolveChartRendering(props);
  assert.notStrictEqual(previousAgain.prepared, first.prepared, "retain only the most recent resolution per chart");
  for (const change of [
    {timeContext: {...timeContext, traceMode: "full"}},
    {timeContext: {...timeContext, matching: {policy: "lastKnown"}}},
    {timeContext: {...timeContext, groupId: "other"}},
    {datasetProfile: structuredClone(input.profile)},
    {renderContext: {...renderContext, sources: {...renderContext.sources}}},
    {renderContext: {...renderContext, sourceMetadata: {"cases-source": {revision: 2}}}},
    {geoData: {type: "FeatureCollection", features: []}},
    {chart: {...input.chart, title: "Updated authored title"}},
  ]) {
    const baseline = resolveChartRendering(props);
    const changed = resolveChartRendering({...props, ...change});
    assert.notStrictEqual(changed.prepared, baseline.prepared);
    assert.equal(changed.status, "available");
  }
  const replaced = resolveChartRendering({...props, rows: input.rows.map(row => ({...row, cases: row.cases + 100}))});
  assert.equal(replaced.prepared.marks[0].value, 110);
});


test("S13 legacy Date scopes remain distinct", () => {
  chartRuntimeArtifactRegistry.clearMemory();
  const input = fixture({chart: {id: "legacy-date-scopes"}});
  const rows = input.rows.map(row => ({...row, observed: `${row.observed}T00:00:00.000Z`}));
  const chart = {...input.chart, roles: {...input.chart.roles, observation: {
    ...input.chart.roles.observation, format: "ISO-8601",
  }}};
  const props = {chart, rows, datasetProfile: profileDataset(rows, {observed: {interpretation: "temporal", format: "ISO-8601"}})};
  const first = resolveChartRendering({...props, timeContext: {field: "observed", value: new Date(rows[0].observed)}});
  const second = resolveChartRendering({...props, timeContext: {field: "observed", value: new Date(rows[1].observed)}});
  assert.equal(first.prepared.marks[0].value, 10);
  assert.equal(second.prepared.marks[0].value, 20);
});

test("S13 undefined context values cannot alias literal strings", () => {
  chartRuntimeArtifactRegistry.clearMemory();
  const input = fixture({chart: {id: "typed-context-values"}});
  const props = {chart: input.chart, rows: input.rows, datasetProfile: input.profile};
  const playback = {groupId: undefined, activeEpochMs: Date.UTC(2027, 4, 1), matching: {policy: "exact"}};
  const absent = resolveChartRendering({...props, timeContext: playback});
  const literal = resolveChartRendering({...props, timeContext: {...playback, groupId: "[undefined]"}});
  assert.equal(absent.prepared.meta.activeTime.groupId, undefined);
  assert.equal(literal.prepared.meta.activeTime.groupId, "[undefined]");
});
