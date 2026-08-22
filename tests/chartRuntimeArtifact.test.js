import assert from "node:assert/strict";
import test from "node:test";

import { chartPreparationIdentity } from "../src/charting/runtime/chartPreparationIdentity.js";
import {
  CHART_RUNTIME_ARTIFACT_VERSION,
  compileChartRuntimeArtifact,
  validateChartRuntimeArtifact,
} from "../src/charting/runtime/chartRuntimeArtifact.js";
import { createChartRuntimeArtifactRegistry } from "../src/charting/runtime/chartRuntimeArtifactRegistry.js";
import { projectRuntimeArtifact } from "../src/charting/runtime/projectRuntimeArtifact.js";

function fixture(overrides = {}) {
  return {
    chart: {
      id: "trend",
      typeId: "line",
      sourceId: "cases",
      roles: {
        observation: { field: "date", interpretation: "temporal" },
        measurements: [{ field: "value" }],
      },
      transformations: { filters: [] },
      title: "Cases",
      ...overrides.chart,
    },
    source: { id: "cases", fingerprint: "sha256:rows-v1", ...overrides.source },
    profile: {
      rowCount: 2,
      revision: "profile-v1",
      columns: [
        { name: "date", type: "temporal", temporal: { parsingMetadata: { format: "YYYY-MM-DD" } } },
        { name: "value", type: "numeric" },
      ],
      ...overrides.profile,
    },
    geoSource: overrides.geoSource ?? null,
  };
}

test("preparation identity ignores presentation but changes with data authority", () => {
  const base = chartPreparationIdentity(fixture());
  const restyled = chartPreparationIdentity(fixture({
    chart: {
      title: "Restyled",
      presentation: { palette: "coral" },
      layout: { width: 12, height: 8 },
    },
  }));
  const remapped = chartPreparationIdentity(fixture({
    chart: {
      roles: {
        observation: { field: "date", interpretation: "temporal" },
        measurements: [{ field: "other" }],
      },
    },
  }));
  const revisedSource = chartPreparationIdentity(fixture({
    source: { fingerprint: "sha256:rows-v2" },
  }));

  assert.equal(restyled, base);
  assert.notEqual(remapped, base);
  assert.notEqual(revisedSource, base);
});

test("compiled artifacts are immutable, versioned, and strip runtime/source baggage", () => {
  const input = fixture();
  const identity = chartPreparationIdentity(input);
  const prepared = {
    status: "ready",
    marks: [{ x: "2027-05-01", y: 10, feature: { geometry: [1, 2] } }],
    diagnostics: [],
    meta: { formPreparationKey: "draft-key", sourceRows: [{ value: 10 }] },
    renderInstance: () => null,
  };
  const artifact = compileChartRuntimeArtifact({
    identity,
    chart: input.chart,
    source: input.source,
    prepared,
    temporalAvailability: [Date.UTC(2027, 4, 1)],
  });

  assert.equal(artifact.formatVersion, CHART_RUNTIME_ARTIFACT_VERSION);
  assert.equal(validateChartRuntimeArtifact(artifact, identity), artifact);
  assert.equal(Object.isFrozen(artifact), true);
  assert.equal(artifact.prepared.marks[0].feature, undefined);
  assert.equal(artifact.prepared.meta.formPreparationKey, undefined);
  assert.equal(artifact.prepared.meta.sourceRows, undefined);
  assert.equal(artifact.prepared.renderInstance, undefined);
  assert.throws(
    () => validateChartRuntimeArtifact({ ...artifact, formatVersion: 99 }, identity),
    /version/i,
  );
  assert.throws(() => validateChartRuntimeArtifact(artifact, "other"), /identity/i);
});

test("registry publishes to memory immediately and retains it after durable failure", async () => {
  const input = fixture();
  const identity = chartPreparationIdentity(input);
  const artifact = compileChartRuntimeArtifact({
    identity,
    chart: input.chart,
    source: input.source,
    prepared: { status: "ready", marks: [], diagnostics: [], meta: {} },
  });
  const failure = Object.assign(new Error("full"), { code: "ARTIFACT_QUOTA_EXHAUSTED" });
  const failures = [];
  const registry = createChartRuntimeArtifactRegistry({
    store: { put: async () => { throw failure; } },
    onPersistenceFailure: (error) => failures.push(error),
  });

  const publication = registry.publish(artifact);
  assert.strictEqual(registry.get(identity), artifact);
  await assert.rejects(publication.persistence, { code: "ARTIFACT_QUOTA_EXHAUSTED" });
  assert.strictEqual(registry.get(identity), artifact);
  assert.deepEqual(failures, [failure]);
});

test("runtime projection applies exact, carried, nearest, interpolation, and reveal without mutation", () => {
  const input = fixture();
  const identity = chartPreparationIdentity(input);
  const artifact = compileChartRuntimeArtifact({
    identity,
    chart: input.chart,
    source: input.source,
    prepared: {
      status: "ready",
      marks: [
        { x: "2027-05-01", y: 10, series: "cases" },
        { x: "2027-05-03", y: 30, series: "cases" },
      ],
      diagnostics: [],
      meta: {},
    },
  });
  const before = JSON.stringify(artifact);
  const exact = projectRuntimeArtifact({
    artifact,
    chart: input.chart,
    timeContext: { activeEpochMs: Date.UTC(2027, 4, 1), matching: { policy: "exact" } },
  });
  const carried = projectRuntimeArtifact({
    artifact,
    chart: input.chart,
    timeContext: { activeEpochMs: Date.UTC(2027, 4, 2), matching: { policy: "lastKnown" } },
  });
  const interpolated = projectRuntimeArtifact({
    artifact,
    chart: input.chart,
    timeContext: { activeEpochMs: Date.UTC(2027, 4, 2), matching: { policy: "interpolate" } },
  });
  const revealed = projectRuntimeArtifact({
    artifact,
    chart: input.chart,
    timeContext: {
      activeEpochMs: Date.UTC(2027, 4, 2),
      matching: { policy: "nearest", toleranceMs: 2 * 86400000 },
      traceMode: "reveal",
    },
  });

  assert.equal(exact.marks[0].temporalProvenance.status, "observed");
  assert.equal(carried.marks[0].temporalProvenance.status, "carried");
  assert.equal(interpolated.marks[0].y, 20);
  assert.equal(interpolated.marks[0].temporalProvenance.status, "interpolated");
  assert.equal(revealed.marks.length, 1);
  assert.equal(revealed.marks[0].active, true);
  assert.equal(revealed.marks[0].temporalProvenance.status, "nearest");
  assert.equal(JSON.stringify(artifact), before);
});
