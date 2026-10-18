import { createChartDraft } from "../../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../../src/charting/data/profileDataset.js";

// Small native V3 examples for the analytical contracts retired from the shipped pages.
export function analyticalPlaybackFixture() {
  const loadedData = {
    municipalMap: [
      { at: "2027-05-01", area: "A", value: 10 },
      { at: "2027-05-01", area: "B", value: 20 },
      { at: "2027-05-02", area: "A", value: 15 },
      { at: "2027-05-02", area: "B", value: 25 },
    ],
    municipalTrend: [
      { at: "2027-05-01", cases: 30 },
      { at: "2027-05-02", cases: 40 },
    ],
    national: [
      { at: "2027-05-01", cases: 5 },
      { at: "2027-05-02", cases: 8 },
    ],
    latestAreas: [
      { area: "A", value: 15 },
      { area: "B", value: 25 },
    ],
  };
  const profiles = Object.fromEntries(Object.entries(loadedData).map(([id, rows]) => [
    id,
    profileDataset(rows, {
      ...(rows[0].at ? { at: { interpretation: "temporal", format: "YYYY-MM-DD" } } : {}),
      ...(rows[0].area ? { area: { interpretation: "geographic" } } : {}),
    }),
  ]));
  const geoData = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", id: "A", properties: { name: "A" }, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } },
      { type: "Feature", id: "B", properties: { name: "B" }, geometry: { type: "Polygon", coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]] } },
    ],
  };
  const charts = [
    createChartDraft("chronoChoroplethMap", {
      id: "municipal-map", sourceId: "municipalMap", title: "Municipal infections",
      roles: { geography: { field: "area" }, value: { field: "value" }, time: { field: "at", interpretation: "temporal" } },
      presentation: { map: { geoSource: "boundaries" } },
    }),
    createChartDraft("line", {
      id: "municipal-trend", sourceId: "municipalTrend", title: "Municipal total",
      roles: { measurements: [{ field: "cases" }], observation: { field: "at", interpretation: "temporal" } },
    }),
    createChartDraft("line", {
      id: "national-line", sourceId: "national", title: "National cases",
      roles: { measurements: [{ field: "cases" }], observation: { field: "at", interpretation: "temporal" } },
    }),
    createChartDraft("bar", {
      id: "national-bar", sourceId: "national", title: "Daily cases",
      roles: { measurements: [{ field: "cases" }], observation: { field: "at", interpretation: "temporal" } },
    }),
    createChartDraft("mapScatter", {
      id: "latest-areas", sourceId: "latestAreas", title: "Latest areas",
      roles: { geography: { field: "area" }, value: { field: "value" } },
      presentation: { map: { geoSource: "boundaries" } },
    }),
  ];
  const groups = [
    {
      id: "municipal", name: "Municipal outbreak", period: { start: "2027-05-01", end: "2027-05-02" },
      matching: { policy: "exact" }, secondsPerFrame: 1,
      members: [{ chartId: "municipal-map", timeRole: "time" }, { chartId: "municipal-trend", timeRole: "observation" }],
    },
    {
      id: "national", name: "National outbreak", period: { start: "2027-05-01", end: "2027-05-02" },
      matching: { policy: "exact" }, secondsPerFrame: 1,
      members: [{ chartId: "national-line", timeRole: "observation" }, { chartId: "national-bar", timeRole: "observation" }],
    },
  ];
  return { loadedData, profiles, geoData, charts, groups };
}
