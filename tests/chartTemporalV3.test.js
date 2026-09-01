import test from "node:test";
import assert from "node:assert/strict";

import { normalizeTemporalColumn, parseTemporalValue } from "../src/charting/data/temporal.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";

test("DD/MM/YYYY is parsed only through an explicit or unambiguous rule", () => {
  const ambiguous = parseTemporalValue("02/05/2027", { interpretation: "auto" });
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.diagnostic.code, "ambiguous-date-format");

  const parsed = parseTemporalValue("02/05/2027", {
    interpretation: "temporal",
    format: "DD/MM/YYYY",
    timezone: "date-only",
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.canonical, "2027-05-02");
});

test("auto parsing accepts only slash dates whose month position is unambiguous", () => {
  assert.deepEqual(parseTemporalValue("13/05/2027", { interpretation: "auto" }), {
    ok: true,
    canonical: "2027-05-13",
    kind: "date-only",
  });
  assert.deepEqual(parseTemporalValue("05/13/2027", { interpretation: "auto" }), {
    ok: true,
    canonical: "2027-05-13",
    kind: "date-only",
  });
  assert.equal(parseTemporalValue("02/05/2027", { interpretation: "auto" }).diagnostic.code, "ambiguous-date-format");
});

test("an auto-selected slash format reports invalid calendar dates precisely", () => {
  const invalid = parseTemporalValue("31/02/2027", { interpretation: "auto" });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.diagnostic.code, "invalid-calendar-date");
});

test("a forced category interpretation wins over a date-shaped field name", () => {
  const profile = profileDataset(
    [{ date: "02/05/2027", deaths: "2590" }],
    { date: { interpretation: "category" } },
  );
  assert.equal(profile.columns.find(({ name }) => name === "date").type, "category");
});

test("a date-shaped field name is a temporal suggestion until an author overrides it", () => {
  const profile = profileDataset([{ date: "02/05/2027" }]);
  const column = profile.columns[0];
  assert.equal(column.type, "temporal");
  assert.equal(column.temporal.diagnostics[0].code, "ambiguous-date-format");
});

test("ISO date-only and instants normalize to stable canonical values", () => {
  assert.deepEqual(parseTemporalValue("2027-05-02", { interpretation: "temporal" }), {
    ok: true,
    canonical: "2027-05-02",
    kind: "date-only",
  });
  assert.deepEqual(parseTemporalValue("2027-05-02T13:45:00+03:00", { interpretation: "temporal" }), {
    ok: true,
    canonical: "2027-05-02T10:45:00.000Z",
    kind: "instant",
  });
});

test("four-digit years accept numeric CSV cells without accepting arbitrary numbers", () => {
  for (const value of [2016, "2016"]) {
    assert.deepEqual(parseTemporalValue(value, { interpretation: "temporal" }), {
      ok: true,
      canonical: "2016-01-01",
      kind: "date-only",
    });
  }
  for (const value of [201, 2016.5, 20160]) {
    assert.equal(parseTemporalValue(value, { interpretation: "temporal" }).ok, false);
  }
});

test("invalid calendar dates and source strings outside approved formats are rejected", () => {
  assert.equal(parseTemporalValue("2027-02-29", { interpretation: "temporal" }).ok, false);
  assert.equal(parseTemporalValue("May 2, 2027", { interpretation: "temporal" }).diagnostic.code, "ambiguous-date-format");
});

test("normalizing a column retains canonical values and diagnostics for unparseable rows", () => {
  const normalized = normalizeTemporalColumn(["2027-05-01", "02/05/2027", null], { interpretation: "temporal" });
  assert.deepEqual(normalized.values, ["2027-05-01", null, null]);
  assert.equal(normalized.diagnostics.length, 1);
  assert.equal(normalized.diagnostics[0].index, 1);
  assert.equal(normalized.diagnostics[0].code, "ambiguous-date-format");
});

test("profiling reports typed columns, missing and unique counts, examples, hints, and a stable fingerprint", () => {
  const rows = [
    { occurred_at: "2027-05-01T00:00:00Z", region: "North", active: "true", cases: "10", latitude: "41.7", longitude: "44.8" },
    { occurred_at: "2027-05-02T00:00:00Z", region: "South", active: "false", cases: "12", latitude: "42.0", longitude: "45.0" },
    { occurred_at: null, region: "North", active: "true", cases: "", latitude: "", longitude: "" },
  ];
  const profile = profileDataset(rows);
  const byName = Object.fromEntries(profile.columns.map((column) => [column.name, column]));

  assert.equal(byName.occurred_at.type, "temporal");
  assert.equal(byName.cases.type, "numeric");
  assert.equal(byName.region.type, "category");
  assert.equal(byName.active.type, "boolean");
  assert.equal(byName.latitude.geographicHint, "latitude");
  assert.equal(byName.longitude.geographicHint, "longitude");
  assert.equal(byName.cases.missingCount, 1);
  assert.equal(byName.region.uniqueCount, 2);
  assert.deepEqual(byName.region.examples, ["North", "South"]);
  assert.equal(profile.rowCount, 3);
  assert.match(profile.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(profile.fingerprint, profileDataset(rows).fingerprint);
  assert.notEqual(profile.fingerprint, profileDataset([{ ...rows[0], cases: "11" }, rows[1], rows[2]]).fingerprint);
});

test("numeric CSV year columns profile as temporal without treating percentage values as dates", () => {
  const profile = profileDataset([
    { Year: 2016, "Percent of 16 to 24 year olds": 24.8, Capacity: 1100 },
    { Year: 2017, "Percent of 16 to 24 year olds": 26.1, Capacity: 1200 },
  ]);
  const byName = Object.fromEntries(profile.columns.map((column) => [column.name, column]));

  assert.equal(byName.Year.type, "temporal");
  assert.deepEqual(byName.Year.temporal.values, ["2016-01-01", "2017-01-01"]);
  assert.deepEqual(byName.Year.temporal.diagnostics, []);
  assert.deepEqual(byName.Year.temporal.parsingMetadata, {
    interpretation: "auto",
    format: "YYYY",
  });
  assert.equal(byName["Percent of 16 to 24 year olds"].type, "numeric");
  assert.equal(Object.hasOwn(byName["Percent of 16 to 24 year olds"], "temporal"), false);
  assert.equal(byName.Capacity.type, "numeric");
  assert.equal(Object.hasOwn(byName.Capacity, "temporal"), false);
});

test("author overrides determine a column type and temporal format", () => {
  const metadata = { interpretation: "temporal", format: "DD/MM/YYYY", timezone: "date-only" };
  const profile = profileDataset(
    [{ reported: "02/05/2027", code: "001" }],
    {
      reported: metadata,
      code: { interpretation: "category" },
    },
  );
  const byName = Object.fromEntries(profile.columns.map((column) => [column.name, column]));
  assert.equal(byName.reported.type, "temporal");
  assert.deepEqual(byName.reported.temporal.values, ["2027-05-02"]);
  assert.deepEqual(byName.reported.temporal.parsingMetadata, metadata);
  metadata.format = "MM/DD/YYYY";
  assert.equal(byName.reported.temporal.parsingMetadata.format, "DD/MM/YYYY");
  assert.equal(byName.code.type, "category");
});

test("special numeric values remain distinct for unique counts and fingerprints", () => {
  const profile = profileDataset([
    { value: Number.NaN },
    { value: Number.POSITIVE_INFINITY },
    { value: Number.NEGATIVE_INFINITY },
    { value: -0 },
    { value: 0 },
    { value: null },
  ]);
  assert.equal(profile.columns[0].uniqueCount, 5);
  assert.notEqual(profileDataset([{ value: Number.NaN }]).fingerprint, profileDataset([{ value: Number.POSITIVE_INFINITY }]).fingerprint);
  assert.notEqual(profileDataset([{ value: -0 }]).fingerprint, profileDataset([{ value: 0 }]).fingerprint);
  assert.notEqual(profileDataset([{ value: null }]).fingerprint, profileDataset([{ value: Number.NaN }]).fingerprint);
});
