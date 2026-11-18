import assert from "node:assert/strict";
import test from "node:test";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import { collectTemporalAvailability } from "../src/charting/time/temporalAvailability.js";

function chart(overrides = {}) {
  return {
    id: "cases",
    typeId: "line",
    sourceId: "cases-source",
    roles: {
      measurements: [{ field: "value" }],
      observation: {
        field: "date",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    transformations: { filters: [] },
    ...overrides,
  };
}

function fixture() {
  const rows = [
    { date: "2027-05-01", value: 10, region: "north" },
    { date: "2027-05-02", value: 20, region: "south" },
  ];
  return {
    rows,
    profile: profileDataset(rows, {
      date: { interpretation: "temporal", format: "YYYY-MM-DD" },
      value: { interpretation: "number" },
    }),
    member: { chartId: "cases", timeRole: "observation" },
    period: { start: "2027-05-01", end: "2027-05-02" },
  };
}

test("temporal availability reuses invariant work across presentation-only chart changes", () => {
  const input = fixture();
  const first = collectTemporalAvailability({ chart: chart(), ...input });
  const second = collectTemporalAvailability({
    chart: chart({
      title: "Restyled title",
      presentation: { palette: "coral", legend: "bottom" },
      layout: { width: 12, height: 8 },
    }),
    ...input,
  });

  assert.strictEqual(second, first);
  assert.deepEqual(first, [Date.UTC(2027, 4, 1), Date.UTC(2027, 4, 2)]);
});

test("temporal availability invalidates only when data-affecting inputs change", () => {
  const input = fixture();
  const first = collectTemporalAvailability({ chart: chart(), ...input });
  const filtered = collectTemporalAvailability({
    chart: chart({
      transformations: {
        filters: [{ field: "region", operator: "equals", value: "north" }],
      },
    }),
    ...input,
  });
  const shorterPeriod = collectTemporalAvailability({
    chart: chart(),
    ...input,
    period: { start: "2027-05-01", end: "2027-05-01" },
  });
  const copiedRows = collectTemporalAvailability({
    chart: chart(),
    ...input,
    rows: [...input.rows],
  });

  assert.notStrictEqual(filtered, first);
  assert.notStrictEqual(shorterPeriod, first);
  assert.notStrictEqual(copiedRows, first);
  assert.deepEqual(filtered, [Date.UTC(2027, 4, 1)]);
  assert.deepEqual(shorterPeriod, [Date.UTC(2027, 4, 1)]);
  assert.deepEqual(copiedRows, first);
});

test("temporal availability keys parsing inputs and ignores derived profile statistics", () => {
  const input = fixture();
  const activeChart = chart({
    roles: { ...chart().roles, observation: "date" },
  });
  const first = collectTemporalAvailability({ chart: activeChart, ...input });
  const copy = structuredClone(input.profile);
  const date = copy.columns.find(({ name }) => name === "date");
  date.uniqueCount += 1;
  assert.strictEqual(collectTemporalAvailability({ chart: activeChart, ...input, profile: copy }), first);

  date.temporal.parsingMetadata.format = "YYYY";
  assert.deepEqual(collectTemporalAvailability({ chart: activeChart, ...input, profile: copy }), []);
});

test("temporal availability invalidates when a filter's effective binding changes", () => {
  const rows = [
    { date: "2027-05-01", value: 10, group: "01" },
    { date: "2027-05-02", value: 20, group: "02" },
  ];
  const { member, period } = fixture();
  const profile = profileDataset(rows, { group: { interpretation: "category" } });
  const transformations = { filters: [{ field: "group", operator: "equals", value: "1" }] };
  const activeChart = chart({ transformations });
  const input = { rows, member, period, profile };
  assert.deepEqual(collectTemporalAvailability({ chart: activeChart, ...input }), []);
  const withNumericGroup = chart({
    transformations,
    roles: { ...activeChart.roles, group: { field: "group", interpretation: "number" } },
  });
  assert.deepEqual(collectTemporalAvailability({ chart: withNumericGroup, ...input }), [Date.UTC(2027, 4, 1)]);
});
