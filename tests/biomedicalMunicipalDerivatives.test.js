import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMunicipalDerivatives,
} from "../scripts/biomedicalMunicipalDerivatives.mjs";

const HEADER = [
  "Datum",
  "MunicipalityCode",
  "Gemeentecode",
  "Gemeentenaam",
  "Provincienaam",
  "AantalCumulatief",
  "population",
  "infectionsPerPopulation",
  "infectionsPer1000",
  "infectionsPer10000",
  "dataMethod",
  "populationSource",
  "sourceMunicipalityCodes",
].join(",");

const ROWS = [
  "2020-01-01,GM0001,1,Alpha,North,10,1000,0.00125,0.125,1.25,direct,census,GM0001",
  "2020-01-01,GM0002,2,Beta,South,20,2000,0.0025,0.25,2.5,direct,census,GM0002",
  "2020-01-02,GM0001,1,Alpha,North,30,1000,0.00375,0.375,3.75,direct,census,GM0001",
  "2020-01-02,GM0002,2,Beta,South,40,2000,0.004,0.4,4,direct,census,GM0002",
];

const FIXTURE = [HEADER, ...ROWS].join("\n");

test("municipal derivatives retain exact map cells and precompute chart-specific rows", () => {
  const result = buildMunicipalDerivatives(FIXTURE, {
    sourcePath: "authority.csv",
  });

  assert.equal(result.files.map, [
    "Datum,MunicipalityCode,infectionsPer10000",
    "2020-01-01,GM0001,1.25",
    "2020-01-01,GM0002,2.5",
    "2020-01-02,GM0001,3.75",
    "2020-01-02,GM0002,4",
  ].join("\n"));
  assert.equal(result.files.aggregate, [
    "Datum,AantalCumulatief",
    "2020-01-01,30",
    "2020-01-02,70",
  ].join("\n"));
  assert.equal(result.files.bubble, [
    "Datum,population,infectionsPer10000,AantalCumulatief,Gemeentenaam,Provincienaam",
    "2020-01-02,1000,3.75,30,Alpha,North",
    "2020-01-02,2000,4,40,Beta,South",
  ].join("\n"));
  assert.equal(result.manifest.authoritative.path, "authority.csv");
  assert.equal(result.manifest.authoritative.rowCount, 4);
  assert.match(result.manifest.authoritative.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    Object.fromEntries(Object.entries(result.manifest.derivatives).map(
      ([name, derivative]) => [name, derivative.rowCount],
    )),
    { map: 4, aggregate: 2, bubble: 2 },
  );
  for (const derivative of Object.values(result.manifest.derivatives)) {
    assert.match(derivative.sha256, /^[a-f0-9]{64}$/);
  }
});

test("municipal derivatives reject duplicate map keys", () => {
  const duplicate = [HEADER, ...ROWS, ROWS[0]].join("\n");

  assert.throws(
    () => buildMunicipalDerivatives(duplicate, { sourcePath: "authority.csv" }),
    /Duplicate municipal map key "2020-01-01\|GM0001"/,
  );
});

test("municipal derivatives reject an incomplete date and municipality grid", () => {
  const incomplete = [HEADER, ...ROWS.slice(0, 3)].join("\n");

  assert.throws(
    () => buildMunicipalDerivatives(incomplete, { sourcePath: "authority.csv" }),
    /complete date-by-municipality grid/,
  );
});

test("municipal derivatives reject non-finite values used by the map", () => {
  const invalid = [HEADER, ...ROWS].join("\n").replace(
    ",0.00375,0.375,3.75,direct,",
    ",0.00375,0.375,not-a-number,direct,",
  );

  assert.throws(
    () => buildMunicipalDerivatives(invalid, { sourcePath: "authority.csv" }),
    /finite infectionsPer10000/,
  );
});
