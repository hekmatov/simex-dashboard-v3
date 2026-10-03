import assert from "node:assert/strict";
import test from "node:test";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { temporalAuthoringCharts } from "../src/components/time/temporalAuthoringCharts.js";
import { deriveAvailabilityRows } from "../src/components/time/chronoGroupDraft.js";

test("Chrono authoring shares strict member eligibility and does not offer Collection displays with dates", () => {
  const rows = [{ date: "2027-03-01", value: 5 }, { date: "2027-03-02", value: 10 }];
  const profile = profileDataset(rows, { date: { interpretation: "temporal", format: "YYYY-MM-DD" } });
  const base = { id: "cases", title: "Confirmed cases", typeId: "line", sourceId: "source", roles: { observation: "date", measure: "value" } };
  const panels = [base,
    { ...base, id: "internal-collection", title: "Hospital occupancy against capacity", presentation: { collection: {} } },
    { ...base, id: "unknown", typeId: "missing-type" },
    { ...base, id: "bad-role", roles: { observation: "value", measure: "value" } },
  ];
  const charts = temporalAuthoringCharts({ pages: [{ id: "biomedical", label: "Biomedical", sections: [{ id: "pressure", title: "Pressure", panels }] }],
    datasetProfiles: { source: profile }, loadedData: { source: rows }, chronoGroups: [] });
  assert.equal(charts.find(({ id }) => id === base.id).chronoGroupEligibility.eligible, true);
  for (const id of ["internal-collection", "unknown", "bad-role"]) assert.equal(charts.find((chart) => chart.id === id).chronoGroupEligibility.eligible, false);
  const blocked = charts.find(({ id }) => id === "internal-collection");
  assert.match(blocked.chronoGroupEligibility.message, /Member chart "Hospital occupancy against capacity" is a Collection display/);
  assert.doesNotMatch(blocked.chronoGroupEligibility.message, /internal-collection/);
  const choices = deriveAvailabilityRows({ charts, period: { startEpochMs: Date.parse("2027-03-01"), endEpochMs: Date.parse("2027-03-02") } });
  assert.deepEqual(choices.map(({ chartId }) => chartId), [base.id]);
});
