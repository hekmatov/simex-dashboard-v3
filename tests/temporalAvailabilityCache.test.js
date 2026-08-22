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
