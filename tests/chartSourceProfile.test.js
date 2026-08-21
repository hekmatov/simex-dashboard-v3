import assert from "node:assert/strict";
import test from "node:test";

import { profileChartSource } from "../src/charting/forms/sourceProfile.js";
import { profileGeographyResource } from "../src/charting/forms/geographyProfile.js";

test("existing, CSV, and manual sources produce deterministic ready profiles", () => {
  for (const kind of ["existing", "csv", "manual"]) {
    const input = {
      sourceId: `${kind}-source`,
      kind,
      provenance: { label: `${kind} data`, origin: kind },
      rows: [
        { observed: "2026-08-01", value: 4, unit: "people" },
        { observed: "2026-08-02", value: 7, unit: "people" },
      ],
      authorMetadata: { value: { interpretation: "number", unit: "people" } },
    };
    const first = profileChartSource(input);
    const second = profileChartSource(structuredClone(input));
    assert.equal(first.status, "ready");
    assert.equal(first.sourceId, `${kind}-source`);
    assert.deepEqual(first.timeCoverage, {
      start: Date.parse("2026-08-01T00:00:00.000Z"),
      end: Date.parse("2026-08-02T00:00:00.000Z"),
    });
    assert.equal(first.fields.find(({ id }) => id === "value").type, "number");
    assert.equal(first.fields.find(({ id }) => id === "value").unit, "people");
    assert.deepEqual(first.provenance, input.provenance);
    assert.equal(first.schemaRevision, second.schemaRevision);
  }
});

test("empty, partial, retryable, and terminal source states remain distinct", () => {
  assert.equal(profileChartSource({ sourceId: "empty", rows: [] }).status, "empty");
  assert.equal(profileChartSource({
    sourceId: "partial",
    rows: [{ value: 1 }, null, { value: null }],
  }).status, "partial");
  assert.deepEqual(profileChartSource({
    sourceId: "offline",
    availability: "unavailable",
  }).error, {
    code: "source-unavailable",
    message: "Data source offline is unavailable. Retry when access is restored.",
    stage: "data-source",
    retryable: true,
  });
  assert.equal(profileChartSource({
    sourceId: "forbidden",
    availability: "forbidden",
  }).error.retryable, false);
});

test("CSV limits report measured values and preserve source identity", () => {
  const result = profileChartSource({
    sourceId: "large-csv",
    kind: "csv",
    rows: [{ value: 1 }],
    byteLength: (2 * 1024 * 1024) + 1,
    limits: { maxBytes: 2 * 1024 * 1024, maxRows: 50_000 },
  });
  assert.equal(result.sourceId, "large-csv");
  assert.equal(result.status, "unavailable");
  assert.equal(result.error.code, "csv-byte-limit");
  assert.match(result.error.message, /2097153.*2097152/);
});

test("geography profiles distinguish compatible coverage and repair states", () => {
  const geoData = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { code: "DE" }, geometry: null },
      { type: "Feature", properties: { code: "FR" }, geometry: null },
    ],
  };
  const compatible = profileGeographyResource({
    geographyId: "countries",
    geoData,
    keyField: "code",
    dataIdentifiers: ["DE", "FR"],
    minimumCoverage: 0.75,
  });
  assert.equal(compatible.status, "compatible");
  assert.equal(compatible.coverage, 1);

  const incompatible = profileGeographyResource({
    geographyId: "countries",
    geoData,
    keyField: "code",
    dataIdentifiers: ["DE", "ES", "IT"],
    minimumCoverage: 0.75,
  });
  assert.equal(incompatible.status, "incompatible");
  assert.deepEqual(incompatible.unmatchedIdentifiers, ["ES", "IT"]);
  assert.match(incompatible.reason, /coverage/i);
});
