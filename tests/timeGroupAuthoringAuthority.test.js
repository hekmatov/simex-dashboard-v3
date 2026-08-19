import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import {
  buildEditorFormModel,
  buildFormPreparationKey,
} from "../src/charting/forms/formModel.js";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const { default: TimeSyncSettingsField } = await import(
  "../src/components/chart-authoring/TimeSyncSettingsField.jsx"
);
const { applyWizardMembership } = await import(
  "../src/components/chart-authoring/ChartWizardV3.jsx"
);
const {
  createChartEditorState,
  reduceChartEditorState,
} = await import("../src/components/chart-authoring/ChartEditorV3.jsx");

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

test("chart authoring exposes independent Time Group memberships without chart-owned matching", () => {
  const chart = lineChart();
  const groups = [
    group("operations", [{ chartId: chart.id, timeRole: "observation" }]),
    group("executive", [{ chartId: "other", timeRole: "observation" }]),
  ];
  const model = buildEditorFormModel({
    chart,
    profile,
    prepared: {
      status: "ready",
      marks: [{ x: "2027-05-01", value: 4 }],
      diagnostics: [],
      meta: {
        renderableMarkCount: 1,
        formPreparationKey: buildFormPreparationKey({ chart, profile }),
      },
    },
    timeSyncGroups: groups,
  });
  const field = model.sections
    .flatMap(({ fields }) => fields)
    .find(({ id }) => id === "timeSync");

  assert.deepEqual(field.selectedGroupIds, ["operations"]);
  assert.equal("memberMatching" in field, false);
  assert.equal("groupMatching" in field, false);
  assert.equal("groupTarget" in field, false);

  const html = renderToStaticMarkup(React.createElement(TimeSyncSettingsField, {
    field,
    chart,
  }));
  assert.match(html, /Time Group memberships/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Operations/);
  assert.match(html, /Executive watch/);
  assert.doesNotMatch(html, /Member matching/);
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
  let state = createChartEditorState({ chart, timeSyncGroups: groups });

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
    state.timeSyncGroups.map(({ members }) => members[0].timeRole),
    ["time", "time"],
  );
});
