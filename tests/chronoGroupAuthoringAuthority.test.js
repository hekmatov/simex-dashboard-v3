import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import {
  buildEditorFormModel,
  buildFormPreparationKey,
} from "../src/charting/forms/formModel.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { default: ChronoMembershipSettingsField } = await vite.ssrLoadModule(
  "/src/components/chart-authoring/ChronoMembershipSettingsField.jsx",
);
const { default: ChartTimeMatchingField } = await vite.ssrLoadModule("/src/components/chart-authoring/ChartTimeMatchingField.jsx");
const { applyWizardMembership } = await vite.ssrLoadModule(
  "/src/components/chart-authoring/ChartWizardV3.jsx",
);
const {
  createChartEditorState,
  reduceChartEditorState,
} = await vite.ssrLoadModule("/src/components/chart-authoring/ChartEditorV3.jsx");
await vite.close();

const rows = [
  { observed: "2027-05-01", value: 4 },
  { observed: "2027-05-02", value: 6 },
];
const profile = profileDataset(rows, {
  observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
});

function lineChart(id = "trend") {
  return createChartDraft("line", {
    id,
    title: id,
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "value" }],
      observation: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
  });
}

function group(id, members) {
  return {
    id,
    name: id === "operations" ? "Operations" : "Executive watch",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 2.5,
    members,
  };
}

test("native chart authoring exposes chart-owned matching without a timeline membership editor", () => {
  const chart = lineChart();
  const groups = [group("operations", [{ chartId: chart.id, timeRole: "observation" }]), group("executive", [{ chartId: "other", timeRole: "observation" }])];
  const before = structuredClone(groups);
  const model = buildEditorFormModel({ chart, profile, chronoGroups: groups });
  const fields = model.sections.flatMap(({ fields }) => fields);
  assert.equal(fields.some(field => field.id === "timeSync"), false);
  const field = fields.find(field => field.id === "chartTimeMatching");
  assert.equal(field.control, "chartTimeMatching");
  assert.deepEqual(field.inheritedMatching, { policy: "exact" });
  assert.equal(Object.hasOwn(field, "selectedGroupIds"), false);
  const html = renderToStaticMarkup(React.createElement(ChartTimeMatchingField, { field, chart, profile }));
  assert.match(html, /Chart time matching/);
  for (const value of ["exact", "lastKnown", "nearest", "interpolate"]) assert.match(html, new RegExp(`<option value="${value}"`));
  assert.doesNotMatch(html, /Chrono Group memberships|type="checkbox"/);
  const nearest = { ...chart, interaction: { timeSync: { matching: { policy: "nearest", toleranceMs: 7200000 } } } };
  const bounded = renderToStaticMarkup(React.createElement(ChartTimeMatchingField, { field, chart: nearest, profile }));
  assert.match(bounded, /Chart nearest maximum distance \(hours\)/);
  assert.match(bounded, /type="number"[^>]*value="2"/);
  assert.match(bounded, /Clear chart time matching/);
  assert.equal(chart.interaction.timeSync, null);
  assert.deepEqual(groups, before);
});

test("wizard membership toggles one group without replacing sibling memberships", () => {
  const chart = lineChart();
  const other = lineChart("other");
  const groups = [
    group("operations", [
      { chartId: chart.id, timeRole: "observation" },
      { chartId: other.id, timeRole: "observation" },
    ]),
    group("executive", [{ chartId: other.id, timeRole: "observation" }]),
  ];

  const added = applyWizardMembership({
    chart,
    groups,
    groupId: "executive",
    selected: true,
    timeRole: "observation",
  });
  assert.deepEqual(
    added.groups.map(({ members }) => members.map(({ chartId }) => chartId)),
    [["trend", "other"], ["other", "trend"]],
  );
  assert.equal(added.chart.interaction.timeSync, null);

  const removed = applyWizardMembership({
    chart: added.chart,
    groups: added.groups,
    groupId: "operations",
    selected: false,
    timeRole: "observation",
  });
  assert.deepEqual(
    removed.groups.map(({ members }) => members.map(({ chartId }) => chartId)),
    [["other"], ["other", "trend"]],
  );
  assert.equal(removed.chart.interaction.timeSync, null);
});

test("chart conversion remaps every group-owned membership without a chart backlink", () => {
  const chart = lineChart();
  const groups = [
    group("operations", [{ chartId: chart.id, timeRole: "observation" }]),
    group("executive", [{ chartId: chart.id, timeRole: "observation" }]),
  ];
  let state = createChartEditorState({ chart, chronoGroups: groups });

  state = reduceChartEditorState(state, {
    type: "requestConversion",
    targetTypeId: "kpi",
  });
  assert.deepEqual(
    state.conversion.roleFields.map(({ id }) => id),
    ["value", "time"],
  );

  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "value",
    value: { field: "value" },
  });
  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "time",
    value: {
      field: "observed",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  });
  state = reduceChartEditorState(state, { type: "applyConversion" }, {
    existingCharts: [chart],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    profile,
  });

  assert.equal(state.error, "");
  assert.equal(state.draft.interaction.timeSync, null);
  assert.deepEqual(
    state.chronoGroups.map(({ members }) => members[0].timeRole),
    ["time", "time"],
  );
});
