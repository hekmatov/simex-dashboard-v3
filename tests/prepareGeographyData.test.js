import assert from "node:assert/strict";
import test from "node:test";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import { inspectGeographyJoinCoverage } from "../src/charting/data/prepareGeographyData.js";

const rows = [
  { municipality: "A", cases: 4 },
  { municipality: "B", cases: 7 },
];
const chart = {
  configVersion: 3,
  id: "cases-map",
  typeId: "choroplethMap",
  roles: { geography: { field: "municipality", interpretation: "geographic" }, value: { field: "cases" } },
  presentation: { map: { geoSource: "boundaries", joinField: "code" } },
};

test("direct map coverage distinguishes usable, reduced, and zero candidate joins", () => {
  const datasetProfile = profileDataset(rows);
  const complete = inspectGeographyJoinCoverage({ chart, rows, datasetProfile, geoData: boundaries("A", "B") });
  const reduced = inspectGeographyJoinCoverage({ chart, rows, datasetProfile, geoData: boundaries("A") });
  const empty = inspectGeographyJoinCoverage({ chart, rows, datasetProfile, geoData: boundaries("C") });

  assert.deepEqual(complete, { ok: true, joinField: "code", eligibleCount: 2, matchedCount: 2, coverage: 1, errors: [] });
  assert.equal(reduced.ok, true);
  assert.equal(reduced.matchedCount, 1);
  assert.equal(reduced.coverage, 0.5);
  assert.equal(empty.ok, false);
  assert.equal(empty.errors[0].code, "zero-usable-join-coverage");
});

test("a map without a geography binding is directly unusable", () => {
  const result = inspectGeographyJoinCoverage({
    chart: { ...chart, roles: { value: { field: "cases" } } },
    rows,
    datasetProfile: profileDataset(rows),
    geoData: boundaries("A", "B"),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "missing-geography-binding");
});

function boundaries(...codes) {
  return {
    type: "FeatureCollection",
    features: codes.map((code, index) => ({
      type: "Feature",
      properties: { code },
      geometry: { type: "Point", coordinates: [4 + index, 52] },
    })),
  };
}
