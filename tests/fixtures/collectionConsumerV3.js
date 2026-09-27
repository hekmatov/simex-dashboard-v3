import { createChartDraft } from "../../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../../src/charting/data/profileDataset.js";

export function collectionConsumerFixture() {
  const rows = [
    { observed: "2027-05-01", place: "North", cases: 10 },
    { observed: "2027-05-01", place: "South", cases: 12 },
    { observed: "2027-05-02", place: "North", cases: 20 },
    { observed: "2027-05-02", place: "South", cases: 22 },
  ];
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
  });
  const collection = createChartDraft("kpi", {
    id: "current-cases-collection",
    title: "Current cases",
    sourceId: "primary",
    roles: {
      value: { field: "cases" },
      label: { field: "place", interpretation: "category" },
      time: { field: "observed", interpretation: "temporal", format: "YYYY-MM-DD" },
    },
    presentation: {
      collection: {
        layout: "carousel",
        rows: 1,
        columns: 1,
        gap: 16,
        overflow: "autoRotate",
        ranking: { mode: "fixed" },
        carousel: {
          intervalMs: 10000,
          loop: true,
          pauseOnHover: true,
          transition: "fade",
        },
      },
    },
    interaction: { timeSync: null },
    layout: { size: "standard" },
  });
  const timeline = createChartDraft("line", {
    id: "cases-timeline",
    title: "Cases over time",
    sourceId: "primary",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: { field: "observed", interpretation: "temporal", format: "YYYY-MM-DD" },
    },
    transformations: { duplicates: "sum" },
  });
  const chronoGroups = [{
    id: "exercise",
    name: "Exercise timeline",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{ chartId: timeline.id, timeRole: "observation" }],
  }];
  const dashboard = {
    pages: [
      { sections: [{ panels: [{ chart: timeline }] }] },
      { sections: [{ panels: [{ chart: collection }] }] },
    ],
    chronoGroups,
  };
  return { dashboard, collection, timeline, chronoGroups, rows, profile };
}
